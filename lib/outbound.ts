import { prisma } from "./prisma";

export async function logOutbound(input: {
  caseId?: string | null;
  channel: string;
  purpose: string;
  payload?: unknown;
  status: "sent" | "failed" | "skipped" | "console";
  error?: string | null;
}) {
  try {
    await prisma.outboundMessage.create({
      data: {
        caseId: input.caseId || null,
        channel: input.channel,
        purpose: input.purpose,
        payload: JSON.stringify(input.payload ?? {}),
        status: input.status,
        error: input.error || null,
        sentAt: input.status === "sent" || input.status === "console" ? new Date() : null,
      },
    });
  } catch (error) {
    console.error("[outbound]", error);
  }
}
