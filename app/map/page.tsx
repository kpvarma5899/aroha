import { prisma } from "@/lib/prisma";
import { slaPolicy } from "@/lib/policy";
import { publicPoint } from "@/lib/geo/distance";
import { daysOpen } from "@/lib/cases";
import { getLocale } from "@/lib/i18n-server";
import { messagesFor } from "@/lib/i18n";
import { CasesMapCanvas } from "@/components/CasesMapCanvas";
import type { MapCase } from "@/components/CasesMap";

export default async function MapPage() {
  const locale = await getLocale();
  const copy = messagesFor(locale);
  const rows = await prisma.case.findMany({
    where: { status: { in: [...slaPolicy.openStatuses, slaPolicy.awaitingStatus] } },
    orderBy: { createdAt: "desc" },
    take: 500,
  });
  const cases: MapCase[] = rows.map((row) => {
    const point = publicPoint(row.lat, row.lng, row.publicToken, row.sensitive);
    return {
      caseNumber: row.caseNumber,
      token: row.caseNumber,
      category: row.category,
      status: row.status,
      address: row.sensitive ? row.publicAddress || "Approximate area" : row.displayAddress,
      lat: point.lat,
      lng: point.lng,
      supportCount: row.supportCount,
      daysOpen: daysOpen(row.createdAt),
      approximate: row.sensitive,
    };
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <p className="text-xs uppercase tracking-[0.18em] text-moss">{copy.map.kicker}</p>
      <h1 className="mt-2 font-serif text-4xl">{copy.map.title}</h1>
      <p className="mt-3 max-w-2xl text-sm text-ink/70">{copy.map.lead}</p>
      <div className="mt-8 border border-line">
        {cases.length ? <CasesMapCanvas cases={cases} locale={locale} /> : <p className="p-8 text-ink/60">{copy.map.empty}</p>}
      </div>
    </div>
  );
}
