import type { AccountabilityBrief, ResolveResult, ResolvedContact } from "@/lib/types";

/** Public pages show who owns the work — not how to reach them. */
export function publicContact(contact: ResolvedContact): ResolvedContact {
  return {
    ...contact,
    phones: [],
    emails: [],
    twitterHandle: null,
  };
}

export function publicResolve(result: ResolveResult): ResolveResult {
  return { ...result, contacts: result.contacts.map(publicContact) };
}

export function publicBrief(brief: AccountabilityBrief): AccountabilityBrief {
  return { ...brief, questions: [] };
}
