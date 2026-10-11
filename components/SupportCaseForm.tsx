"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SupportCaseForm({
  caseRef,
  title,
  lead,
  action,
}: {
  caseRef: string;
  title: string;
  lead: string;
  action: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function send() {
    setBusy(true);
    await fetch(`/api/case/${encodeURIComponent(caseRef)}/support`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    setBusy(false);
    setDone(true);
    router.refresh();
  }

  return (
    <div className="border border-line p-5">
      <h2 className="font-serif text-2xl">{title}</h2>
      <p className="mt-2 text-sm text-ink/70">{lead}</p>
      <button
        type="button"
        disabled={busy || done}
        onClick={send}
        className="mt-4 border border-moss px-4 py-2 disabled:opacity-50"
      >
        {done ? "Logged" : action}
      </button>
    </div>
  );
}
