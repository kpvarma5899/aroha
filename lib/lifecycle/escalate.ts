import { getCategoryLabel } from "@/lib/categories";
import { caseUrl, daysOpen } from "@/lib/cases";
import { sendEmail } from "@/lib/email/send";
import { unique, parseList } from "@/lib/json";
import { notifyReporter } from "@/lib/notify";
import { logOutbound } from "@/lib/outbound";
import { skipBroadcast } from "@/lib/policy";
import { prisma } from "@/lib/prisma";
import { settle } from "@/lib/settle";
import { dueSteps, markStepDone, type SlaStep } from "@/lib/sla";
import { composeEscalationTweet, normalizeHandle } from "@/lib/twitter/compose";
import { postTweetThread } from "@/lib/twitter/post";

function contactEmails(
  contacts: Array<{ role: string; emails: string }>,
  roles: string[],
): string[] {
  return unique(
    contacts
      .filter((contact) => roles.includes(contact.role))
      .flatMap((contact) => parseList(contact.emails)),
  );
}

function contactHandles(
  contacts: Array<{ role: string; twitterHandle: string | null }>,
  roles: string[],
): string[] {
  return unique(
    contacts
      .filter((contact) => roles.includes(contact.role))
      .map((contact) => normalizeHandle(contact.twitterHandle)),
  );
}

export async function escalateCase(record: {
  id: string;
  caseNumber: string;
  publicToken: string;
  category: string;
  description: string;
  displayAddress: string;
  publicAddress: string;
  createdAt: Date;
  lastEscalationKey: string;
  twitterPostId: string | null;
  locale: string;
  reporterPhone: string | null;
  contacts: Array<{ role: string; emails: string; twitterHandle: string | null; name: string; agency: string }>;
}): Promise<string[]> {
  const steps = dueSteps({
    createdAt: record.createdAt,
    lastEscalationKey: record.lastEscalationKey,
    contacts: record.contacts,
  });
  const fired: string[] = [];
  let key = record.lastEscalationKey;
  const trackUrl = caseUrl(record.caseNumber);
  const days = daysOpen(record.createdAt);

  for (const step of steps) {
    const did = await fireStep(record, step, { trackUrl, days });
    if (did) {
      key = markStepDone(key, step.id);
      fired.push(step.id);
    }
  }

  if (fired.length) {
    await prisma.case.update({
      where: { id: record.id },
      data: {
        lastEscalationKey: key,
        slaStep: fired[fired.length - 1],
      },
    });
  }
  return fired;
}

async function fireStep(
  record: {
    id: string;
    caseNumber: string;
    category: string;
    description: string;
    displayAddress: string;
    publicAddress: string;
    twitterPostId: string | null;
    locale: string;
    reporterPhone: string | null;
    contacts: Array<{ role: string; emails: string; twitterHandle: string | null; name: string; agency: string }>;
  },
  step: SlaStep,
  extra: { trackUrl: string; days: number },
): Promise<boolean> {
  const emails = contactEmails(record.contacts, step.roles);
  const handles = contactHandles(record.contacts, step.roles);
  let ok = false;

  if (step.channels.includes("email") && emails.length) {
    const result = await settle(`email:${step.id}`, () =>
      sendEmail({
        to: emails,
        subject: `Still open (${extra.days} days) — ${record.caseNumber} — ${getCategoryLabel(record.category)}`,
        text: `Aroha case ${record.caseNumber} is still open after ${extra.days} days.\n\nThis step of the public clock is: ${step.label}.\n\nLocation: ${record.displayAddress}\n${record.description}\n\nTrack: ${extra.trackUrl}\n`,
      }),
    );
    await logOutbound({
      caseId: record.id,
      channel: "email",
      purpose: `escalate:${step.id}`,
      payload: { to: emails },
      status: result ? (result.transport === "console" ? "console" : "sent") : "failed",
    });
    ok = Boolean(result) || ok;
  }

  if (step.channels.includes("twitter") && !skipBroadcast(record.category)) {
    const composed = composeEscalationTweet({
      caseNumber: record.caseNumber,
      stepLabel: step.label,
      daysOpen: extra.days,
      trackUrl: extra.trackUrl,
      handles,
    });
    const tweet = await settle(`twitter:${step.id}`, () =>
      postTweetThread([composed.text], record.twitterPostId || undefined),
    );
    await logOutbound({
      caseId: record.id,
      channel: "twitter",
      purpose: `escalate:${step.id}`,
      status: tweet?.posted ? "sent" : tweet?.transport === "console" ? "console" : "skipped",
    });
    ok = Boolean(tweet) || ok;
  }

  if (ok) {
    await prisma.caseEvent.create({
      data: {
        caseId: record.id,
        status: "waiting_on_agency",
        note: `Public clock: asked the ${step.label.toLowerCase()} after ${extra.days} days.`,
      },
    });
    if (record.reporterPhone) {
      const body =
        record.locale === "te"
          ? `మీ కేసు ${record.caseNumber} ఇంకా తెరిచి ఉంది (${extra.days} రోజులు). ${step.label}ను అడిగాం. ${extra.trackUrl}`
          : `Your case ${record.caseNumber} is still open after ${extra.days} days. We asked the ${step.label.toLowerCase()}. ${extra.trackUrl}`;
      await notifyReporter(record.reporterPhone, body);
    }
  }

  return ok || emails.length === 0;
}
