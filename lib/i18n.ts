import en from "@/data/i18n/en.json";
import te from "@/data/i18n/te.json";

export const LOCALES = ["en", "te"] as const;
export type Locale = (typeof LOCALES)[number];
export type Messages = typeof en;

const catalogs: Record<Locale, Messages> = { en, te };

export function isLocale(value: string | null | undefined): value is Locale {
  return value === "en" || value === "te";
}

export function messagesFor(locale: Locale | string | null | undefined): Messages {
  return catalogs[isLocale(locale) ? locale : "en"];
}

export function interpolate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(vars[key] ?? ""));
}
