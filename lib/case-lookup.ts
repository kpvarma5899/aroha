import { prisma } from "@/lib/prisma";

export async function findCaseByRef(ref: string) {
  const id = decodeURIComponent(ref).trim();
  if (!id) return null;
  return prisma.case.findFirst({
    where: {
      OR: [{ id }, { caseNumber: id }, { publicToken: id }],
    },
  });
}
