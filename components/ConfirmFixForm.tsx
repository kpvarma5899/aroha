"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export function ConfirmFixForm({
  caseRef,
  title,
  lead,
  yes,
  no,
  photo,
}: {
  caseRef: string;
  title: string;
  lead: string;
  yes: string;
  no: string;
  photo: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const kind = submitter?.value === "still_broken" ? "still_broken" : "fixed";
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    form.set("kind", kind);
    const res = await fetch(`/api/case/${encodeURIComponent(caseRef)}/confirm`, { method: "POST", body: form });
    const data = (await res.json()) as { error?: string };
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Could not save.");
      return;
    }
    router.refresh();
  }

  return (
    <form className="mt-4 space-y-3 border border-line bg-paper-2 p-5" onSubmit={onSubmit}>
      <h2 className="font-serif text-2xl">{title}</h2>
      <p className="text-sm text-ink/70">{lead}</p>
      <label className="block text-sm">
        Note
        <textarea name="note" rows={3} className="mt-1 w-full border border-line bg-paper px-3 py-2" />
      </label>
      <label className="block text-sm">
        {photo}
        <input type="file" name="files" accept="image/jpeg,image/png,image/webp" multiple className="mt-1 block" />
      </label>
      {error ? <p className="text-clay">{error}</p> : null}
      <div className="flex flex-wrap gap-3">
        <button type="submit" name="kind" value="fixed" disabled={busy} className="border border-moss bg-moss px-4 py-2 text-paper">
          {yes}
        </button>
        <button type="submit" name="kind" value="still_broken" disabled={busy} className="border border-line px-4 py-2">
          {no}
        </button>
      </div>
    </form>
  );
}
