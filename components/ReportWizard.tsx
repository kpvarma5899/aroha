"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { CATEGORIES, getCategoryLabel } from "@/lib/categories";
import { isSensitiveCategory } from "@/lib/policy";
import { displayPhone, normalizePhone } from "@/lib/phone";
import type { Locale, Messages } from "@/lib/i18n";
import { interpolate } from "@/lib/i18n";
import type { AccountabilityResult, CategoryId } from "@/lib/types";
import type { NearbyCase } from "@/lib/duplicates";
import { AccountabilityBriefView } from "./AccountabilityBriefView";
import { composePickedAddress, LocationPicker, type LocationValue } from "./LocationPicker";
import { CopyButton } from "./CopyButton";

const DRAFT_KEY = "accountability-report-draft-v2";
const FILE_ACCEPT =
  "image/jpeg,image/png,image/webp,image/gif,application/pdf,text/plain,text/csv,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const EMPTY_LOCATION: LocationValue = {
  lat: 17.385,
  lng: 78.4867,
  located: false,
  address: "",
  house: "",
  landmark: "",
};

type Filed = {
  caseNumber: string;
  url: string;
  token: string;
  notified: boolean;
  emailed?: boolean;
  quiet?: boolean;
  twitter?: { posted?: boolean; url?: string | null; intentUrl?: string };
};

export function ReportWizard({ locale, copy }: { locale: Locale; copy: Messages }) {
  const { data: session } = useSession();
  const [category, setCategory] = useState<CategoryId>("roads");
  const [description, setDescription] = useState("");
  const [phone, setPhone] = useState("");
  const [files, setFiles] = useState<FileList | null>(null);
  const [location, setLocation] = useState<LocationValue>(EMPTY_LOCATION);
  const [resolved, setResolved] = useState<AccountabilityResult | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [briefing, setBriefing] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [filed, setFiled] = useState<Filed | null>(null);
  const [nearby, setNearby] = useState<NearbyCase[]>([]);

  const displayAddress = location.located ? composePickedAddress(location) : "";

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (raw) {
        const draft = JSON.parse(raw) as {
          category?: CategoryId;
          description?: string;
          phone?: string;
          location?: LocationValue;
        };
        setCategory(draft.category || "roads");
        setDescription(draft.description || "");
        setPhone(draft.phone || "");
        if (draft.location) setLocation(draft.location);
      }
      const fromUrl = new URLSearchParams(window.location.search).get("category");
      if (fromUrl && CATEGORIES.some((item) => item.id === fromUrl)) {
        setCategory(fromUrl as CategoryId);
      }
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || filed) return;
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ category, description, phone, location }));
  }, [hydrated, filed, category, description, phone, location]);

  useEffect(() => {
    if (!hydrated || phone || !session?.user?.phone) return;
    setPhone(displayPhone(session.user.phone).replace("+91 ", "").replace(" ", ""));
  }, [hydrated, phone, session?.user?.phone]);

  useEffect(() => {
    if (!location.located || description.trim().length < 12) {
      setResolved(null);
      return;
    }
    const timer = window.setTimeout(async () => {
      setBriefing(true);
      setError("");
      try {
        const res = await fetch("/api/accountability", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lat: location.lat,
            lng: location.lng,
            category,
            description,
            displayAddress,
          }),
        });
        const data = (await res.json()) as AccountabilityResult & { error?: string };
        if (!res.ok) {
          setError(data.error || "Could not name who should be questioned.");
          setResolved(null);
          return;
        }
        setResolved(data);
      } finally {
        setBriefing(false);
      }
    }, 450);
    return () => window.clearTimeout(timer);
  }, [location.located, location.lat, location.lng, category, description, displayAddress]);

  useEffect(() => {
    if (!location.located) {
      setNearby([]);
      return;
    }
    const timer = window.setTimeout(async () => {
      const res = await fetch(
        `/api/public/nearby?lat=${location.lat}&lng=${location.lng}&category=${encodeURIComponent(category)}`,
      );
      const data = (await res.json()) as { cases?: NearbyCase[] };
      setNearby(data.cases ?? []);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [location.located, location.lat, location.lng, category]);

  async function submit() {
    if (!location.located || !displayAddress) {
      setError("Pick the location the way you would on a food-delivery app.");
      return;
    }
    if (description.trim().length < 12) {
      setError("Describe the problem first.");
      return;
    }
    const trimmedPhone = phone.trim();
    if (trimmedPhone && !normalizePhone(trimmedPhone)) {
      setError("Enter a valid 10-digit Indian mobile number, or leave it blank to stay anonymous.");
      return;
    }
    if (!resolved?.inCoverage) {
      setError("This address is outside the Hyderabad metro area we currently cover.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const form = new FormData();
      form.set("lat", String(location.lat));
      form.set("lng", String(location.lng));
      form.set("displayAddress", displayAddress);
      form.set("category", category);
      form.set("description", description);
      form.set("phone", trimmedPhone);
      form.set("locale", locale);
      form.set("contacts", JSON.stringify(resolved.contacts));
      form.set("brief", JSON.stringify(resolved.brief));
      if (files) {
        Array.from(files).slice(0, 8).forEach((file) => form.append("files", file));
      }
      const res = await fetch("/api/cases", { method: "POST", body: form });
      const data = (await res.json()) as Filed & { error?: string };
      if (!res.ok || !data.caseNumber || !data.url) {
        setError(data.error || "Could not file the case.");
        return;
      }
      sessionStorage.removeItem(DRAFT_KEY);
      setFiled({
        caseNumber: data.caseNumber,
        url: data.url,
        token: data.token,
        notified: Boolean(data.notified),
        emailed: Boolean(data.emailed),
        quiet: Boolean(data.quiet),
        twitter: data.twitter,
      });
    } finally {
      setBusy(false);
    }
  }

  if (filed) {
    const shareText = `Aroha case ${filed.caseNumber}. Track it here: ${filed.url}`;
    const waShare = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    return (
      <div className="mx-auto max-w-xl px-4 py-12">
        <p className="text-xs uppercase tracking-[0.2em] text-moss">{copy.filed.kicker}</p>
        <h1 className="mt-2 font-serif text-4xl">{interpolate(copy.filed.title, { id: filed.caseNumber })}</h1>
        <p className="mt-4 text-sm leading-relaxed text-ink/75">
          {filed.notified ? copy.filed.whatsapp : copy.filed.noWhatsapp}{" "}
          {filed.quiet ? copy.filed.quiet : filed.twitter?.posted ? copy.filed.tweeted : copy.filed.deskPosts}
          {filed.emailed ? ` ${copy.filed.emailed}` : ""}
        </p>
        <p className="mt-6 break-all border border-line bg-paper-2 px-3 py-3 font-mono text-sm">{filed.url}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <CopyButton text={filed.url} label={copy.filed.copy} />
          <a href={waShare} target="_blank" rel="noreferrer" className="border border-moss bg-moss px-4 py-2 text-paper">
            {copy.filed.sendWa}
          </a>
          {!filed.quiet && filed.twitter?.posted && filed.twitter.url ? (
            <a href={filed.twitter.url} target="_blank" rel="noreferrer" className="border border-line px-4 py-2">
              {copy.filed.viewX}
            </a>
          ) : null}
          <a href={`/case/${filed.caseNumber}`} className="border border-line px-4 py-2">
            {copy.filed.open}
          </a>
        </div>
      </div>
    );
  }

  async function addVoice(caseNumber: string) {
    setBusy(true);
    setError("");
    const res = await fetch(`/api/case/${encodeURIComponent(caseNumber)}/support`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    setBusy(false);
    if (!res.ok) {
      setError("Could not add your voice to that case.");
      return;
    }
    window.location.href = `/case/${caseNumber}`;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <p className="text-xs uppercase tracking-[0.2em] text-moss">{copy.report.kicker}</p>
      <h1 className="mt-2 font-serif text-4xl">{copy.report.title}</h1>
      <p className="mt-3 text-sm leading-relaxed text-ink/70">{copy.report.lead}</p>
      {isSensitiveCategory(category) ? (
        <p className="mt-4 border border-line bg-paper-2 px-3 py-3 text-sm text-ink/75">{copy.report.sensitiveNote}</p>
      ) : null}

      <section className="mt-10 space-y-5">
        <h2 className="font-serif text-2xl">{copy.report.details}</h2>
        <label className="block text-sm">
          {copy.report.category}
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as CategoryId)}
            className="mt-1 w-full border border-line bg-paper px-3 py-2"
          >
            {CATEGORIES.map((item) => (
              <option key={item.id} value={item.id}>
                {getCategoryLabel(item.id, locale)}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          {copy.report.description}
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={7}
            className="mt-1 w-full border border-line bg-paper px-3 py-2"
            placeholder={copy.report.descriptionHint}
          />
        </label>
        <label className="block text-sm">
          {copy.report.files}
          <input
            type="file"
            accept={FILE_ACCEPT}
            multiple
            onChange={(e) => setFiles(e.target.files)}
            className="mt-1 block"
          />
          <span className="mt-1 block text-xs text-ink/55">{copy.report.filesHint}</span>
        </label>
        <label className="block text-sm">
          {copy.report.phone}
          <input
            type="tel"
            inputMode="numeric"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder={copy.report.phonePlaceholder}
            className="mt-1 w-full border border-line bg-paper px-3 py-2"
          />
        </label>
      </section>

      <section className="mt-12 space-y-4">
        <h2 className="font-serif text-2xl">{copy.report.location}</h2>
        <p className="text-sm text-ink/70">{copy.report.locationLead}</p>
        <LocationPicker value={location} onChange={setLocation} />
      </section>

      {nearby.length > 0 ? (
        <section className="mt-10 border border-line p-5">
          <h2 className="font-serif text-2xl">{copy.report.similarTitle}</h2>
          <p className="mt-2 text-sm text-ink/70">{copy.report.similarLead}</p>
          <ul className="mt-4 space-y-3 text-sm">
            {nearby.map((row) => (
              <li key={row.caseNumber} className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
                <div>
                  <p className="font-medium">
                    {row.caseNumber} · {row.meters}m · {row.supportCount} voices
                  </p>
                  <p className="text-ink/65">{row.displayAddress}</p>
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => addVoice(row.caseNumber)}
                  className="border border-moss px-3 py-1.5"
                >
                  {copy.report.addVoice}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-12">
        <h2 className="font-serif text-2xl">{copy.report.who}</h2>
        {briefing ? <p className="mt-4 text-sm text-ink/70">{copy.report.briefing}</p> : null}
        {!briefing && description.trim().length < 12 ? (
          <p className="mt-4 text-sm text-ink/60">{copy.report.needDetails}</p>
        ) : null}
        {!briefing && description.trim().length >= 12 && !location.located ? (
          <p className="mt-4 text-sm text-ink/60">{copy.report.needPin}</p>
        ) : null}
        {resolved && !briefing ? (
          <div className="mt-6">
            {resolved.jurisdictions.length > 0 ? (
              <p className="mb-6 text-sm text-ink/65">
                {resolved.jurisdictions.map((j) => j.name).join(" · ")}
              </p>
            ) : null}
            <p className="mb-6 text-sm text-ink/75">{copy.report.deskActs}</p>
            <AccountabilityBriefView brief={resolved.brief} contacts={resolved.contacts} />
          </div>
        ) : null}
      </section>

      {error ? <p className="mt-6 text-clay">{error}</p> : null}

      <div className="mt-8">
        <button
          type="button"
          disabled={busy || briefing || !resolved?.inCoverage}
          onClick={submit}
          className="border border-moss bg-moss px-6 py-2.5 text-paper disabled:opacity-50"
        >
          {busy ? copy.report.filing : nearby.length ? copy.report.fileAnyway : copy.report.file}
        </button>
      </div>
    </div>
  );
}
