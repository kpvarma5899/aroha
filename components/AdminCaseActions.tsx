"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { CASE_STATUSES } from "@/lib/cases";
import type { TicketAgency } from "@/lib/policy";

type Employee = { id: string; name: string; role: string; username?: string };
type Ticket = { agencyKey: string; ticketId: string; notes?: string };

export function AdminCaseActions({
  caseId,
  status,
  assignedStaffId,
  officialTicketId,
  employees,
  publicUrl,
  ticketAgencies,
  tickets,
}: {
  caseId: string;
  status: string;
  assignedStaffId: string | null;
  officialTicketId: string | null;
  employees: Employee[];
  publicUrl: string;
  ticketAgencies: TicketAgency[];
  tickets: Ticket[];
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setInfo("");
    const form = new FormData(event.currentTarget);
    const nextTickets = ticketAgencies
      .map((agency) => ({
        agencyKey: agency.key,
        ticketId: String(form.get(`ticket-${agency.key}`) || "").trim(),
        notes: String(form.get(`ticket-notes-${agency.key}`) || "").trim(),
      }))
      .filter((row) => row.ticketId);
    const res = await fetch(`/api/admin/cases/${caseId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: String(form.get("status") || status),
        assignedStaffId: String(form.get("assignedStaffId") || "") || null,
        officialTicketId: String(form.get("officialTicketId") || ""),
        note: String(form.get("note") || ""),
        tickets: nextTickets,
        reply: String(form.get("reply") || "").trim()
          ? { author: String(form.get("replyAuthor") || "Office"), body: String(form.get("reply") || "") }
          : undefined,
      }),
    });
    const data = (await res.json()) as { error?: string; awaitingConfirm?: boolean };
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Could not update the case.");
      return;
    }
    if (data.awaitingConfirm) {
      setInfo("Resolved is blocked until the reporter confirms or an after photo is on the case. We asked them.");
    }
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="mt-5 grid gap-4 border border-line p-5 sm:grid-cols-2">
      <label className="block text-sm">
        Status
        <select name="status" defaultValue={status} className="mt-1 w-full border border-line bg-paper px-3 py-2">
          {CASE_STATUSES.filter(
            (item) => (item.id !== "resolved" && item.id !== "closed") || item.id === status,
          ).map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        Assign employee
        <select
          name="assignedStaffId"
          defaultValue={assignedStaffId ?? ""}
          className="mt-1 w-full border border-line bg-paper px-3 py-2"
        >
          <option value="">Unassigned</option>
          {employees.map((person) => (
            <option key={person.id} value={person.id}>
              {person.name} @{person.username ?? ""} ({person.role})
            </option>
          ))}
        </select>
      </label>
      <div className="sm:col-span-2 space-y-3">
        <p className="text-sm font-medium">Official tickets (file theirs, keep ours)</p>
        {ticketAgencies.map((agency) => {
          const existing = tickets.find((row) => row.agencyKey === agency.key);
          return (
            <label key={agency.key} className="block text-sm">
              {agency.label}
              <span className="block text-xs text-ink/55">{agency.how}</span>
              <input
                name={`ticket-${agency.key}`}
                defaultValue={existing?.ticketId ?? (agency.key === "other" ? officialTicketId ?? "" : "")}
                className="mt-1 w-full border border-line bg-paper px-3 py-2"
              />
            </label>
          );
        })}
      </div>
      <label className="block text-sm sm:col-span-2">
        Note (who you spoke to, what they promised)
        <textarea name="note" rows={3} className="mt-1 w-full border border-line bg-paper px-3 py-2" />
      </label>
      <label className="block text-sm">
        Office reply — public author
        <input name="replyAuthor" placeholder="GHMC zonal office" className="mt-1 w-full border border-line bg-paper px-3 py-2" />
      </label>
      <label className="block text-sm">
        Office reply — public text
        <textarea name="reply" rows={3} className="mt-1 w-full border border-line bg-paper px-3 py-2" />
      </label>
      {error ? <p className="text-clay sm:col-span-2">{error}</p> : null}
      {info ? <p className="text-moss sm:col-span-2">{info}</p> : null}
      <div className="flex flex-wrap gap-3 sm:col-span-2">
        <button type="submit" disabled={busy} className="border border-moss bg-moss px-5 py-2 text-paper">
          {busy ? "Saving…" : "Save and notify reporter"}
        </button>
        <a href={publicUrl} className="border border-line px-4 py-2">
          Public tracking page
        </a>
      </div>
    </form>
  );
}
