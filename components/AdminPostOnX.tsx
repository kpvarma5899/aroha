"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AdminPostOnX({
  caseId,
  postedUrl,
  preview,
}: {
  caseId: string;
  postedUrl: string | null;
  preview: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function post() {
    setBusy(true);
    setError("");
    const res = await fetch(`/api/admin/cases/${caseId}/twitter`, { method: "POST" });
    const data = (await res.json()) as { error?: string; url?: string };
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Could not post on X.");
      return;
    }
    router.refresh();
  }

  if (postedUrl) {
    return (
      <p className="mt-2 text-sm">
        <a href={postedUrl} className="underline" target="_blank" rel="noreferrer">
          Posted on X
        </a>
      </p>
    );
  }

  return (
    <div className="mt-4 border border-line p-4">
      <p className="text-sm font-medium">Post on X (desk only)</p>
      <p className="mt-1 text-xs text-ink/60">
        Residents do not get this button. We post from here, tagging sourced handles only.
      </p>
      <textarea readOnly value={preview} rows={6} className="mt-3 w-full border border-line bg-paper p-2 font-mono text-xs" />
      {error ? <p className="mt-2 text-sm text-clay">{error}</p> : null}
      <button
        type="button"
        disabled={busy}
        onClick={post}
        className="mt-3 border border-moss px-4 py-2 text-sm disabled:opacity-50"
      >
        {busy ? "Posting…" : "Post on X"}
      </button>
    </div>
  );
}
