import { NextResponse } from "next/server";
import { resolveOfficials } from "@/lib/geo/resolve";
import { CATEGORIES } from "@/lib/categories";
import { publicResolve } from "@/lib/public-roster";
import type { CategoryId } from "@/lib/types";

export async function POST(request: Request) {
  const body = (await request.json()) as { lat?: number; lng?: number; category?: string };
  const lat = Number(body.lat);
  const lng = Number(body.lng);
  const category = body.category;
  const known = CATEGORIES.some((item) => item.id === category);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !known) {
    return NextResponse.json({ error: "Provide a Hyderabad pin and a category." }, { status: 400 });
  }
  const result = await resolveOfficials(lat, lng, category as CategoryId);
  return NextResponse.json(publicResolve(result));
}
