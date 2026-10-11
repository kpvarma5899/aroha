import { prisma } from "@/lib/prisma";
import { caseUrl, daysOpen } from "@/lib/cases";

export async function GET() {
  const rows = await prisma.case.findMany({
    orderBy: { createdAt: "desc" },
    take: 2000,
    select: {
      caseNumber: true,
      publicToken: true,
      category: true,
      status: true,
      publicAddress: true,
      displayAddress: true,
      assemblyName: true,
      zoneName: true,
      municipalCorpName: true,
      createdAt: true,
      supportCount: true,
      sensitive: true,
    },
  });
  const header = [
    "caseNumber",
    "category",
    "status",
    "assembly",
    "zone",
    "municipalCorp",
    "address",
    "daysOpen",
    "supportCount",
    "url",
    "createdAt",
  ];
  const lines = rows.map((row) =>
    [
      row.caseNumber,
      row.category,
      row.status,
      row.assemblyName ?? "",
      row.zoneName ?? "",
      row.municipalCorpName ?? "",
      csv(row.sensitive ? row.publicAddress : row.displayAddress),
      String(daysOpen(row.createdAt)),
      String(row.supportCount),
      caseUrl(row.caseNumber),
      row.createdAt.toISOString(),
    ].join(","),
  );
  const body = [header.join(","), ...lines].join("\n");
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=accountability-hyderabad.csv",
      "Cache-Control": "public, max-age=300",
    },
  });
}

function csv(value: string): string {
  const text = value.replaceAll('"', '""');
  return `"${text}"`;
}
