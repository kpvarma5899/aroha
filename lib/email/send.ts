export type EmailPayload = {
  to: string[];
  cc?: string[];
  subject: string;
  text: string;
};

export function emailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

export async function sendEmail(payload: EmailPayload): Promise<{ transport: "resend" | "console" }> {
  const to = payload.to.map((item) => item.trim()).filter(Boolean);
  if (to.length === 0) return { transport: "console" };
  const from = process.env.EMAIL_FROM || "Aroha <noreply@localhost>";
  const cc = payload.cc?.filter((item) => item.trim()) ?? [];

  if (process.env.RESEND_API_KEY) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to,
        cc: cc.length ? cc : undefined,
        subject: payload.subject,
        text: payload.text,
      }),
    });
    if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
    return { transport: "resend" };
  }

  console.info(`[email:draft] to=${to.join(",")} cc=${cc.join(",")}\n${payload.subject}\n${payload.text}`);
  return { transport: "console" };
}
