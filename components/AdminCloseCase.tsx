"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { CLOSE_OUTCOMES } from "@/lib/cases";

const FILE_ACCEPT =
  "image/jpeg,image/png,image/webp,image/gif,application/pdf,text/plain,text/csv,.doc,.docx";

export function AdminCloseCase({
  caseId,
  closeOutcome,
  closeSummary,
  proofCount,
}: {
  caseId: string;
  closeOutcome: string;
  closeSummary: string;
  proofCount: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch(`/api/admin/cases/${caseId}/close`, {
      method: "POST",
      body: new FormData(event.currentTarget),
    });
    const data = (await res.json()) as { error?: string };
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Could not close the case.");
      return;
    }
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="mt-5 space-y-4 border border-line p-5">
      <p className="text-sm text-ink/70">
        A closed case is public. Write what we did, how it was resolved, and attach proofs. Residents
        cannot post this — only the desk can close it this way.
      </p>
      <label className="block text-sm">
        How we resolved it
        <select
          name="closeOutcome"
          defaultValue={closeOutcome}
          required
          className="mt-1 w-full border border-line bg-paper px-3 py-2"
        >
          <option value="">Select outcome</option>
          {CLOSE_OUTCOMES.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        What action we took
        <textarea
          name="closeSummary"
          defaultValue={closeSummary}
          required
          rows={6}
          placeholder="Who we spoke to, what work was done, ticket numbers, and how we verified it on the ground."
          className="mt-1 w-full border border-line bg-paper px-3 py-2"
        />
      </label>
      <label className="block text-sm">
        Proofs of closure {proofCount ? `(${proofCount} already on file)` : "(at least one required)"}
        <input type="file" name="proofs" accept={FILE_ACCEPT} multiple className="mt-1 block" />
      </label>
      {error ? <p className="text-clay">{error}</p> : null}
      <button type="submit" disabled={busy} className="border border-moss bg-moss px-5 py-2 text-paper">
        {busy ? "Closing…" : proofCount && closeSummary ? "Update close-out" : "Close case with proofs"}
      </button>
    </form>
  );
}
