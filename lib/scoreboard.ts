import { slaPolicy } from "./policy";
import { daysOpen } from "./cases";

export type ScoreRow = {
  assemblyName: string | null;
  zoneName: string | null;
  category: string;
  status: string;
  createdAt: Date;
};

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

function group(rows: { name: string; days: number }[]) {
  const map = new Map<string, number[]>();
  for (const row of rows) {
    const list = map.get(row.name) ?? [];
    list.push(row.days);
    map.set(row.name, list);
  }
  return [...map.entries()]
    .map(([name, days]) => ({
      name,
      open: days.length,
      medianDays: median(days) ?? 0,
    }))
    .sort((a, b) => b.open - a.open || b.medianDays - a.medianDays);
}

export function buildScoreboard(rows: ScoreRow[], now = new Date()) {
  const open = rows.filter((row) => slaPolicy.openStatuses.includes(row.status) || row.status === slaPolicy.awaitingStatus);
  const withDays = open.map((row) => ({
    ...row,
    days: daysOpen(row.createdAt, now),
  }));
  return {
    totalOpen: open.length,
    assemblies: group(withDays.filter((row) => row.assemblyName).map((row) => ({ name: row.assemblyName as string, days: row.days }))),
    zones: group(withDays.filter((row) => row.zoneName).map((row) => ({ name: row.zoneName as string, days: row.days }))),
    categories: group(withDays.map((row) => ({ name: row.category, days: row.days }))),
  };
}
