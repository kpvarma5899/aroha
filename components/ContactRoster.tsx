import type { ResolvedContact } from "@/lib/types";
import { groupContacts } from "@/lib/contact-kind";
import { publicContact } from "@/lib/public-roster";
import { OfficialCard } from "./OfficialCard";

export function ContactRoster({
  contacts,
  mode = "display",
}: {
  contacts: ResolvedContact[];
  mode?: "display" | "desk";
}) {
  const shown = mode === "desk" ? contacts : contacts.map(publicContact);
  const groups = groupContacts(shown);
  if (groups.length === 0) {
    return <p>No sourced department, official, or politician for this pin. We would rather show nothing than guess.</p>;
  }

  return (
    <div className="space-y-8">
      {groups.map((group) => (
        <section key={group.id}>
          <h2 className="font-serif text-2xl">{group.title}</h2>
          <p className="mt-1 text-sm text-ink/65">{group.hint}</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {group.contacts.map((contact) => (
              <OfficialCard
                key={`${contact.role}-${contact.name}-${contact.agency}`}
                contact={contact}
                mode={mode}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
