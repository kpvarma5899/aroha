import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/staff";

export async function GET(request: Request) {
  const staff = await requireStaff();
  if (!staff) return NextResponse.json({ error: "Staff sign-in required." }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const mine = searchParams.get("mine") === "1";
  const status = searchParams.get("status");

  const cases = await prisma.case.findMany({
    where: {
      ...(mine ? { assignedStaffId: staff.id } : {}),
      ...(status ? { status } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      assignedStaff: { select: { id: true, name: true, email: true } },
      attachments: { select: { id: true, kind: true } },
    },
  });

  return NextResponse.json({ cases, role: staff.role });
}
