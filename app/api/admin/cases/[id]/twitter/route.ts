import { NextResponse } from "next/server";
import { caseUrl } from "@/lib/cases";
import { logOutbound } from "@/lib/outbound";
import { skipBroadcast } from "@/lib/policy";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/staff";
import { postCaseToTwitter } from "@/lib/twitter/post";
import type { ResolvedContact } from "@/lib/types";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const staff = await requireStaff();
  if (!staff) return NextResponse.json({ error: "Staff sign-in required." }, { status: 401 });

  const { id } = await context.params;
  const record = await prisma.case.findFirst({
    where: { OR: [{ id }, { caseNumber: id }] },
    include: { contacts: { orderBy: { escalationRank: "asc" } } },
  });
  if (!record) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (skipBroadcast(record.category)) {
    return NextResponse.json({ error: "This category is not posted on X." }, { status: 400 });
  }
  if (record.twitterPostUrl) {
    return NextResponse.json({ ok: true, url: record.twitterPostUrl, already: true });
  }

  const contacts: Pick<ResolvedContact, "name" | "role" | "twitterHandle">[] = record.contacts.map((row) => ({
    name: row.name,
    role: row.role,
    twitterHandle: row.twitterHandle,
  }));

  const tweet = await postCaseToTwitter({
    caseNumber: record.caseNumber,
    category: record.category,
    description: record.description,
    displayAddress: record.publicAddress || record.displayAddress,
    trackUrl: caseUrl(record.caseNumber),
    contacts,
  });

  await logOutbound({
    caseId: record.id,
    channel: "twitter",
    purpose: "admin",
    payload: { url: tweet.url, staffId: staff.id },
    status: tweet.posted ? "sent" : tweet.transport === "console" ? "console" : "skipped",
  });

  if (tweet.posted && tweet.url) {
    await prisma.case.update({
      where: { id: record.id },
      data: {
        twitterPostId: tweet.id,
        twitterPostUrl: tweet.url,
        events: {
          create: {
            status: record.status,
            note: `Desk posted on X, tagging the offices that own this. ${tweet.url}`,
          },
        },
      },
    });
    return NextResponse.json({ ok: true, url: tweet.url, posted: true });
  }

  if (tweet.transport === "console") {
    return NextResponse.json({
      ok: false,
      posted: false,
      error: "Twitter API keys are not connected. The draft was logged on the server. Add keys, then post from here.",
    });
  }

  return NextResponse.json({ error: "Could not post on X." }, { status: 502 });
}
