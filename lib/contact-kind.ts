import type { ResolvedContact } from "@/lib/types";

export type ContactKind = "department" | "official" | "politician";

export const CONTACT_GROUPS: { id: ContactKind; title: string; hint: string }[] = [
  {
    id: "department",
    title: "Department",
    hint: "The agency that owns this work.",
  },
  {
    id: "official",
    title: "Officials",
    hint: "Municipal officers for this area.",
  },
  {
    id: "politician",
    title: "Politicians",
    hint: "Your MLA and MP. Our desk escalates to them if the department does not act.",
  },
];

export function contactKind(role: string): ContactKind {
  if (role === "Helpline") return "department";
  if (role === "MLA" || role === "MP") return "politician";
  return "official";
}

export function groupContacts(contacts: ResolvedContact[]) {
  return CONTACT_GROUPS.map((group) => ({
    ...group,
    contacts: contacts.filter((contact) => contactKind(contact.role) === group.id),
  })).filter((group) => group.contacts.length > 0);
}
