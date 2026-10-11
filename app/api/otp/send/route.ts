import { NextResponse } from "next/server";
import { normalizePhone } from "@/lib/phone";
import { sendOtp, type OtpChannel } from "@/lib/otp";

export async function POST(request: Request) {
  const body = (await request.json()) as { phone?: string; channel?: string };
  const phone = normalizePhone(String(body.phone ?? ""));
  const channel = body.channel === "whatsapp" ? "whatsapp" : body.channel === "sms" ? "sms" : null;
  if (!phone || !channel) {
    return NextResponse.json(
      { error: "Enter a valid 10-digit Indian mobile number and choose SMS or WhatsApp." },
      { status: 400 },
    );
  }

  const result = await sendOtp(phone, channel as OtpChannel);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    ok: true,
    channel: result.channel,
    expiresInSec: result.expiresInSec,
    resendInSec: result.resendInSec,
    transport: result.transport,
    devCode: result.devCode,
  });
}
