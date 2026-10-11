import { prisma } from "./prisma";
import { nextLogicalId } from "./logical-id";

export async function ensureCitizenByPhone(phone: string) {
  const existing = await prisma.user.findUnique({ where: { phone } });
  if (existing) return existing;
  try {
    const id = await nextLogicalId("citizen");
    return await prisma.user.create({ data: { id, phone } });
  } catch {
    const raced = await prisma.user.findUnique({ where: { phone } });
    if (raced) return raced;
    throw new Error("Could not create the resident record.");
  }
}
