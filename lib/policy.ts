import sla from "@/data/policy/sla.json";
import channels from "@/data/policy/channels.json";
import privacy from "@/data/policy/privacy.json";
import tickets from "@/data/policy/tickets.json";
import rti from "@/data/policy/rti.json";

export type SlaStep = (typeof sla.steps)[number];
export type TicketAgency = (typeof tickets.agencies)[number];

export const slaPolicy = sla;
export const channelPolicy = channels;
export const privacyPolicy = privacy;
export const ticketPolicy = tickets;
export const rtiPolicy = rti;

export function isSensitiveCategory(category: string): boolean {
  return (privacy.hideExactPinCategories as string[]).includes(category);
}

export function skipBroadcast(category: string): boolean {
  return (channelPolicy.skipPublicBroadcastCategories as string[]).includes(category);
}

export function ticketsForCategory(category: string): TicketAgency[] {
  const matched = tickets.agencies.filter((agency) => {
    const list = agency.categories as string[];
    return list.length === 0 || list.includes(category);
  });
  const seen = new Set<string>();
  return matched.filter((agency) => {
    if (seen.has(agency.key)) return false;
    seen.add(agency.key);
    return true;
  });
}
