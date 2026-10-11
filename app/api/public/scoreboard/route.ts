import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildScoreboard } from "@/lib/scoreboard";
import { findClusters } from "@/lib/press/pack";
import { slaPolicy, privacyPolicy } from "@/lib/policy";

export async function GET() {
  const rows = await prisma.case.findMany({
    select: {
      caseNumber: true,
      publicToken: true,
      category: true,
      status: true,
      publicAddress: true,
      displayAddress: true,
      assemblyName: true,
      zoneName: true,
      createdAt: true,
      supportCount: true,
      sensitive: true,
    },
  });
  const board = buildScoreboard(rows);
  const open = rows
    .filter((row) => slaPolicy.openStatuses.includes(row.status) || row.status === slaPolicy.awaitingStatus)
    .map((row) => ({
      caseNumber: row.caseNumber,
      publicToken: row.publicToken,
      category: row.category,
      displayAddress: row.sensitive ? row.publicAddress || "Approximate area" : row.displayAddress,
      assemblyName: row.assemblyName,
      zoneName: row.zoneName,
      createdAt: row.createdAt,
      supportCount: row.supportCount,
    }));
  const clusters = findClusters(open);
  return NextResponse.json({
    ...board,
    thin: board.totalOpen < privacyPolicy.scoreboardThinCount,
    thinThreshold: privacyPolicy.scoreboardThinCount,
    clusters: clusters.map((group) => ({
      key: group.key,
      category: group.category,
      assemblyName: group.assemblyName,
      count: group.count,
      ready: group.ready,
      cases: group.cases.length,
    })),
  });
}
