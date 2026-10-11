"use client";

import { useRouter } from "next/navigation";
import type { Locale } from "@/lib/i18n";

export function LanguageToggle({ locale, english, telugu }: { locale: Locale; english: string; telugu: string }) {
  const router = useRouter();

  async function setLocale(next: Locale) {
    await fetch("/api/locale", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale: next }),
    });
    router.refresh();
  }

  return (
    <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.14em]">
      <button type="button" className={locale === "en" ? "underline" : "opacity-70 hover:underline"} onClick={() => setLocale("en")}>
        {english}
      </button>
      <span className="opacity-40">/</span>
      <button type="button" className={locale === "te" ? "underline" : "opacity-70 hover:underline"} onClick={() => setLocale("te")}>
        {telugu}
      </button>
    </span>
  );
}
