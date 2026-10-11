import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCategoryLabel } from "@/lib/categories";
import { closeOutcomeLabel, fileUrl, isClosedStatus, statusLabel } from "@/lib/cases";
import { parseStoredBrief } from "@/lib/llm/brief";
import { AccountabilityBriefView } from "@/components/AccountabilityBriefView";
import { ContactRoster } from "@/components/ContactRoster";
import { ConfirmFixForm } from "@/components/ConfirmFixForm";
import { SupportCaseForm } from "@/components/SupportCaseForm";
import { SlaMeter } from "@/components/SlaMeter";
import { parseList } from "@/lib/json";
import { getLocale } from "@/lib/i18n-server";
import { interpolate, messagesFor } from "@/lib/i18n";
import { slaView, stepsForContacts } from "@/lib/sla";
import { skipBroadcast } from "@/lib/policy";
import { ticketsForCategory } from "@/lib/policy";
import { findCaseByRef } from "@/lib/case-lookup";
import type { ResolvedContact } from "@/lib/types";

export default async function PublicCasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const locale = await getLocale();
  const copy = messagesFor(locale);
  const found = await findCaseByRef(id);
  if (!found) notFound();

  const record = await prisma.case.findUnique({
    where: { id: found.id },
    include: {
      contacts: { orderBy: { escalationRank: "asc" } },
      events: { orderBy: { createdAt: "desc" } },
      attachments: { orderBy: { createdAt: "asc" } },
      assignedStaff: { select: { name: true } },
      tickets: true,
      replies: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!record) notFound();

  const contacts: ResolvedContact[] = record.contacts.map((row) => ({
    name: row.name,
    role: row.role,
    agency: row.agency,
    party: null,
    phones: parseList(row.phones),
    emails: parseList(row.emails),
    portalUrl: row.portalUrl,
    sourceUrl: row.sourceUrl,
    sourceLabel: row.sourceLabel,
    verifiedOn: row.verifiedOn.toISOString().slice(0, 10),
    stale: row.stale,
    reason: row.reason,
    escalationRank: row.escalationRank,
    twitterHandle: row.twitterHandle,
    photoUrl: row.photoUrl,
    photoSource: row.photoSource,
  }));
  const brief = parseStoredBrief(record.accountabilityBrief);
  const sla = slaView({
    createdAt: record.createdAt,
    lastEscalationKey: record.lastEscalationKey,
    contacts: record.contacts,
  });
  const steps = stepsForContacts(record.contacts).map((step) => ({
    ...step,
    done: record.lastEscalationKey.split(",").includes(step.id),
  }));
  const quiet = skipBroadcast(record.category);
  const address = record.sensitive ? record.publicAddress || copy.track.hiddenPin : record.displayAddress;
  const closed = isClosedStatus(record.status);
  const evidence = record.attachments.filter((file) => file.purpose !== "after");
  const proofs = record.attachments.filter((file) => file.purpose === "after");
  const hasCloseOut = Boolean(record.closeSummary.trim());

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <p className="text-xs uppercase tracking-[0.18em] text-moss">
        Case ID {record.caseNumber} · {statusLabel(record.status, copy.status)}
      </p>
      <h1 className="mt-2 font-serif text-4xl">{getCategoryLabel(record.category, locale)}</h1>
      <p className="mt-3 text-ink/80">{address}</p>
      {record.sensitive ? <p className="mt-2 text-sm text-ink/60">{copy.track.hiddenPin}</p> : null}
      {record.assignedStaff ? (
        <p className="mt-2 text-sm text-ink/65">{interpolate(copy.track.assigned, { name: record.assignedStaff.name })}</p>
      ) : (
        <p className="mt-2 text-sm text-ink/65">{copy.track.unassigned}</p>
      )}
      {record.supportCount > 1 ? (
        <p className="mt-2 text-sm">{interpolate(copy.track.supports, { n: record.supportCount })}</p>
      ) : null}
      {!quiet && record.twitterPostUrl ? (
        <p className="mt-2 text-sm">
          <a href={record.twitterPostUrl} className="underline" target="_blank" rel="noreferrer">
            {copy.track.postedX}
          </a>
        </p>
      ) : null}

      {closed ? (
        <section className="mt-8 border border-moss bg-paper-2 p-5">
          <h2 className="font-serif text-2xl">{copy.track.closeTitle}</h2>
          {hasCloseOut ? (
            <>
              <p className="mt-3 text-xs uppercase tracking-[0.16em] text-moss">{copy.track.closeHow}</p>
              <p className="mt-1 font-medium">{closeOutcomeLabel(record.closeOutcome, copy.outcomes)}</p>
              <p className="mt-4 text-xs uppercase tracking-[0.16em] text-moss">{copy.track.closeAction}</p>
              <p className="mt-1 whitespace-pre-wrap leading-relaxed">{record.closeSummary}</p>
              {record.closedAt ? (
                <p className="mt-3 text-xs text-ink/50">
                  {record.closedAt.toLocaleString("en-IN")}
                </p>
              ) : null}
            </>
          ) : (
            <p className="mt-3 text-sm text-ink/70">{copy.track.closePending}</p>
          )}
          {proofs.length ? (
            <div className="mt-5">
              <h3 className="font-serif text-xl">{copy.track.closeProofs}</h3>
              <AttachmentGrid files={proofs} caseNumber={record.caseNumber} />
            </div>
          ) : null}
        </section>
      ) : (
        <div className="mt-8">
          <SlaMeter title={copy.track.sla} days={sla.days} label={sla.dueLabel} done={sla.done} steps={steps} />
        </div>
      )}

      {record.status === "awaiting_confirmation" ? (
        <ConfirmFixForm
          caseRef={record.caseNumber}
          title={copy.track.confirmTitle}
          lead={copy.track.confirmLead}
          yes={copy.track.yesFixed}
          no={copy.track.stillBroken}
          photo={copy.track.afterPhoto}
        />
      ) : !closed ? (
        <div className="mt-8">
          <SupportCaseForm
            caseRef={record.caseNumber}
            title={copy.track.supportTitle}
            lead={copy.track.supportLead}
            action={copy.track.support}
          />
        </div>
      ) : null}

      <h2 className="mt-8 font-serif text-2xl">{copy.track.description}</h2>
      <p className="mt-3 whitespace-pre-wrap leading-relaxed">{record.description}</p>

      {evidence.length > 0 ? (
        <div className="mt-6">
          <h3 className="font-serif text-xl">{copy.track.evidence}</h3>
          <AttachmentGrid files={evidence} caseNumber={record.caseNumber} />
        </div>
      ) : null}

      {record.tickets.length ? (
        <section className="mt-10">
          <h2 className="font-serif text-2xl">{copy.track.tickets}</h2>
          <ul className="mt-3 text-sm">
            {record.tickets.map((ticket) => (
              <li key={ticket.id}>
                {ticketsForCategory(record.category).find((agency) => agency.key === ticket.agencyKey)?.label ||
                  ticket.agencyKey}
                : {ticket.ticketId}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {record.replies.length ? (
        <section className="mt-10">
          <h2 className="font-serif text-2xl">{copy.track.replies}</h2>
          <ol className="mt-3 space-y-3 text-sm">
            {record.replies.map((reply) => (
              <li key={reply.id} className="border-l-2 border-moss pl-3">
                <p className="font-medium">{reply.author}</p>
                <p className="whitespace-pre-wrap">{reply.body}</p>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      <h2 className="mt-10 font-serif text-2xl">{copy.track.who}</h2>
      <p className="mt-2 text-sm text-ink/70">{copy.report.deskActs}</p>
      <div className="mt-4">
        {brief ? (
          <AccountabilityBriefView brief={brief} contacts={contacts} />
        ) : (
          <ContactRoster contacts={contacts} />
        )}
      </div>

      <h2 className="mt-10 font-serif text-2xl">{copy.track.progress}</h2>
      <ol className="mt-4 space-y-2 text-sm">
        {record.events.map((event) => (
          <li key={event.id} className="border-l-2 border-line pl-3">
            <span className="text-moss">{statusLabel(event.status, copy.status)}</span>
            {event.note ? ` — ${event.note}` : ""}
            <span className="block text-xs text-ink/50">{event.createdAt.toLocaleString("en-IN")}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function AttachmentGrid({
  files,
  caseNumber,
}: {
  files: Array<{ id: string; storedName: string; originalName: string; kind: string }>;
  caseNumber: string;
}) {
  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      {files.map((file) =>
        file.kind === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={file.id}
            src={fileUrl(file.storedName, caseNumber)}
            alt={file.originalName}
            className="border border-line"
          />
        ) : (
          <a
            key={file.id}
            href={fileUrl(file.storedName, caseNumber)}
            className="border border-line px-3 py-4 text-sm underline"
          >
            {file.originalName}
          </a>
        ),
      )}
    </div>
  );
}
