import { privacyPolicy } from "@/lib/policy";

const EARTH_M = 6371000;

export function haversineMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_M * Math.asin(Math.min(1, Math.sqrt(s)));
}

function hash32(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function publicPoint(
  lat: number,
  lng: number,
  token: string,
  sensitive: boolean,
): { lat: number; lng: number } {
  if (!sensitive) return { lat, lng };
  const jitter = privacyPolicy.jitterDegrees;
  const hash = hash32(token);
  const latOff = ((hash % 1000) / 1000 - 0.5) * 2 * jitter;
  const lngOff = (((hash / 1000) % 1000) / 1000 - 0.5) * 2 * jitter;
  return { lat: lat + latOff, lng: lng + lngOff };
}
