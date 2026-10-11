export type CategoryId =
  | "roads"
  | "garbage"
  | "streetlights"
  | "drainage"
  | "parks"
  | "encroachment"
  | "water"
  | "sewer"
  | "electricity"
  | "crime"
  | "traffic"
  | "other";

export type JurisdictionType =
  | "assembly"
  | "lok_sabha"
  | "municipal_corp"
  | "municipal_zone"
  | "agency";

export type ResolvedJurisdiction = {
  type: JurisdictionType;
  name: string;
  confidence: "official" | "directory" | "approximate";
};

export type ResolvedContact = {
  name: string;
  role: string;
  agency: string;
  party: string | null;
  phones: string[];
  emails: string[];
  portalUrl: string | null;
  sourceUrl: string;
  sourceLabel: string;
  verifiedOn: string;
  stale: boolean;
  reason: string;
  escalationRank: number;
  twitterHandle: string | null;
  photoUrl?: string | null;
  photoSource?: string | null;
};

export type AccountabilityQuestion = {
  name: string;
  role: string;
  agency: string;
  why: string;
  ask: string;
};

export type AccountabilityBrief = {
  summary: string;
  questions: AccountabilityQuestion[];
  nextStep: string;
  model: string;
};

export type AccountabilityResult = ResolveResult & {
  brief: AccountabilityBrief;
};

export type ResolveResult = {
  inCoverage: boolean;
  message?: string;
  lat: number;
  lng: number;
  category: CategoryId;
  jurisdictions: ResolvedJurisdiction[];
  corporatorNote: string;
  contacts: ResolvedContact[];
};

export const STALE_AFTER_DAYS = 90;

export const CORPORATOR_NOTE =
  "No sitting corporator — GHMC council term ended 11 Feb 2026. Special Officer administration until new local body elections.";
