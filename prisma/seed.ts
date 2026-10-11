import { readFileSync } from "node:fs";
import { join } from "node:path";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { ensureSequenceAtLeast, formatLogicalId, parseLogicalSequence } from "../lib/logical-id";

const prisma = new PrismaClient();
const dataDir = join(process.cwd(), "data");

type OfficialSeed = {
  key: string;
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
  twitterHandle?: string | null;
  seats: { type: string; name: string; role: string }[];
};

type AssemblyFC = {
  features: { properties: { cons_name: string; cons_code?: number }; geometry: unknown }[];
};

async function upsertJurisdiction(type: string, name: string, geojson = "{}") {
  return prisma.jurisdiction.upsert({
    where: { type_name: { type, name } },
    create: { type, name, geojson },
    update: { geojson },
  });
}

async function main() {
  const officials = JSON.parse(
    readFileSync(join(dataDir, "officials/hyderabad.json"), "utf8"),
  ) as { officials: OfficialSeed[] };
  const portraits = JSON.parse(
    readFileSync(join(dataDir, "officials/portraits.json"), "utf8"),
  ) as { portraits: Record<string, { photoUrl: string; photoSource: string }> };
  const assembly = JSON.parse(
    readFileSync(join(dataDir, "boundaries/assembly.geojson"), "utf8"),
  ) as AssemblyFC;

  await prisma.officialSeat.deleteMany();
  await prisma.official.deleteMany();

  for (const feature of assembly.features) {
    await upsertJurisdiction(
      "assembly",
      feature.properties.cons_name,
      JSON.stringify(feature.geometry),
    );
  }

  for (const official of officials.officials) {
    const created = await prisma.official.create({
      data: {
        name: official.name,
        role: official.role,
        agency: official.agency,
        party: official.party,
        phones: JSON.stringify(official.phones),
        emails: JSON.stringify(official.emails),
        portalUrl: official.portalUrl,
        sourceUrl: official.sourceUrl,
        sourceLabel: official.sourceLabel,
        verifiedOn: new Date(`${official.verifiedOn}T00:00:00.000Z`),
        isCurrent: true,
        twitterHandle: official.twitterHandle || null,
        photoUrl: portraits.portraits[official.key]?.photoUrl || "",
        photoSource: portraits.portraits[official.key]?.photoSource || "",
      },
    });

    for (const seat of official.seats) {
      const jurisdiction = await upsertJurisdiction(seat.type, seat.name);
      await prisma.officialSeat.create({
        data: {
          officialId: created.id,
          jurisdictionId: jurisdiction.id,
          role: seat.role,
        },
      });
    }
  }

  const count = await prisma.official.count();
  const seats = await prisma.officialSeat.count();
  console.log(`Seeded ${count} officials and ${seats} seats.`);

  const email = (process.env.ADMIN_EMAIL || "admin@aroha.local").trim().toLowerCase();
  const username = (process.env.ADMIN_USERNAME || "admin").trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "aroha-admin";
  const adminId = formatLogicalId("user", 1);
  const existing = await prisma.staff.findFirst({
    where: { OR: [{ username }, { email }] },
  });
  if (!existing) {
    await prisma.staff.create({
      data: {
        id: adminId,
        userCode: adminId,
        username,
        email,
        name: "Admin",
        details: "Primary administrator for the Aroha desk.",
        role: "admin",
        passwordHash: await bcrypt.hash(password, 10),
      },
    });
    console.log(`Created admin @${username} ${adminId}`);
  } else {
    const keepId = parseLogicalSequence(existing.userCode, "user") ? existing.userCode : adminId;
    await prisma.staff.update({
      where: { id: existing.id },
      data: {
        username,
        email,
        userCode: keepId,
        details: existing.details || "Primary administrator for the Aroha desk.",
      },
    });
    console.log(`Updated admin @${username} ${keepId}`);
  }

  const staffRows = await prisma.staff.findMany({ select: { userCode: true } });
  const maxUser = staffRows.reduce((max, row) => Math.max(max, parseLogicalSequence(row.userCode, "user") ?? 0), 0);
  await ensureSequenceAtLeast("user", maxUser + 1);
  const citizenRows = await prisma.user.findMany({ select: { id: true } });
  const maxCitizen = citizenRows.reduce((max, row) => Math.max(max, parseLogicalSequence(row.id, "citizen") ?? 0), 0);
  await ensureSequenceAtLeast("citizen", maxCitizen + 1);
  const caseRows = await prisma.case.findMany({ select: { caseNumber: true } });
  const maxCase = caseRows.reduce((max, row) => Math.max(max, parseLogicalSequence(row.caseNumber, "case") ?? 0), 0);
  await ensureSequenceAtLeast("case", maxCase + 1);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
