import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { slaPolicy } from "@/lib/policy";
import { skipBroadcast, isSensitiveCategory } from "@/lib/policy";
import { publicPoint } from "@/lib/geo/distance";
import { daysOpen } from "@/lib/cases";

export async function GET() {
  const rows = await prisma.case.findMany({
    where: {
      status: { in: [...slaPolicy.openStatuses, slaPolicy.awaitingStatus] },
    },
    select: {
      caseNumber: true,
      publicToken: true,
      category: true,
      status: true,
      publicAddress: true,
      displayAddress: true,
      lat: true,
      lng: true,
      sensitive: true,
      supportCount: true,
      createdAt: true,
      assemblyName: true,
      zoneName: true,
    },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  const cases = rows
    .filter((row) => !skipBroadcast(row.category) || isSensitiveCategory(row.category))
    .map((row) => {
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
        assemblyName: row.assemblyName,
        zoneName: row.zoneName,
        approximate: row.sensitive,
      };
    });

  return NextResponse.json({ cases });
}
