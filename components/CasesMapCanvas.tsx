"use client";

import dynamic from "next/dynamic";
import type { Locale } from "@/lib/i18n";
import type { MapCase } from "./CasesMap";

const CasesMap = dynamic(() => import("./CasesMap"), {
  ssr: false,
  loading: () => <div className="h-[520px] w-full bg-paper-2" />,
});

export function CasesMapCanvas({ cases, locale }: { cases: MapCase[]; locale: Locale }) {
  return <CasesMap cases={cases} locale={locale} />;
}
