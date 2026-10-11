import { NextResponse } from "next/server";
import { caseUrl, isCloseOutcome } from "@/lib/cases";
import { notifyReporter } from "@/lib/notify";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/staff";
import { saveUploads } from "@/lib/uploads";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const staff = await requireStaff();
  if (!staff) return NextResponse.json({ error: "Staff sign-in required." }, { status: 401 });

  const { id } = await context.params;
  const current = await prisma.case.findFirst({
    where: { OR: [{ id }, { caseNumber: id }] },
    include: { attachments: { select: { purpose: true } } },
  });
  if (!current) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const form = await request.formData();
  const closeOutcome = String(form.get("closeOutcome") || "").trim();
  const closeSummary = String(form.get("closeSummary") || "").trim();
  if (!isCloseOutcome(closeOutcome)) {
    return NextResponse.json({ error: "Pick how this was resolved." }, { status: 400 });
  }
  if (closeSummary.length < 40) {
    return NextResponse.json(
      { error: "Write what action we took and how it was resolved (a short paragraph, at least 40 characters)." },
      { status: 400 },
    );
  }

  const files = form.getAll("proofs").filter((item): item is File => item instanceof File);
  const saved = await saveUploads(files, 8);
  const existingProofs = current.attachments.filter((file) => file.purpose === "after").length;
  if (existingProofs + saved.length < 1) {
    return NextResponse.json(
      { error: "Attach at least one proof of closure (after photo, work-order scan, or similar)." },
      { status: 400 },
    );
  }

  const updated = await prisma.case.update({
    where: { id: current.id },
    data: {
      status: "closed",
      closeOutcome,
      closeSummary,
      closedAt: current.closedAt ?? new Date(),
      closedByStaffId: staff.id,
      attachments: {
        create: saved.map((file) => ({
          storedName: file.storedName,
          originalName: file.originalName,
          mime: file.mime,
          kind: file.kind,
          purpose: "after",
        })),
      },
      events: {
        create: {
          status: "closed",
          note: `Closed. ${closeOutcome.replaceAll("_", " ")}. ${closeSummary.slice(0, 280)}`,
        },
      },
      notes: {
        create: { staffId: staff.id, body: `Close-out: ${closeSummary}` },
      },
    },
  });

  await notifyReporter(
    current.reporterPhone,
    `Aroha case ${updated.caseNumber} is closed. See what we did: ${caseUrl(updated.caseNumber)}`,
  );

  return NextResponse.json({ ok: true, status: updated.status });
}
