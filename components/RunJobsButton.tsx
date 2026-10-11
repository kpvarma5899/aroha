"use client";

import { useState } from "react";

export function RunJobsButton() {
  const [summary, setSummary] = useState("");
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    const res = await fetch("/api/jobs/tick", { method: "POST" });
    const data = (await res.json()) as { summary?: string; error?: string };
    setSummary(data.summary || data.error || "Done");
    setBusy(false);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button type="button" onClick={run} disabled={busy} className="border border-line px-3 py-1.5 text-sm">
        {busy ? "Running…" : "Run daily jobs"}
      </button>
      {summary ? <span className="text-xs text-ink/60">{summary}</span> : null}
    </div>
  );
}
