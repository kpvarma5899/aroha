import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function requireStaff() {
  const session = await auth();
  if (session?.user?.account !== "staff" || !session.user.id) return null;
  const staff = await prisma.staff.findFirst({
    where: { id: session.user.id, active: true },
  });
  return staff;
}

export async function requireAdmin() {
  const staff = await requireStaff();
  if (!staff || staff.role !== "admin") return null;
  return staff;
}
