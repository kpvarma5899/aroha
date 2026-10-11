"use client";

import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { FormEvent, useState } from "react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const result = await signIn("credentials", {
      username: String(form.get("username") || ""),
      password: String(form.get("password") || ""),
      redirect: false,
    });
    setBusy(false);
    if (result?.error) {
      setError("Username or password is wrong.");
      return;
    }
    router.push("/admin");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <p className="text-xs uppercase tracking-[0.18em] text-moss">Staff desk</p>
      <h1 className="mt-2 font-serif text-4xl">Admin sign in</h1>
      <p className="mt-3 text-sm text-ink/70">Username and password. Ask an admin if you need a reset.</p>
      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <label className="block text-sm">
          Username
          <input name="username" autoComplete="username" required className="mt-1 w-full border border-line bg-paper px-3 py-2" />
        </label>
        <label className="block text-sm">
          Password
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="mt-1 w-full border border-line bg-paper px-3 py-2"
          />
        </label>
        {error ? <p className="text-clay">{error}</p> : null}
        <button type="submit" disabled={busy} className="w-full border border-moss bg-moss py-2.5 text-paper">
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
