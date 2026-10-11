import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/staff";
import { getCategoryLabel } from "@/lib/categories";
import { casePath, caseUrl, fileUrl, statusLabel } from "@/lib/cases";
import { composeCaseTweets } from "@/lib/twitter/compose";
import { parseStoredBrief } from "@/lib/llm/brief";
import { AccountabilityBriefView } from "@/components/AccountabilityBriefView";
import { AdminCaseActions } from "@/components/AdminCaseActions";
import { AdminCloseCase } from "@/components/AdminCloseCase";
import { AdminPostOnX } from "@/components/AdminPostOnX";
import { ContactRoster } from "@/components/ContactRoster";
import { SlaMeter } from "@/components/SlaMeter";
import { slaView, stepsForContacts } from "@/lib/sla";
import { skipBroadcast, ticketsForCategory } from "@/lib/policy";

function parseList(value: string): string[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export default async function AdminCasePage({ params }: { params: Promise<{ id: string }> }) {
  const staff = await requireStaff();
  if (!staff) return null;
  const { id } = await params;
  const [record, employees] = await Promise.all([
    prisma.case.findFirst({
      where: { OR: [{ id }, { caseNumber: id }] },
      include: {
        contacts: { orderBy: { escalationRank: "asc" } },
        events: { orderBy: { createdAt: "desc" } },
        notes: { orderBy: { createdAt: "desc" }, include: { staff: { select: { name: true } } } },
        attachments: true,
        assignedStaff: { select: { id: true, name: true } },
        closedBy: { select: { name: true } },
        tickets: true,
        replies: { orderBy: { createdAt: "desc" } },
      },
    }),
    prisma.staff.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, role: true, username: true },
    }),
  ]);
  if (!record) notFound();
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
  const tweetDraft = composeCaseTweets({
    caseNumber: record.caseNumber,
    category: record.category,
    description: record.description,
    displayAddress: record.displayAddress,
    trackUrl: caseUrl(record.caseNumber),
    contacts: record.contacts,
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <p className="text-xs uppercase tracking-[0.18em] text-moss">Case ID {record.caseNumber}</p>
      <h1 className="mt-2 font-serif text-4xl">{getCategoryLabel(record.category)}</h1>
      <p className="mt-3">{record.displayAddress}</p>
      <p className="mt-1 text-sm text-ink/60">
        {statusLabel(record.status)}
        {record.assignedStaff ? ` · ${record.assignedStaff.name}` : " · unassigned"}
        {record.reporterPhone ? ` · WhatsApp ${record.reporterPhone}` : " · anonymous (no phone)"}
      </p>
      {!skipBroadcast(record.category) ? (
        <AdminPostOnX
          caseId={record.id}
          postedUrl={record.twitterPostUrl}
          preview={tweetDraft.tweets.join("\n\n")}
        />
      ) : (
        <p className="mt-2 text-sm text-ink/55">This category is not posted on X.</p>
      )}
      <p className="mt-1 font-mono text-xs text-ink/45">
        {record.lat.toFixed(6)}, {record.lng.toFixed(6)}
      </p>

      <h2 className="mt-8 font-serif text-2xl">Description</h2>
      <p className="mt-3 whitespace-pre-wrap leading-relaxed">{record.description}</p>

      {record.attachments.length > 0 ? (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {record.attachments.map((file) =>
            file.kind === "image" ? (
              <figure key={file.id} className="border border-line">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={fileUrl(file.storedName, record.caseNumber)}
                  alt={file.originalName}
                />
                <figcaption className="px-2 py-1 text-xs text-ink/55">
                  {file.purpose === "after" ? "Proof of closure" : "Filed evidence"} · {file.originalName}
                </figcaption>
              </figure>
            ) : (
              <a
                key={file.id}
                href={fileUrl(file.storedName, record.caseNumber)}
                className="border border-line px-3 py-4 text-sm underline"
              >
                {file.originalName}
              </a>
            ),
          )}
        </div>
      ) : null}

      {brief ? (
        <div className="mt-10">
          <AccountabilityBriefView brief={brief} contacts={[]} showRoster={false} />
        </div>
      ) : null}

      <SlaMeter title="Public clock" days={sla.days} label={sla.dueLabel} done={sla.done} steps={steps} />

      <h2 className="mt-10 font-serif text-2xl">Work this case</h2>
      <p className="mt-2 text-sm text-ink/70">
        File the official ticket on MyCURE / 155313 / 1912 / CPGRAMS and paste the number. To close a
        case, use the close-out form below — write what we did, how it was resolved, and attach proofs.
      </p>
      <AdminCaseActions
        caseId={record.id}
        status={record.status}
        assignedStaffId={record.assignedStaffId}
        officialTicketId={record.officialTicketId}
        employees={employees}
        publicUrl={casePath(record.caseNumber)}
        ticketAgencies={ticketsForCategory(record.category)}
        tickets={record.tickets}
      />

      <h2 className="mt-10 font-serif text-2xl">Close-out</h2>
      {record.closedBy ? (
        <p className="mt-2 text-sm text-ink/65">Last closed by {record.closedBy.name}.</p>
      ) : null}
      <AdminCloseCase
        caseId={record.id}
        closeOutcome={record.closeOutcome}
        closeSummary={record.closeSummary}
        proofCount={record.attachments.filter((file) => file.purpose === "after").length}
      />

      <h2 className="mt-10 font-serif text-2xl">Officials — desk actions</h2>
      <p className="mt-2 text-sm text-ink/70">
        Residents see names and photos only. Email and call these offices from here.
      </p>
      <div className="mt-4">
        <ContactRoster
          mode="desk"
          contacts={record.contacts.map((contact) => ({
            name: contact.name,
            role: contact.role,
            agency: contact.agency,
            party: null,
            phones: parseList(contact.phones),
            emails: parseList(contact.emails),
            portalUrl: contact.portalUrl,
            sourceUrl: contact.sourceUrl,
            sourceLabel: contact.sourceLabel,
            verifiedOn: contact.verifiedOn.toISOString().slice(0, 10),
            stale: contact.stale,
            reason: contact.reason,
            escalationRank: contact.escalationRank,
            twitterHandle: contact.twitterHandle,
            photoUrl: contact.photoUrl,
            photoSource: contact.photoSource,
          }))}
        />
      </div>

      {record.replies.length ? (
        <>
          <h2 className="mt-10 font-serif text-2xl">Public office replies</h2>
          <ol className="mt-4 space-y-3 text-sm">
            {record.replies.map((reply) => (
              <li key={reply.id} className="border border-line p-4">
                <p className="font-medium">{reply.author}</p>
                <p className="mt-1 whitespace-pre-wrap">{reply.body}</p>
              </li>
            ))}
          </ol>
        </>
      ) : null}

      <h2 className="mt-10 font-serif text-2xl">Internal notes</h2>
      <ol className="mt-4 space-y-3 text-sm">
        {record.notes.map((note) => (
          <li key={note.id} className="border-l-2 border-moss pl-3">
            <p>{note.body}</p>
            <p className="text-xs text-ink/50">
              {note.staff?.name ?? "Staff"} · {note.createdAt.toLocaleString("en-IN")}
            </p>
          </li>
        ))}
        {record.notes.length === 0 ? <li className="text-ink/60">No notes yet.</li> : null}
      </ol>

      <h2 className="mt-10 font-serif text-2xl">Public timeline</h2>
      <ol className="mt-4 space-y-2 text-sm">
        {record.events.map((event) => (
          <li key={event.id}>
            {statusLabel(event.status)}
            {event.note ? ` — ${event.note}` : ""}
            <span className="block text-xs text-ink/50">{event.createdAt.toLocaleString("en-IN")}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
