export type AddressParts = {
  house: string;
  street: string;
  area: string;
  landmark: string;
  pincode: string;
};

export const EMPTY_ADDRESS: AddressParts = {
  house: "",
  street: "",
  area: "",
  landmark: "",
  pincode: "",
};

export function composeAddress(parts: AddressParts): string {
  const line = [parts.house, parts.street, parts.area, parts.landmark]
    .map((value) => value.trim())
    .filter(Boolean);
  const city = "Hyderabad, Telangana";
  const pin = parts.pincode.trim();
  return [...line, city, pin].filter(Boolean).join(", ");
}

export function isAddressReady(parts: AddressParts): boolean {
  return parts.area.trim().length >= 3 || parts.street.trim().length >= 3;
}

export type GeocodeHit = {
  lat: number;
  lng: number;
  label: string;
  address: string;
  detail?: string;
};

const DROP_TAIL = /^(india|भारत|telangana|తెలంగాణ)$/i;

export function compactGeocodeHit(hit: Pick<GeocodeHit, "label" | "address">): { title: string; detail: string } {
  const parts = hit.address
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part && !DROP_TAIL.test(part));
  const title = (hit.label || parts[0] || hit.address).trim();
  const rest = parts.filter((part) => part.toLowerCase() !== title.toLowerCase());
  const detail = rest.slice(0, 3).join(" · ") || "Hyderabad";
  return { title, detail };
}
