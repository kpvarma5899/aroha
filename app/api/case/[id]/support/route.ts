import { NextResponse } from "next/server";
import { supportPublicCase } from "@/lib/case-public-actions";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  let note = "";
  try {
    const body = (await request.json()) as { note?: string };
    note = String(body.note || "").trim();
  } catch {
    note = "";
  }
  const result = await supportPublicCase(id, note);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true, supportCount: result.supportCount });
}
