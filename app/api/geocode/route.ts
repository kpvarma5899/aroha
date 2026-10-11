import { NextResponse } from "next/server";
import { compactGeocodeHit, type GeocodeHit } from "@/lib/address";

const HYD = { lat: 17.385, lng: 78.4867 };
const NOMINATIM_HEADERS = {
  "User-Agent": "ArohaHyderabad/1.0 (civic complaint geocoder)",
  Accept: "application/json",
};

function inHyderabadBox(lat: number, lng: number) {
  return lat >= 17.15 && lat <= 17.75 && lng >= 78.15 && lng <= 78.75;
}

function uniqueHits(hits: GeocodeHit[]): GeocodeHit[] {
  const seen = new Set<string>();
  return hits.filter((hit) => {
    const key = `${hit.label.toLowerCase()}|${hit.lat.toFixed(4)},${hit.lng.toFixed(4)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function searchPhoton(query: string): Promise<GeocodeHit[]> {
  const url = new URL("https://photon.komoot.io/api/");
  url.searchParams.set("q", query);
  url.searchParams.set("lat", String(HYD.lat));
  url.searchParams.set("lon", String(HYD.lng));
  url.searchParams.set("limit", "12");
  url.searchParams.set("lang", "en");
  url.searchParams.set("bbox", "78.15,17.15,78.75,17.75");
  const res = await fetch(url, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(5000) });
  if (!res.ok) return [];
  const data = (await res.json()) as {
    features?: {
      geometry: { coordinates: [number, number] };
      properties: {
        name?: string;
        street?: string;
        housenumber?: string;
        city?: string;
        state?: string;
        postcode?: string;
        district?: string;
        locality?: string;
      };
    }[];
  };
  return (data.features ?? [])
    .map((feature) => {
      const [lng, lat] = feature.geometry.coordinates;
      const p = feature.properties;
      const parts = [p.housenumber, p.name || p.street, p.locality || p.district, p.city, p.state, p.postcode].filter(
        Boolean,
      );
      const address = parts.join(", ");
      const label = p.name || p.street || address;
      const compact = compactGeocodeHit({ label, address });
      return { lat, lng, label: compact.title, address, detail: compact.detail };
    })
    .filter((hit) => Number.isFinite(hit.lat) && Number.isFinite(hit.lng));
}

async function searchNominatim(query: string): Promise<GeocodeHit[]> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  const q = /hyderabad|telangana/i.test(query) ? query : `${query}, Hyderabad, Telangana, India`;
  url.searchParams.set("q", q);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "12");
  url.searchParams.set("countrycodes", "in");
  url.searchParams.set("viewbox", "78.15,17.75,78.75,17.15");
  url.searchParams.set("bounded", "1");
  const res = await fetch(url, { headers: NOMINATIM_HEADERS, signal: AbortSignal.timeout(5000) });
  if (!res.ok) return [];
  const rows = (await res.json()) as { lat: string; lon: string; display_name: string; name?: string }[];
  return rows.map((row) => {
    const address = row.display_name;
    const label = row.name || address.split(",")[0] || address;
    const compact = compactGeocodeHit({ label, address });
    return { lat: Number(row.lat), lng: Number(row.lon), label: compact.title, address, detail: compact.detail };
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || searchParams.get("suggest") || "").trim();
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");

  if (q) {
    const photonResult = await Promise.allSettled([searchPhoton(q), searchNominatim(q)]);
    const photon = photonResult[0].status === "fulfilled" ? photonResult[0].value : [];
    const nominatim = photonResult[1].status === "fulfilled" ? photonResult[1].value : [];
    const ranked = uniqueHits(
      [...photon, ...nominatim].sort((a, b) => {
        const aLocal = inHyderabadBox(a.lat, a.lng) ? 0 : 1;
        const bLocal = inHyderabadBox(b.lat, b.lng) ? 0 : 1;
        return aLocal - bLocal;
      }),
    );
    const local = ranked.filter((hit) => inHyderabadBox(hit.lat, hit.lng));
    const shown = (local.length ? local : ranked).slice(0, 10);
    if (shown.length === 0) {
      return NextResponse.json({ error: "No matching Hyderabad address. Add area, landmark, or pincode." }, { status: 404 });
    }
    return NextResponse.json({ results: shown, lat: shown[0].lat, lng: shown[0].lng, address: shown[0].address });
  }

  if (lat && lng) {
    const url = new URL("https://nominatim.openstreetmap.org/reverse");
    url.searchParams.set("lat", lat);
    url.searchParams.set("lon", lng);
    url.searchParams.set("format", "jsonv2");
    const res = await fetch(url, { headers: NOMINATIM_HEADERS, next: { revalidate: 3600 } });
    if (!res.ok) return NextResponse.json({ address: "Hyderabad, Telangana" });
    const data = (await res.json()) as { display_name?: string };
    return NextResponse.json({ address: data.display_name || "Hyderabad, Telangana" });
  }

  return NextResponse.json({ error: "Provide an address query." }, { status: 400 });
}
