export type MessageChannel = "sms" | "whatsapp";

async function sendTwilio(to: string, from: string, body: string) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) {
    throw new Error("Twilio is not configured.");
  }
  const auth = Buffer.from(`${sid}:${token}`).toString("base64");
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ To: to, From: from, Body: body }),
  });
  if (!res.ok) {
    throw new Error(`Twilio ${res.status}: ${await res.text()}`);
  }
}

export async function sendMessage(
  phone: string,
  body: string,
  preferred: MessageChannel = "whatsapp",
): Promise<"twilio" | "console"> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const waFrom = process.env.TWILIO_WHATSAPP_FROM;
  const smsFrom = process.env.TWILIO_SMS_FROM;

  if (sid && token) {
    if (preferred === "whatsapp" && waFrom) {
      await sendTwilio(
        `whatsapp:${phone}`,
        waFrom.startsWith("whatsapp:") ? waFrom : `whatsapp:${waFrom}`,
        body,
      );
      return "twilio";
    }
    if (smsFrom) {
      await sendTwilio(phone, smsFrom, body);
      return "twilio";
    }
    if (waFrom) {
      await sendTwilio(
        `whatsapp:${phone}`,
        waFrom.startsWith("whatsapp:") ? waFrom : `whatsapp:${waFrom}`,
        body,
      );
      return "twilio";
    }
  }

  if (process.env.NODE_ENV === "production" && preferred !== "whatsapp") {
    throw new Error("Messaging is not configured.");
  }

  console.info(`[notify:${preferred}] ${phone}\n${body}`);
  return "console";
}

export async function notifyReporter(phone: string | null | undefined, body: string) {
  if (!phone) return { sent: false as const };
  try {
    const transport = await sendMessage(phone, body, "whatsapp");
    return { sent: true as const, transport };
  } catch (error) {
    console.error(error);
    return { sent: false as const };
  }
}
