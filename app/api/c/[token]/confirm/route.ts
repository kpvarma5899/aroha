import { NextResponse } from "next/server";
import { confirmPublicCase } from "@/lib/case-public-actions";

export async function POST(request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const form = await request.formData();
  const result = await confirmPublicCase(token, form);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true });
}
