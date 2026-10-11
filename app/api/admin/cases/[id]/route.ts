import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/staff";
import { caseUrl, isCaseStatus, statusLabel } from "@/lib/cases";
import { notifyReporter } from "@/lib/notify";
import { ticketPolicy } from "@/lib/policy";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const staff = await requireStaff();
  if (!staff) return NextResponse.json({ error: "Staff sign-in required." }, { status: 401 });

  const { id } = await context.params;
  const body = (await request.json()) as {
    status?: string;
    assignedStaffId?: string | null;
    officialTicketId?: string;
    note?: string;
    tickets?: Array<{ agencyKey: string; ticketId: string; notes?: string }>;
    reply?: { author: string; body: string };
  };

  const current = await prisma.case.findFirst({
    where: { OR: [{ id }, { caseNumber: id }] },
  });
  if (!current) return NextResponse.json({ error: "Not found." }, { status: 404 });

  let nextStatus = body.status && isCaseStatus(body.status) ? body.status : current.status;
  const assignedStaffId =
    body.assignedStaffId === undefined ? current.assignedStaffId : body.assignedStaffId || null;
  const officialTicketId =
    typeof body.officialTicketId === "string" ? body.officialTicketId.trim() || null : current.officialTicketId;

  if (assignedStaffId) {
    const assignee = await prisma.staff.findFirst({ where: { id: assignedStaffId, active: true } });
    if (!assignee) return NextResponse.json({ error: "Unknown employee." }, { status: 400 });
  }

  if (nextStatus === "resolved" || nextStatus === "closed") {
    return NextResponse.json(
      {
        error:
          "Closing a case needs a written close-out and proof photos. Use the close-out form on this page.",
      },
      { status: 400 },
    );
  }

  const awaiting = nextStatus === "awaiting_confirmation" && nextStatus !== current.status;

  const statusChanged = nextStatus !== current.status;
  const assignedChanged = assignedStaffId !== current.assignedStaffId;
  const note = body.note?.trim();

  const ticketCreates = (body.tickets ?? [])
    .filter((row) => row.agencyKey && row.ticketId?.trim())
    .filter((row) => ticketPolicy.agencies.some((agency) => agency.key === row.agencyKey));

  const updated = await prisma.case.update({
    where: { id: current.id },
    data: {
      status: assignedStaffId && nextStatus === "open" ? "assigned" : nextStatus,
      assignedStaffId,
      officialTicketId: officialTicketId || ticketCreates[0]?.ticketId || current.officialTicketId,
      awaitingConfirmAt: awaiting ? new Date() : current.awaitingConfirmAt,
      events: {
        create: {
          status: assignedStaffId && nextStatus === "open" ? "assigned" : nextStatus,
          note:
            note ||
            [
              awaiting
                ? "Desk thinks it is fixed. Waiting for the reporter to confirm — we will not mark it resolved from here."
                : statusChanged
                  ? `Status: ${statusLabel(nextStatus)}.`
                  : null,
              assignedChanged ? "Assignment updated." : null,
            ]
              .filter(Boolean)
              .join(" ") || "Case updated.",
        },
      },
      notes: note ? { create: { staffId: staff.id, body: note } } : undefined,
      tickets: ticketCreates.length
        ? {
            upsert: ticketCreates.map((row) => ({
              where: { caseId_agencyKey: { caseId: current.id, agencyKey: row.agencyKey } },
              create: {
                agencyKey: row.agencyKey,
                ticketId: row.ticketId.trim(),
                notes: row.notes || "",
                portalUrl: ticketPolicy.agencies.find((agency) => agency.key === row.agencyKey)?.portalUrl,
              },
              update: {
                ticketId: row.ticketId.trim(),
                notes: row.notes || "",
              },
            })),
          }
        : undefined,
      replies: body.reply?.body?.trim()
        ? { create: { author: body.reply.author.trim() || "Office", body: body.reply.body.trim(), staffId: staff.id } }
        : undefined,
    },
  });

  if (statusChanged || assignedChanged || awaiting) {
    const message = awaiting
      ? updated.locale === "te"
        ? `మీ కేసు ${updated.caseNumber} సరిపోయిందని డెస్క్ అనుకుంటోంది. మీరు నిర్ధారించండి: ${caseUrl(updated.caseNumber)}`
        : `The desk thinks case ${updated.caseNumber} is fixed. Please confirm: ${caseUrl(updated.caseNumber)}`
      : `Update on Aroha case ${updated.caseNumber}: ${statusLabel(updated.status)}. Track it: ${caseUrl(updated.caseNumber)}`;
    await notifyReporter(current.reporterPhone, message);
  }

  return NextResponse.json({ ok: true, status: updated.status, awaitingConfirm: awaiting });
}
