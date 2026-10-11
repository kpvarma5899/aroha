export const CASE_STATUSES = [
  { id: "open", label: "Open" },
  { id: "assigned", label: "Assigned" },
  { id: "in_progress", label: "In progress" },
  { id: "waiting_on_agency", label: "Waiting on agency" },
  { id: "awaiting_confirmation", label: "Awaiting confirmation" },
  { id: "resolved", label: "Resolved" },
  { id: "closed", label: "Closed" },
] as const;

export type CaseStatus = (typeof CASE_STATUSES)[number]["id"];

export function isCaseStatus(value: string): value is CaseStatus {
  return CASE_STATUSES.some((item) => item.id === value);
}

export function statusLabel(id: string, labels?: Record<string, string>): string {
  if (labels?.[id]) return labels[id];
  return CASE_STATUSES.find((item) => item.id === id)?.label ?? id.replaceAll("_", " ");
}

export function casePath(caseNumber: string): string {
  return `/case/${caseNumber}`;
}

export function caseUrl(caseNumber: string): string {
  const base = (process.env.AUTH_URL || process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
  return `${base}${casePath(caseNumber)}`;
}

export function fileUrl(storedName: string, caseNumber: string): string {
  return `/api/files/${encodeURIComponent(storedName)}?case=${encodeURIComponent(caseNumber)}`;
}

export const CLOSED_STATUSES = ["resolved", "closed"] as const;

export function isClosedStatus(status: string): boolean {
  return status === "resolved" || status === "closed";
}

export const CLOSE_OUTCOMES = [
  { id: "fixed_on_ground", label: "Fixed on the ground" },
  { id: "work_order_done", label: "Work order completed" },
  { id: "duplicate", label: "Merged with another case" },
  { id: "not_civic", label: "Not a civic issue we can take up" },
  { id: "outside_coverage", label: "Outside coverage" },
  { id: "withdrawn", label: "Reporter withdrew" },
] as const;

export type CloseOutcome = (typeof CLOSE_OUTCOMES)[number]["id"];

export function isCloseOutcome(value: string): value is CloseOutcome {
  return CLOSE_OUTCOMES.some((item) => item.id === value);
}

export function closeOutcomeLabel(id: string, labels?: Record<string, string>): string {
  if (labels?.[id]) return labels[id];
  return CLOSE_OUTCOMES.find((item) => item.id === id)?.label ?? id.replaceAll("_", " ");
}

export function daysOpen(createdAt: Date, now = new Date()): number {
  return Math.max(0, Math.floor((now.getTime() - createdAt.getTime()) / 86_400_000));
}

export function istDayKey(now = new Date()): string {
  return now.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

export function istHour(now = new Date()): number {
  return Number(
    new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour: "numeric", hour12: false }).format(now),
  );
}
