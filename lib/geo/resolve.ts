import { readFileSync } from "node:fs";
import { join } from "node:path";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { point } from "@turf/helpers";
import type { Feature, FeatureCollection, Polygon, MultiPolygon } from "geojson";
import type {
  CategoryId,
  ResolveResult,
  ResolvedContact,
  ResolvedJurisdiction,
} from "@/lib/types";
import { CORPORATOR_NOTE, STALE_AFTER_DAYS } from "@/lib/types";
import { CATEGORIES } from "@/lib/categories";
import { portraitFor } from "@/lib/portraits";
import { prisma } from "@/lib/prisma";

type AssemblyProps = { cons_name: string; name?: string; cons_code?: number };

type CategoryRule = {
  id: CategoryId;
  label: string;
  agencies: string[];
  includeZonal: boolean;
  includeCommissioner: boolean;
  includeMla: boolean;
  includeMp: boolean;
};

type CorpMap = { name: string; confidence: "approximate" | "directory" };

type JurisdictionMap = {
  assemblyToLokSabha: Record<string, string>;
  assemblyToMunicipalCorp: Record<string, CorpMap>;
  assemblyToZone: Record<string, CorpMap>;
};

const DATA_DIR = join(process.cwd(), "data");

function loadJson<T>(rel: string): T {
  return JSON.parse(readFileSync(join(DATA_DIR, rel), "utf8")) as T;
}

const assemblyCollection = loadJson<FeatureCollection<Polygon | MultiPolygon, AssemblyProps>>(
  "boundaries/assembly.geojson",
);
const categoryRules = loadJson<{ categories: CategoryRule[] }>("routing/categories.json").categories;
const jurisdictionMap = loadJson<JurisdictionMap>("routing/jurisdiction-map.json");

export { CATEGORIES };

function isStale(verifiedOn: Date): boolean {
  const age = Date.now() - verifiedOn.getTime();
  return age > STALE_AFTER_DAYS * 24 * 60 * 60 * 1000;
}

function parseList(value: string): string[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function findAssembly(lat: number, lng: number): Feature<Polygon | MultiPolygon, AssemblyProps> | null {
  const pt = point([lng, lat]);
  for (const feature of assemblyCollection.features) {
    if (booleanPointInPolygon(pt, feature)) {
      return feature;
    }
  }
  return null;
}

const ROLE_RANK: Record<string, number> = {
  Helpline: 10,
  "Zonal Commissioner": 20,
  "Municipal Commissioner": 30,
  MLA: 40,
  MP: 50,
};

export async function resolveOfficials(lat: number, lng: number, category: CategoryId): Promise<ResolveResult> {
  const rule = categoryRules.find((c) => c.id === category);
  if (!rule) {
    return {
      inCoverage: false,
      message: "Unknown complaint category.",
      lat,
      lng,
      category,
      jurisdictions: [],
      corporatorNote: CORPORATOR_NOTE,
      contacts: [],
    };
  }

  const hit = findAssembly(lat, lng);
  if (!hit) {
    return {
      inCoverage: false,
      message:
        "This pin is outside the Hyderabad metro assembly seats we currently map (GHMC / Cyberabad / Malkajgiri area). Move the pin into the city to see officials.",
      lat,
      lng,
      category,
      jurisdictions: [],
      corporatorNote: CORPORATOR_NOTE,
      contacts: [],
    };
  }

  const assemblyName = hit.properties.cons_name || hit.properties.name || "";
  const lsName = jurisdictionMap.assemblyToLokSabha[assemblyName];
  const corp = jurisdictionMap.assemblyToMunicipalCorp[assemblyName];
  const zone = jurisdictionMap.assemblyToZone[assemblyName];

  const jurisdictions: ResolvedJurisdiction[] = [
    { type: "assembly", name: assemblyName, confidence: "official" },
  ];
  if (lsName) {
    jurisdictions.push({ type: "lok_sabha", name: lsName, confidence: "official" });
  }
  if (corp) {
    jurisdictions.push({
      type: "municipal_corp",
      name: corp.name,
      confidence: corp.confidence === "directory" ? "directory" : "approximate",
    });
  }
  if (zone) {
    jurisdictions.push({
      type: "municipal_zone",
      name: zone.name,
      confidence: zone.confidence === "directory" ? "directory" : "approximate",
    });
  }

  const wanted: { type: string; name: string; reason: string }[] = [];

  for (const agency of rule.agencies) {
    wanted.push({
      type: "agency",
      name: agency,
      reason:
        agency === "civic-helpline"
          ? "Primary civic grievance channel for roads, sanitation, lights, and similar municipal work."
          : agency === "hmwssb"
            ? "Water and sewerage in Hyderabad are owned by HMWSSB, not the municipal corporation."
            : agency === "tgspdcl"
              ? "Electricity distribution in this area is TGSPDCL."
              : "Emergency police numbers. We do not name a local station until an official boundary layer is verified.",
    });
  }

  if (rule.includeZonal && zone) {
    wanted.push({
      type: "municipal_zone",
      name: zone.name,
      reason: `GHMC still publishes a ${zone.name} zonal commissioner. Mapped from your pin in ${assemblyName} Assembly (${zone.confidence === "directory" ? "matches the GHMC circle directory" : "approximate"}).`,
    });
  }

  if (rule.includeCommissioner && corp?.name === "Greater Hyderabad Municipal Corporation") {
    wanted.push({
      type: "municipal_corp",
      name: corp.name,
      reason: "Municipal commissioner published on ghmc.gov.in for Greater Hyderabad Municipal Corporation.",
    });
  } else if (rule.includeCommissioner && corp) {
    // CMC/MMC: no verified commissioner directory — skip named person.
  }

  if (rule.includeMla) {
    wanted.push({
      type: "assembly",
      name: assemblyName,
      reason: `Your pin is inside ${assemblyName} Assembly (ECI 2023 boundaries).`,
    });
  }

  if (rule.includeMp && lsName) {
    wanted.push({
      type: "lok_sabha",
      name: lsName,
      reason: `${assemblyName} is an assembly segment of ${lsName} Lok Sabha (2008 delimitation).`,
    });
  }

  const contacts: ResolvedContact[] = [];
  const seen = new Set<string>();

  for (const item of wanted) {
    const seats = await prisma.officialSeat.findMany({
      where: {
        jurisdiction: { type: item.type, name: item.name },
        official: { isCurrent: true },
      },
      include: { official: true, jurisdiction: true },
    });

    for (const seat of seats) {
      const dedupe = `${seat.officialId}:${seat.role}`;
      if (seen.has(dedupe)) continue;
      seen.add(dedupe);
      const official = seat.official;
      const portrait = portraitFor(official.name, official.photoUrl, official.photoSource);
      contacts.push({
        name: official.name,
        role: seat.role,
        agency: official.agency,
        party: official.party,
        phones: parseList(official.phones),
        emails: parseList(official.emails),
        portalUrl: official.portalUrl,
        sourceUrl: official.sourceUrl,
        sourceLabel: official.sourceLabel,
        verifiedOn: official.verifiedOn.toISOString().slice(0, 10),
        stale: isStale(official.verifiedOn),
        reason: item.reason,
        escalationRank: ROLE_RANK[seat.role] ?? 99,
        twitterHandle: official.twitterHandle || null,
        photoUrl: portrait?.photoUrl || null,
        photoSource: portrait?.photoSource || null,
      });
    }
  }

  contacts.sort((a, b) => a.escalationRank - b.escalationRank || a.role.localeCompare(b.role));

  return {
    inCoverage: true,
    lat,
    lng,
    category,
    jurisdictions,
    corporatorNote: CORPORATOR_NOTE,
    contacts,
  };
}

