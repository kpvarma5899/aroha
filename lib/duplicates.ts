import { prisma } from "./prisma";
import { haversineMeters } from "./geo/distance";
import { privacyPolicy } from "./policy";
import { slaPolicy } from "./policy";

export type NearbyCase = {
  caseNumber: string;
  category: string;
  displayAddress: string;
  status: string;
  supportCount: number;
  meters: number;
  createdAt: string;
};

export async function findNearbyOpenCases(input: {
  lat: number;
  lng: number;
  category: string;
  excludeId?: string;
}): Promise<NearbyCase[]> {
  const since = new Date(Date.now() - privacyPolicy.nearbyLookbackDays * 86_400_000);
  const open = [...slaPolicy.openStatuses, slaPolicy.awaitingStatus];
  const rows = await prisma.case.findMany({
    where: {
      category: input.category,
      status: { in: open },
      createdAt: { gte: since },
      ...(input.excludeId ? { id: { not: input.excludeId } } : {}),
    },
    select: {
      id: true,
      caseNumber: true,
      category: true,
      publicAddress: true,
      displayAddress: true,
      sensitive: true,
      status: true,
      supportCount: true,
      lat: true,
      lng: true,
      createdAt: true,
    },
    take: 200,
  });

  return rows
    .map((row) => ({
      caseNumber: row.caseNumber,
      category: row.category,
      displayAddress: row.sensitive ? row.publicAddress || row.displayAddress : row.displayAddress,
      status: row.status,
      supportCount: row.supportCount,
      meters: Math.round(haversineMeters({ lat: input.lat, lng: input.lng }, { lat: row.lat, lng: row.lng })),
      createdAt: row.createdAt.toISOString(),
    }))
    .filter((row) => row.meters <= privacyPolicy.nearbyRadiusMeters)
    .sort((a, b) => a.meters - b.meters)
    .slice(0, 8);
}
