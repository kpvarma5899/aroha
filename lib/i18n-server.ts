import { cookies } from "next/headers";
import { isLocale, type Locale } from "./i18n";

export async function getLocale(): Promise<Locale> {
  const cookie = (await cookies()).get("locale")?.value;
  return isLocale(cookie) ? cookie : "en";
}
