"use client";

import type { ResolvedContact } from "@/lib/types";
import { PersonPhoto } from "./PersonPhoto";

function telHref(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length === 11 && digits.startsWith("0")) return `tel:+91${digits.slice(1)}`;
  if (digits.length === 10) return `tel:+91${digits}`;
  if (digits.startsWith("91") && digits.length >= 12) return `tel:+${digits}`;
  return `tel:${digits}`;
}

export function OfficialCard({
  contact,
  mode = "display",
}: {
  contact: ResolvedContact;
  mode?: "display" | "desk";
}) {
  return (
    <article className="border border-line bg-paper p-4">
      <div className="flex gap-4">
        <PersonPhoto name={contact.name} photoUrl={contact.photoUrl} photoSource={contact.photoSource} />
        <div className="min-w-0 flex-1">
          <p className="text-xs uppercase tracking-[0.16em] text-moss">{contact.role}</p>
          <h3 className="mt-1 font-serif text-xl leading-tight">{contact.name}</h3>
          <p className="mt-1 text-sm text-ink/80">
            {contact.agency}
            {contact.party ? ` · ${contact.party}` : ""}
          </p>
        </div>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-ink/80">{contact.reason}</p>
      {mode === "desk" ? (
        <div className="mt-3 space-y-1 text-sm">
          {contact.phones.map((phone) => (
            <p key={phone}>
              <a href={telHref(phone)} className="underline">
                {phone}
              </a>
            </p>
          ))}
          {contact.emails.map((email) => (
            <p key={email}>
              <a href={`mailto:${email}`} className="underline">
                {email}
              </a>
            </p>
          ))}
          {contact.portalUrl ? (
            <p>
              <a href={contact.portalUrl} className="underline" target="_blank" rel="noreferrer">
                Official page
              </a>
            </p>
          ) : null}
          {contact.twitterHandle ? (
            <p>
              <a
                href={`https://x.com/${contact.twitterHandle.replace(/^@/, "")}`}
                className="underline"
                target="_blank"
                rel="noreferrer"
              >
                @{contact.twitterHandle.replace(/^@/, "")}
              </a>
            </p>
          ) : null}
        </div>
      ) : null}
      <p className="mt-3 text-xs leading-relaxed text-ink/50">
        Source:{" "}
        <a href={contact.sourceUrl} className="underline" target="_blank" rel="noreferrer">
          {contact.sourceLabel}
        </a>
        {contact.photoSource ? " · Portrait from Wikimedia / Wikipedia" : ""}
      </p>
    </article>
  );
}
