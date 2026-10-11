import { NextResponse } from "next/server";
import { findNearbyOpenCases } from "@/lib/duplicates";
import { CATEGORIES } from "@/lib/categories";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));
  const category = String(searchParams.get("category") || "");
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !CATEGORIES.some((item) => item.id === category)) {
    return NextResponse.json({ cases: [] });
  }
  const cases = await findNearbyOpenCases({ lat, lng, category });
  return NextResponse.json({ cases });
}
