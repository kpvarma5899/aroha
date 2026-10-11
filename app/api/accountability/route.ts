import { NextResponse } from "next/server";
import { resolveOfficials } from "@/lib/geo/resolve";
import { writeAccountabilityBrief } from "@/lib/llm/brief";
import { CATEGORIES } from "@/lib/categories";
import { publicBrief, publicResolve } from "@/lib/public-roster";
import type { CategoryId } from "@/lib/types";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    lat?: number;
    lng?: number;
    category?: string;
    description?: string;
    displayAddress?: string;
  };
  const lat = Number(body.lat);
  const lng = Number(body.lng);
  const category = body.category;
  const description = String(body.description || "").trim();
  const displayAddress = String(body.displayAddress || "").trim();
  const known = CATEGORIES.some((item) => item.id === category);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !known) {
    return NextResponse.json({ error: "Provide a Hyderabad pin and a category." }, { status: 400 });
  }
  if (description.length < 12) {
    return NextResponse.json({ error: "Describe the issue first so we can name who to question." }, { status: 400 });
  }

  const resolved = await resolveOfficials(lat, lng, category as CategoryId);
  const brief = await writeAccountabilityBrief(resolved, description, displayAddress || "this location");
  return NextResponse.json({ ...publicResolve(resolved), brief: publicBrief(brief) });
}
