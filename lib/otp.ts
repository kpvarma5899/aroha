import { randomInt } from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { sendMessage, type MessageChannel } from "@/lib/notify";

export type OtpChannel = MessageChannel;

const OTP_TTL_MS = 5 * 60 * 1000;
const RESEND_WAIT_MS = 45 * 1000;
const MAX_ATTEMPTS = 5;

async function deliver(phone: string, channel: OtpChannel, code: string): Promise<"twilio" | "console"> {
  return sendMessage(phone, `Your Aroha login code is ${code}. It expires in 5 minutes. Do not share this code.`, channel);
}

export async function sendOtp(phone: string, channel: OtpChannel) {
  const recent = await prisma.otpChallenge.findFirst({
    where: { phone, consumedAt: null },
    orderBy: { createdAt: "desc" },
  });
  if (recent && Date.now() - recent.createdAt.getTime() < RESEND_WAIT_MS) {
    const wait = Math.ceil((RESEND_WAIT_MS - (Date.now() - recent.createdAt.getTime())) / 1000);
    return { ok: false as const, error: `Wait ${wait} seconds before requesting another code.`, status: 429 };
  }

  if (recent && !recent.consumedAt) {
    await prisma.otpChallenge.update({
      where: { id: recent.id },
      data: { consumedAt: new Date() },
    });
  }

  const code = String(randomInt(100000, 1000000));
  const codeHash = await bcrypt.hash(code, 8);
  await prisma.otpChallenge.create({
    data: {
      phone,
      channel,
      codeHash,
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
    },
  });

  try {
    const transport = await deliver(phone, channel, code);
    return {
      ok: true as const,
      channel,
      transport,
      expiresInSec: OTP_TTL_MS / 1000,
      resendInSec: RESEND_WAIT_MS / 1000,
      devCode: process.env.NODE_ENV === "production" ? undefined : code,
    };
  } catch (error) {
    console.error(error);
    return {
      ok: false as const,
      error:
        channel === "whatsapp"
          ? "Could not send a WhatsApp code. Try SMS, or check Twilio WhatsApp settings."
          : "Could not send an SMS code. Try WhatsApp, or check Twilio SMS settings.",
      status: 502,
    };
  }
}

export async function verifyOtp(phone: string, code: string): Promise<boolean> {
  const digits = code.replace(/\D/g, "");
  if (digits.length !== 6) return false;

  const challenge = await prisma.otpChallenge.findFirst({
    where: { phone, consumedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!challenge) return false;
  if (challenge.attempts >= MAX_ATTEMPTS) return false;

  const match = await bcrypt.compare(digits, challenge.codeHash);
  if (!match) {
    await prisma.otpChallenge.update({
      where: { id: challenge.id },
      data: { attempts: { increment: 1 } },
    });
    return false;
  }

  await prisma.otpChallenge.update({
    where: { id: challenge.id },
    data: { consumedAt: new Date() },
  });
  return true;
}
