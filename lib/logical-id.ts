import { prisma } from "./prisma";

/** Salesforce User key prefix — desk staff. */
export const USER_KEY_PREFIX = "005";
/** Salesforce Contact key prefix — resident who left a number. */
export const CITIZEN_KEY_PREFIX = "003";
/** Salesforce Case key prefix — a tracked civic case. */
export const CASE_KEY_PREFIX = "500";
/** Org identifier baked into every ID (Aroha). */
export const ORG_KEY = "ARO";

const SUFFIX = "ABCDEFGHIJKLMNOPQRSTUVWXYZ012345";

export type LogicalKind = "user" | "citizen" | "case";

const PREFIX: Record<LogicalKind, string> = {
  user: USER_KEY_PREFIX,
  citizen: CITIZEN_KEY_PREFIX,
  case: CASE_KEY_PREFIX,
};

export function toSalesforce18(id15: string): string {
  if (id15.length !== 15) return id15;
  let suffix = "";
  for (let block = 0; block < 3; block += 1) {
    let flags = 0;
    for (let bit = 0; bit < 5; bit += 1) {
      const char = id15.charAt(block * 5 + bit);
      if (char >= "A" && char <= "Z") flags |= 1 << bit;
    }
    suffix += SUFFIX[flags];
  }
  return id15 + suffix;
}

export function formatLogicalId(kind: LogicalKind, sequence: number): string {
  const body = `${PREFIX[kind]}${ORG_KEY}${String(sequence).padStart(9, "0")}`;
  return toSalesforce18(body);
}

export function parseLogicalSequence(id: string, kind: LogicalKind): number | null {
  const body = id.slice(0, 15).toUpperCase();
  if (!body.startsWith(`${PREFIX[kind]}${ORG_KEY}`)) return null;
  const n = Number(body.slice(6));
  return Number.isInteger(n) && n > 0 ? n : null;
}

export async function nextLogicalId(kind: LogicalKind): Promise<string> {
  return prisma.$transaction(async (tx) => {
    let row = await tx.idSequence.findUnique({ where: { name: kind } });
    if (!row) {
      row = await tx.idSequence.create({ data: { name: kind, next: 1 } });
    }
    let n = row.next;
    for (;;) {
      const id = formatLogicalId(kind, n);
      n += 1;
      const taken =
        kind === "user"
          ? await tx.staff.findFirst({ where: { OR: [{ id }, { userCode: id }] }, select: { id: true } })
          : kind === "citizen"
            ? await tx.user.findFirst({ where: { id }, select: { id: true } })
            : await tx.case.findFirst({ where: { OR: [{ id }, { caseNumber: id }] }, select: { id: true } });
      if (!taken) {
        await tx.idSequence.update({ where: { name: kind }, data: { next: n } });
        return id;
      }
    }
  });
}

export async function ensureSequenceAtLeast(kind: LogicalKind, next: number) {
  const row = await prisma.idSequence.findUnique({ where: { name: kind } });
  if (!row) {
    await prisma.idSequence.create({ data: { name: kind, next } });
    return;
  }
  if (row.next < next) {
    await prisma.idSequence.update({ where: { name: kind }, data: { next } });
  }
}
