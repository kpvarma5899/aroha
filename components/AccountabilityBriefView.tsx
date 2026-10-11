import type { AccountabilityBrief, ResolvedContact } from "@/lib/types";
import { ContactRoster } from "./ContactRoster";

export function AccountabilityBriefView({
  brief,
  contacts,
  mode = "display",
  showRoster = true,
}: {
  brief: AccountabilityBrief;
  contacts: ResolvedContact[];
  mode?: "display" | "desk";
  showRoster?: boolean;
}) {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.16em] text-moss">Who owns this</p>
        <p className="mt-2 text-sm leading-relaxed text-ink/80">{brief.summary}</p>
      </div>
      {showRoster ? <ContactRoster contacts={contacts} mode={mode} /> : null}
    </div>
  );
}
