import { getCategoryLabel } from "@/lib/categories";
import type { ResolvedContact } from "@/lib/types";

export type DraftInput = {
  category: string;
  description: string;
  displayAddress: string;
  lat: number;
  lng: number;
  contacts: Pick<ResolvedContact, "name" | "role" | "agency">[];
};

export function draftLetter(input: DraftInput): string {
  const issue = getCategoryLabel(input.category);
  const toLines = input.contacts
    .map((c) => `${c.name}, ${c.role}, ${c.agency}`)
    .join("\n");

  return `To:
${toLines || "(add recipient)"}

Subject: Civic complaint — ${issue} at ${input.displayAddress}

Respected Sir/Madam,

I am writing to report the following issue in Hyderabad:

Location: ${input.displayAddress}
Coordinates: ${input.lat.toFixed(6)}, ${input.lng.toFixed(6)}
Category: ${issue}

Details:
${input.description}

I request that the concerned department inspect the location and take action. Please share an acknowledgement or ticket number.

Thank you.
`;
}

export function draftWhatsApp(input: DraftInput): string {
  const issue = getCategoryLabel(input.category);
  return `Civic complaint (${issue}) at ${input.displayAddress} (${input.lat.toFixed(5)}, ${input.lng.toFixed(5)}). ${input.description}`;
}

export function mailtoHref(emails: string[], subject: string, body: string): string {
  if (emails.length === 0) return "";
  const params = new URLSearchParams({ subject, body });
  return `mailto:${emails.join(",")}?${params.toString()}`;
}

export function whatsappHref(phone: string, text: string): string {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "";
  const withCountry = digits.length === 11 && digits.startsWith("0") ? `91${digits.slice(1)}` : digits.length === 10 ? `91${digits}` : digits;
  return `https://wa.me/${withCountry}?text=${encodeURIComponent(text)}`;
}
