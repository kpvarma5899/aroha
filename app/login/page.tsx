"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { displayPhone, normalizePhone } from "@/lib/phone";

type Channel = "sms" | "whatsapp";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/complaints";
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phoneInput, setPhoneInput] = useState("");
  const [channel, setChannel] = useState<Channel>("whatsapp");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [devCode, setDevCode] = useState<string | undefined>();
  const [resendIn, setResendIn] = useState(0);
  const e164 = normalizePhone(phoneInput);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((n) => n - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  async function requestCode(nextChannel: Channel) {
    if (!e164) {
      setError("Enter a 10-digit Indian mobile number.");
      return;
    }
    setBusy(true);
    setError("");
    const res = await fetch("/api/otp/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: e164, channel: nextChannel }),
    });
    const data = (await res.json()) as { error?: string; resendInSec?: number; devCode?: string };
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Could not send the code.");
      return;
    }
    setChannel(nextChannel);
    setDevCode(data.devCode);
    setResendIn(data.resendInSec ?? 45);
    setStep("otp");
  }

  async function onSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await requestCode(channel);
  }

  async function onVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!e164) return;
    setBusy(true);
    setError("");
    const result = await signIn("credentials", {
      phone: e164,
      otp,
      redirect: false,
    });
    setBusy(false);
    if (result?.error) {
      setError("That code is wrong or has expired. Request a new one.");
      return;
    }
    router.push(next);
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <p className="text-xs uppercase tracking-[0.18em] text-moss">One number. Your record.</p>
      <h1 className="mt-2 font-serif text-4xl">Sign in with your phone</h1>
      <p className="mt-3 text-sm leading-relaxed text-ink/70">
        We send a one-time code on WhatsApp or SMS. Use this only if you filed a case with this
        number and want to see those cases in one list. Reporting itself does not need an account.
      </p>

      {step === "phone" ? (
        <form onSubmit={onSend} className="mt-8 space-y-5">
          <label className="block text-sm">
            Mobile number
            <span className="mt-1 flex border border-line bg-paper">
              <span className="border-r border-line px-3 py-2 text-ink/55">+91</span>
              <input
                inputMode="numeric"
                autoComplete="tel"
                maxLength={10}
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value.replace(/\D/g, "").slice(0, 10))}
                placeholder="9876543210"
                className="w-full bg-transparent px-3 py-2 outline-none"
              />
            </span>
          </label>
          <fieldset>
            <legend className="text-sm">Send code via</legend>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {(["whatsapp", "sms"] as Channel[]).map((option) => (
                <label
                  key={option}
                  className={`cursor-pointer border px-3 py-2 text-sm ${
                    channel === option ? "border-moss bg-moss text-paper" : "border-line"
                  }`}
                >
                  <input
                    type="radio"
                    name="channel"
                    value={option}
                    checked={channel === option}
                    onChange={() => setChannel(option)}
                    className="sr-only"
                  />
                  {option === "whatsapp" ? "WhatsApp" : "SMS"}
                </label>
              ))}
            </div>
          </fieldset>
          {error ? <p className="text-clay">{error}</p> : null}
          <button type="submit" disabled={busy} className="w-full border border-moss bg-moss py-2.5 text-paper">
            {busy ? "Sending…" : "Send code"}
          </button>
        </form>
      ) : (
        <form onSubmit={onVerify} className="mt-8 space-y-5">
          <p className="text-sm text-ink/75">
            Code sent to {e164 ? displayPhone(e164) : phoneInput} by{" "}
            {channel === "whatsapp" ? "WhatsApp" : "SMS"}.
          </p>
          {devCode ? (
            <p className="border border-line bg-paper-2 px-3 py-2 text-sm">
              Local development code: <span className="font-mono tracking-widest">{devCode}</span>
            </p>
          ) : null}
          <label className="block text-sm">
            6-digit code
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="mt-1 w-full border border-line bg-paper px-3 py-2 font-mono tracking-[0.4em]"
            />
          </label>
          {error ? <p className="text-clay">{error}</p> : null}
          <button
            type="submit"
            disabled={busy || otp.length !== 6}
            className="w-full border border-moss bg-moss py-2.5 text-paper disabled:opacity-50"
          >
            {busy ? "Checking…" : "Verify and continue"}
          </button>
          <div className="flex justify-between text-sm">
            <button type="button" onClick={() => { setStep("phone"); setOtp(""); setError(""); }} className="underline">
              Change number
            </button>
            <button
              type="button"
              disabled={busy || resendIn > 0}
              onClick={() => requestCode(channel)}
              className="underline disabled:no-underline disabled:text-ink/40"
            >
              {resendIn > 0 ? `Resend in ${resendIn}s` : "Resend code"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
