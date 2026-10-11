import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { CATEGORIES } from "@/lib/categories";
import { caseUrl } from "@/lib/cases";
import { isLocale } from "@/lib/i18n";
import { afterCaseFiled } from "@/lib/lifecycle/on-file";
import { ensureCitizenByPhone } from "@/lib/citizens";
import { nextLogicalId } from "@/lib/logical-id";
import { normalizePhone } from "@/lib/phone";
import { isSensitiveCategory } from "@/lib/policy";
import { resolveOfficials } from "@/lib/geo/resolve";
import { settle } from "@/lib/settle";
import { saveUploads } from "@/lib/uploads";
import type { CategoryId, ResolvedContact } from "@/lib/types";

function isContact(value: unknown): value is ResolvedContact {
  if (!value || typeof value !== "object") return false;
  const row = value as ResolvedContact;
  return typeof row.name === "string" && typeof row.role === "string" && typeof row.reason === "string";
}

export async function POST(request: Request) {
  const session = await auth();
  const form = await request.formData();
  const lat = Number(form.get("lat"));
  const lng = Number(form.get("lng"));
  const displayAddress = String(form.get("displayAddress") || "").trim();
  const category = String(form.get("category") || "") as CategoryId;
  const description = String(form.get("description") || "").trim();
  const reporterPhone = normalizePhone(String(form.get("phone") || ""));
  const locale = isLocale(String(form.get("locale") || "")) ? String(form.get("locale")) : "en";
  let briefJson = "{}";
  try {
    const parsed = JSON.parse(String(form.get("brief") || "{}")) as unknown;
    if (parsed && typeof parsed === "object") briefJson = JSON.stringify(parsed);
  } catch {
    briefJson = "{}";
  }
  let contacts: ResolvedContact[] = [];
  try {
    const parsed = JSON.parse(String(form.get("contacts") || "[]")) as unknown;
    contacts = Array.isArray(parsed) ? parsed.filter(isContact) : [];
  } catch {
    contacts = [];
  }

  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !displayAddress || description.length < 12) {
    return NextResponse.json({ error: "Address and a description are required." }, { status: 400 });
  }
  if (!CATEGORIES.some((item) => item.id === category)) {
    return NextResponse.json({ error: "Unknown category." }, { status: 400 });
  }

  const resolved = await settle("resolve", () => resolveOfficials(lat, lng, category));
  if (resolved?.contacts.length) contacts = resolved.contacts;
  if (resolved && !resolved.inCoverage) {
    return NextResponse.json({ error: resolved.message || "Outside coverage." }, { status: 400 });
  }

  const files = [
    ...form.getAll("photos"),
    ...form.getAll("files"),
    ...form.getAll("attachments"),
  ].filter((item): item is File => item instanceof File);
  const saved = await saveUploads(files);

  let userId: string | null = session?.user?.account === "citizen" ? session.user.id : null;
  if (reporterPhone) {
    const user = await ensureCitizenByPhone(reporterPhone);
    userId = user.id;
  }

  const sensitive = isSensitiveCategory(category);
  const assemblyName = resolved?.jurisdictions.find((item) => item.type === "assembly")?.name ?? null;
  const zoneName = resolved?.jurisdictions.find((item) => item.type === "municipal_zone")?.name ?? null;
  const lokSabhaName = resolved?.jurisdictions.find((item) => item.type === "lok_sabha")?.name ?? null;
  const municipalCorpName = resolved?.jurisdictions.find((item) => item.type === "municipal_corp")?.name ?? null;
  const publicAddress = sensitive ? `${assemblyName || "Hyderabad"} area` : displayAddress;

  const caseId = await nextLogicalId("case");
  const publicToken = randomBytes(16).toString("hex");
  const created = await prisma.case.create({
    data: {
      id: caseId,
      caseNumber: caseId,
      publicToken,
      userId,
      reporterPhone,
      lat,
      lng,
      displayAddress,
      publicAddress,
      locale,
      sensitive,
      category,
      description,
      accountabilityBrief: briefJson,
      status: "open",
      assemblyName,
      zoneName,
      lokSabhaName,
      municipalCorpName,
      slaDueAt: new Date(Date.now() + 3 * 86_400_000),
      events: {
        create: { status: "open", note: "Case filed. Our team will take this to the right department." },
      },
      contacts: {
        create: contacts.map((contact) => ({
          name: contact.name,
          role: contact.role,
          agency: contact.agency,
          reason: contact.reason,
          escalationRank: contact.escalationRank,
          phones: JSON.stringify(contact.phones ?? []),
          emails: JSON.stringify(contact.emails ?? []),
          portalUrl: contact.portalUrl,
          sourceUrl: contact.sourceUrl,
          sourceLabel: contact.sourceLabel,
          verifiedOn: new Date(`${contact.verifiedOn}T00:00:00.000Z`),
          stale: Boolean(contact.stale),
          twitterHandle: contact.twitterHandle || null,
          photoUrl: contact.photoUrl || "",
          photoSource: contact.photoSource || "",
        })),
      },
      attachments: {
        create: saved.map((file) => ({
          storedName: file.storedName,
          originalName: file.originalName,
          mime: file.mime,
          kind: file.kind,
          purpose: "evidence",
        })),
      },
    },
  });

  const side = await afterCaseFiled({ record: created, contacts });
  const trackUrl = caseUrl(created.caseNumber);

  return NextResponse.json({
    id: created.id,
    caseNumber: created.caseNumber,
    token: created.caseNumber,
    url: trackUrl,
    notified: Boolean(reporterPhone),
    emailed: side.emailed,
    quiet: sensitive,
    twitter: {
      posted: side.twitter.posted,
      url: side.twitter.url,
      intentUrl: side.twitter.intentUrl,
    },
  });
}
