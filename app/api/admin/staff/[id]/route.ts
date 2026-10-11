import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/staff";
import { normalizeUsername } from "@/lib/username";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admin only." }, { status: 403 });

  const { id } = await context.params;
  const current = await prisma.staff.findFirst({ where: { OR: [{ id }, { userCode: id }] } });
  if (!current) return NextResponse.json({ error: "User not found." }, { status: 404 });

  const body = (await request.json()) as {
    name?: string;
    username?: string;
    details?: string;
    phone?: string;
    email?: string;
    role?: string;
    active?: boolean;
    password?: string;
  };

  const data: {
    name?: string;
    username?: string;
    details?: string;
    phone?: string | null;
    email?: string | null;
    role?: string;
    active?: boolean;
    passwordHash?: string;
  } = {};

  if (typeof body.name === "string" && body.name.trim().length >= 2) data.name = body.name.trim();
  if (typeof body.details === "string") data.details = body.details.trim();
  if (typeof body.phone === "string") data.phone = body.phone.trim() || null;
  if (typeof body.email === "string") {
    const email = body.email.trim().toLowerCase();
    data.email = email || null;
  }
  if (body.role === "admin" || body.role === "employee") data.role = body.role;
  if (typeof body.active === "boolean") data.active = body.active;
  if (typeof body.username === "string") {
    const username = normalizeUsername(body.username);
    if (!username) return NextResponse.json({ error: "Username must start with a letter and use a-z, 0-9, _." }, { status: 400 });
    data.username = username;
  }
  if (typeof body.password === "string" && body.password.length > 0) {
    if (body.password.length < 8) {
      return NextResponse.json({ error: "New password must be at least 8 characters." }, { status: 400 });
    }
    data.passwordHash = await bcrypt.hash(body.password, 10);
  }

  if (data.username && data.username !== current.username) {
    const taken = await prisma.staff.findUnique({ where: { username: data.username } });
    if (taken) return NextResponse.json({ error: "That username is already in use." }, { status: 409 });
  }

  const updated = await prisma.staff.update({
    where: { id: current.id },
    data,
    select: {
      id: true,
      userCode: true,
      username: true,
      email: true,
      name: true,
      details: true,
      phone: true,
      role: true,
      active: true,
    },
  });
  return NextResponse.json({ staff: updated, passwordReset: Boolean(data.passwordHash) });
}
