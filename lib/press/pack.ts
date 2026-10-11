import { getCategoryLabel } from "@/lib/categories";
import { caseUrl, daysOpen } from "@/lib/cases";
import { privacyPolicy } from "@/lib/policy";

export type ClusterCase = {
  caseNumber: string;
  publicToken: string;
  category: string;
  displayAddress: string;
  assemblyName: string | null;
  zoneName: string | null;
  createdAt: Date;
  supportCount: number;
};

export function clusterKey(row: ClusterCase): string {
  return `${row.category}::${row.assemblyName || "unknown"}`;
}

export function findClusters(rows: ClusterCase[], min = privacyPolicy.clusterShowCount) {
  const groups = new Map<string, ClusterCase[]>();
  for (const row of rows) {
    const key = clusterKey(row);
    const list = groups.get(key) ?? [];
    list.push(row);
    groups.set(key, list);
  }
  return [...groups.entries()]
    .map(([key, cases]) => ({
      key,
      category: cases[0].category,
      assemblyName: cases[0].assemblyName,
      zoneName: cases[0].zoneName,
      count: cases.reduce((sum, item) => sum + Math.max(1, item.supportCount), 0),
      cases,
      ready: cases.length >= privacyPolicy.clusterReadyCount,
    }))
    .filter((group) => group.cases.length >= min)
    .sort((a, b) => b.count - a.count);
}

export function pressPack(group: ReturnType<typeof findClusters>[number]): string {
  const now = new Date();
  const lines = group.cases.map(
    (row) =>
      `- ${row.caseNumber} · ${daysOpen(row.createdAt, now)} days · ${row.displayAddress} · ${caseUrl(row.caseNumber)} · ${row.supportCount} voices`,
  );
  return `Press note — ${getCategoryLabel(group.category)} in ${group.assemblyName || "Hyderabad"}

${group.count} resident reports (including people who confirmed the same pin) are still open.

This is a pattern, not a one-off tweet. Tracking URLs are public. Reporter phones are not.

Cases:
${lines.join("\n")}

Ask the zonal office and the MLA: when will this be inspected, what is the work order, and who is accountable if it slips again?
`;
}
