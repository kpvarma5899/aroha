import { NextResponse } from "next/server";
import { isLocale } from "@/lib/i18n";

export async function POST(request: Request) {
  const body = (await request.json()) as { locale?: string };
  if (!isLocale(body.locale)) {
    return NextResponse.json({ error: "Unknown language." }, { status: 400 });
  }
  const res = NextResponse.json({ ok: true, locale: body.locale });
  res.cookies.set("locale", body.locale, { path: "/", maxAge: 60 * 60 * 24 * 365 });
  return res;
}
