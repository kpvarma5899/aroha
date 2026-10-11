import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/staff";
import { runDailyJobs } from "@/lib/jobs/tick";

export async function POST(request: Request) {
  const header = request.headers.get("authorization") || "";
  const secret = process.env.CRON_SECRET;
  const staff = await requireStaff();
  const authed = Boolean(staff) || (Boolean(secret) && header === `Bearer ${secret}`);
  if (!authed) return NextResponse.json({ error: "Not allowed." }, { status: 401 });
  const result = await runDailyJobs();
  return NextResponse.json(result);
}
