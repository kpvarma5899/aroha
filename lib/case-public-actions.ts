import { findCaseByRef } from "@/lib/case-lookup";
import { caseUrl } from "@/lib/cases";
import { notifyReporter } from "@/lib/notify";
import { slaPolicy } from "@/lib/policy";
import { prisma } from "@/lib/prisma";
import { saveUploads } from "@/lib/uploads";

export async function confirmPublicCase(ref: string, form: FormData) {
  const record = await findCaseByRef(ref);
  if (!record) return { error: "Not found.", status: 404 as const };

  const kind = String(form.get("kind") || "");
  const note = String(form.get("note") || "").trim();
  if (kind !== "fixed" && kind !== "still_broken") {
    return { error: "Say whether it is fixed.", status: 400 as const };
  }

  const files = form.getAll("files").filter((item): item is File => item instanceof File);
  const saved = await saveUploads(files, 4);

  if (kind === "fixed") {
    await prisma.case.update({
      where: { id: record.id },
      data: {
        status: "resolved",
        residentConfirm: "confirmed",
        residentConfirmAt: new Date(),
        events: {
          create: { status: "resolved", note: note || "Reporter confirmed the fix." },
        },
        attachments: {
          create: saved.map((file) => ({
            storedName: file.storedName,
            originalName: file.originalName,
            mime: file.mime,
            kind: file.kind,
            purpose: "after",
          })),
        },
        confirmations: { create: { kind: "fixed", note, phone: record.reporterPhone } },
      },
    });
  } else {
    await prisma.case.update({
      where: { id: record.id },
      data: {
        status: record.status === "awaiting_confirmation" ? "in_progress" : record.status,
        residentConfirm: "disputed",
        residentConfirmAt: new Date(),
        supportCount: { increment: 1 },
        events: {
          create: { status: "in_progress", note: note || "Reporter said it is still broken. Clock stays open." },
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
        confirmations: { create: { kind: "still_broken", note, phone: record.reporterPhone } },
      },
    });
    if (record.reporterPhone) {
      await notifyReporter(
        record.reporterPhone,
        `We logged that case ${record.caseNumber} is still broken. Track it: ${caseUrl(record.caseNumber)}`,
      );
    }
  }

  return { ok: true as const };
}

export async function supportPublicCase(ref: string, note: string) {
  const record = await findCaseByRef(ref);
  if (!record) return { error: "Not found.", status: 404 as const };
  const open = [...slaPolicy.openStatuses, slaPolicy.awaitingStatus];
  if (!open.includes(record.status)) {
    return { error: "This case is already closed.", status: 400 as const };
  }

  const updated = await prisma.case.update({
    where: { id: record.id },
    data: {
      supportCount: { increment: 1 },
      confirmations: { create: { kind: "me_too", note } },
      events: {
        create: { status: record.status, note: "Another resident said this is still broken." },
      },
    },
    select: { supportCount: true },
  });

  return { ok: true as const, supportCount: updated.supportCount };
}
