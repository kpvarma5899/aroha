import { draftLetter } from "@/lib/messages/draft";
import { getCategoryLabel } from "@/lib/categories";
import type { Locale } from "@/lib/i18n";
import { caseUrl } from "@/lib/cases";
import { sendEmail } from "@/lib/email/send";
import { unique } from "@/lib/json";
import { notifyReporter } from "@/lib/notify";
import { logOutbound } from "@/lib/outbound";
import { channelPolicy, skipBroadcast } from "@/lib/policy";
import { prisma } from "@/lib/prisma";
import { settle } from "@/lib/settle";
import { markStepDone } from "@/lib/sla";
import { postCaseToTwitter } from "@/lib/twitter/post";
import type { ResolvedContact } from "@/lib/types";

export type FiledCase = {
  id: string;
  caseNumber: string;
  publicToken: string;
  category: string;
  description: string;
  displayAddress: string;
  publicAddress: string;
  lat: number;
  lng: number;
  locale: string;
  reporterPhone: string | null;
  lastEscalationKey: string;
};

export async function afterCaseFiled(input: {
  record: FiledCase;
  contacts: ResolvedContact[];
}): Promise<{
  twitter: { posted: boolean; url: string | null; intentUrl: string };
  emailed: boolean;
}> {
  const trackUrl = caseUrl(input.record.caseNumber);
  const locale = input.record.locale as Locale;
  const quiet = skipBroadcast(input.record.category);
  const letter = draftLetter({
    category: input.record.category,
    description: input.record.description,
    displayAddress: input.record.displayAddress,
    lat: input.record.lat,
    lng: input.record.lng,
    contacts: input.contacts,
  });
  const withCase = `${letter}\nCase ID: ${input.record.caseNumber}\nTrack: ${trackUrl}\n`;

  let emailed = false;
  const emails = unique(input.contacts.flatMap((contact) => contact.emails));
  if (channelPolicy.onFile.emailOffices && emails.length) {
    const result = await settle("email:file", () =>
      sendEmail({
        to: emails,
        subject: `Civic complaint — ${getCategoryLabel(input.record.category)} — ${input.record.caseNumber}`,
        text: withCase,
      }),
    );
    emailed = Boolean(result);
    await logOutbound({
      caseId: input.record.id,
      channel: "email",
      purpose: "file",
      payload: { to: emails },
      status: result ? (result.transport === "console" ? "console" : "sent") : "failed",
    });
    if (result) {
      await prisma.case.update({
        where: { id: input.record.id },
        data: {
          emailSentAt: new Date(),
          lastEscalationKey: markStepDone(input.record.lastEscalationKey, "helpline"),
          slaStep: "helpline",
          events: {
            create: {
              status: "open",
              note:
                result.transport === "console"
                  ? "Office email draft prepared (SMTP/Resend not connected)."
                  : `Emailed published office addresses: ${emails.join(", ")}.`,
            },
          },
        },
      });
    }
  }

  let twitter = { posted: false, url: null as string | null, intentUrl: "" };
  if (channelPolicy.onFile.twitter && !quiet) {
    const tweet = await settle("twitter:file", () =>
      postCaseToTwitter({
        caseNumber: input.record.caseNumber,
        category: input.record.category,
        description: input.record.description,
        displayAddress: input.record.publicAddress || input.record.displayAddress,
        trackUrl,
        contacts: input.contacts,
      }),
    );
    if (tweet) {
      twitter = { posted: tweet.posted, url: tweet.url, intentUrl: tweet.intentUrl };
      await logOutbound({
        caseId: input.record.id,
        channel: "twitter",
        purpose: "file",
        payload: { url: tweet.url },
        status: tweet.posted ? "sent" : tweet.transport === "console" ? "console" : "skipped",
      });
      await prisma.case.update({
        where: { id: input.record.id },
        data: {
          twitterPostId: tweet.id,
          twitterPostUrl: tweet.url,
          events: {
            create: {
              status: "open",
              note: tweet.posted
                ? `Posted on X, tagging the offices that own this. ${tweet.url}`
                : "X draft prepared. Connect Twitter API keys and post from the admin desk.",
            },
          },
        },
      });
    }
  } else if (quiet) {
    await logOutbound({
      caseId: input.record.id,
      channel: "twitter",
      purpose: "file",
      status: "skipped",
      error: "Sensitive category — not posted on X",
    });
  }

  if (channelPolicy.onFile.whatsappReporter && input.record.reporterPhone) {
    const body =
      locale === "te"
        ? `ఆరోహ కేసు ${input.record.caseNumber} నమోదైంది. ఇక్కడ ట్రాక్ చేయండి: ${trackUrl}`
        : `Aroha case ${input.record.caseNumber} is filed. Track it anytime: ${trackUrl}`;
    await notifyReporter(input.record.reporterPhone, body);
    await logOutbound({
      caseId: input.record.id,
      channel: "whatsapp",
      purpose: "file",
      status: "sent",
    });
  }

  return { twitter, emailed };
}
