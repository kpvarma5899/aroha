import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireStaff } from "@/lib/staff";
import { nextLogicalId } from "@/lib/logical-id";
import { normalizeUsername } from "@/lib/username";

const STAFF_SELECT = {
  id: true,
  userCode: true,
  username: true,
  email: true,
  name: true,
  details: true,
  phone: true,
  role: true,
  active: true,
  createdAt: true,
} as const;

export async function GET() {
  const staff = await requireStaff();
  if (!staff) return NextResponse.json({ error: "Staff sign-in required." }, { status: 401 });
  const people = await prisma.staff.findMany({
    orderBy: { createdAt: "asc" },
    select: STAFF_SELECT,
  });
  return NextResponse.json({ staff: people, me: { id: staff.id, role: staff.role } });
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admin only." }, { status: 403 });

  const body = (await request.json()) as {
    name?: string;
    username?: string;
    password?: string;
    details?: string;
    phone?: string;
    email?: string;
    role?: string;
  };
  const name = String(body.name || "").trim();
  const username = normalizeUsername(String(body.username || ""));
  const password = String(body.password || "");
  const details = String(body.details || "").trim();
  const phone = String(body.phone || "").trim() || null;
  const email = String(body.email || "").trim().toLowerCase() || null;
  const role = body.role === "admin" ? "admin" : "employee";

  if (name.length < 2 || !username || password.length < 8) {
    return NextResponse.json(
      { error: "Name, a username (letters/numbers/_), and an 8-character password are required." },
      { status: 400 },
    );
  }
  if (email && !email.includes("@")) {
    return NextResponse.json({ error: "Email looks invalid." }, { status: 400 });
  }

  const clash = await prisma.staff.findFirst({
    where: {
      OR: [{ username }, ...(email ? [{ email }] : [])],
    },
  });
  if (clash) {
    return NextResponse.json({ error: "That username or email is already in use." }, { status: 409 });
  }

  const userId = await nextLogicalId("user");
  const created = await prisma.staff.create({
    data: {
      id: userId,
      userCode: userId,
      username,
      name,
      details,
      phone,
      email,
      role,
      passwordHash: await bcrypt.hash(password, 10),
    },
    select: STAFF_SELECT,
  });
  return NextResponse.json({ staff: created });
}
