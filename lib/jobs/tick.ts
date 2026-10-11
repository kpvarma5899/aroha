import { getCategoryLabel } from "@/lib/categories";
import { caseUrl, istDayKey, istHour } from "@/lib/cases";
import { sendEmail } from "@/lib/email/send";
import { unique, parseList } from "@/lib/json";
import { escalateCase } from "@/lib/lifecycle/escalate";
import { notifyReporter } from "@/lib/notify";
import { logOutbound } from "@/lib/outbound";
import { channelPolicy, skipBroadcast, slaPolicy } from "@/lib/policy";
import { prisma } from "@/lib/prisma";
import { settle } from "@/lib/settle";
import { composeDigestTweets } from "@/lib/twitter/compose";
import { postTweetThread } from "@/lib/twitter/post";

async function alreadyRan(name: string, dayKey: string): Promise<boolean> {
  const row = await prisma.jobRun.findUnique({ where: { name_dayKey: { name, dayKey } } });
  return Boolean(row);
}

async function markRun(name: string, dayKey: string, summary: string, ok = true) {
  await prisma.jobRun.upsert({
    where: { name_dayKey: { name, dayKey } },
    create: { name, dayKey, summary, ok },
    update: { summary, ok },
  });
}

export async function runDailyJobs(now = new Date()) {
  const dayKey = istDayKey(now);
  const summary: string[] = [];

  const open = await prisma.case.findMany({
    where: { status: { in: [...slaPolicy.openStatuses] } },
    include: { contacts: true },
  });

  let escalations = 0;
  for (const record of open) {
    const fired = await escalateCase(record);
    escalations += fired.length;
  }
  summary.push(`escalations=${escalations}`);

  const awaiting = await prisma.case.findMany({
    where: {
      status: slaPolicy.awaitingStatus,
      awaitingConfirmAt: { lte: new Date(now.getTime() - slaPolicy.confirmNudgeAfterDays * 86_400_000) },
    },
  });
  let nudges = 0;
  for (const record of awaiting) {
    const key = `nudge:${record.id}:${dayKey}`;
    if (await alreadyRan(key, dayKey)) continue;
    if (record.reporterPhone) {
      const url = caseUrl(record.caseNumber);
      const body =
        record.locale === "te"
          ? `మీ కేసు ${record.caseNumber} సరిపోయిందా? ఇక్కడ చెప్పండి: ${url}`
          : `Is Aroha case ${record.caseNumber} actually fixed? Confirm here: ${url}`;
      await notifyReporter(record.reporterPhone, body);
      nudges += 1;
    }
    await markRun(key, dayKey, "nudged");
  }
  summary.push(`nudges=${nudges}`);

  if (channelPolicy.digest.enabled && istHour(now) >= channelPolicy.digest.hourIst) {
    if (!(await alreadyRan("digest", dayKey))) {
      const digest = await sendDailyDigest(open);
      await markRun("digest", dayKey, digest);
      summary.push(digest);
    }
  }

  return { dayKey, summary: summary.join("; ") };
}

async function sendDailyDigest(
  open: Array<{
    id: string;
    caseNumber: string;
    publicToken: string;
    category: string;
    zoneName: string | null;
    assemblyName: string | null;
    publicAddress: string;
    displayAddress: string;
    contacts: Array<{ role: string; emails: string }>;
  }>,
): Promise<string> {
  const publicCases = open.filter((row) => !skipBroadcast(row.category));
  const byArea = new Map<string, typeof publicCases>();
  for (const row of publicCases) {
    const area = row.zoneName || row.assemblyName || "Hyderabad";
    const list = byArea.get(area) ?? [];
    list.push(row);
    byArea.set(area, list);
  }

  let emailed = 0;
  for (const [area, rows] of byArea) {
    const emails = unique(
      rows.flatMap((row) =>
        row.contacts
          .filter((contact) => ["Zonal Commissioner", "Municipal Commissioner", "Helpline"].includes(contact.role))
          .flatMap((contact) => parseList(contact.emails)),
      ),
    );
    const lines = rows
      .slice(0, 40)
      .map(
        (row) =>
          `- ${row.caseNumber} · ${getCategoryLabel(row.category)} · ${row.publicAddress || row.displayAddress} · ${caseUrl(row.caseNumber)}`,
      );
    const text = `Daily digest of open civic cases in ${area}. Please inspect and fix. One public URL per case — this is not a new blast of the same tweet.\n\n${lines.join("\n")}\n`;
    if (channelPolicy.digest.email && emails.length) {
      const result = await settle("digest:email", () =>
        sendEmail({
          to: emails,
          subject: `Open civic cases in ${area} — ${rows.length} still waiting`,
          text,
        }),
      );
      if (result) emailed += 1;
      await logOutbound({
        channel: "email",
        purpose: "digest",
        payload: { area, count: rows.length, to: emails },
        status: result ? (result.transport === "console" ? "console" : "sent") : "failed",
      });
    }
    if (channelPolicy.digest.twitter) {
      const tweets = composeDigestTweets({
        area,
        lines: rows.slice(0, 12).map((row) => `${row.caseNumber} ${caseUrl(row.caseNumber)}`),
      });
      await settle("digest:twitter", () => postTweetThread(tweets.tweets));
    }
  }
  return `digest areas=${byArea.size} emails=${emailed}`;
}
