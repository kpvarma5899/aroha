"use client";

import dynamic from "next/dynamic";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { compactGeocodeHit, type GeocodeHit } from "@/lib/address";

const MapPicker = dynamic(() => import("./MapPicker"), { ssr: false });

const HYD = { lat: 17.385, lng: 78.4867 };

export type LocationValue = {
  lat: number;
  lng: number;
  located: boolean;
  address: string;
  house: string;
  landmark: string;
};

export function composePickedAddress(value: LocationValue): string {
  return [value.house.trim(), value.landmark.trim() ? `near ${value.landmark.trim()}` : "", value.address]
    .filter(Boolean)
    .join(", ");
}

export function LocationPicker({
  value,
  onChange,
}: {
  value: LocationValue;
  onChange: (next: LocationValue) => void;
}) {
  const listId = useId();
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<GeocodeHit[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");
  const [active, setActive] = useState(0);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 3) {
      setHits([]);
      setSearching(false);
      return;
    }
    const timer = window.setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
        const data = (await res.json()) as { results?: GeocodeHit[]; error?: string };
        setHits(data.results ?? []);
        setActive(0);
        setOpen(true);
        if (!res.ok && data.error) setError(data.error);
        else setError("");
      } finally {
        setSearching(false);
      }
    }, 280);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    function close(event: MouseEvent) {
      if (box.current && !box.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  async function reverse(lat: number, lng: number) {
    const res = await fetch(`/api/geocode?lat=${lat}&lng=${lng}`);
    const data = (await res.json()) as { address?: string };
    onChange({
      ...value,
      lat,
      lng,
      located: true,
      address: data.address || `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
    });
  }

  function pick(hit: GeocodeHit) {
    setQuery(hit.label);
    setOpen(false);
    setError("");
    onChange({
      ...value,
      lat: hit.lat,
      lng: hit.lng,
      located: true,
      address: hit.address,
    });
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setError("This browser cannot share your location. Search for the area instead.");
      return;
    }
    setLocating(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          await reverse(pos.coords.latitude, pos.coords.longitude);
        } finally {
          setLocating(false);
        }
      },
      () => {
        setLocating(false);
        setError("Could not read your location. Allow location access, or search for the area.");
      },
      { enableHighAccuracy: true, timeout: 12000 },
    );
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!open || hits.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((i) => (i + 1) % hits.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((i) => (i - 1 + hits.length) % hits.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      pick(hits[active]);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  const showList = open && query.trim().length >= 3;

  return (
    <div className="space-y-4">
      <div ref={box} className="relative z-30">
        <label className="block text-sm">
          Search area or street
          <div className="mt-1 flex border border-line bg-paper">
            <span className="flex items-center px-3 text-ink/45" aria-hidden>
              ⌕
            </span>
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setOpen(true);
              }}
              onFocus={() => query.trim().length >= 3 && setOpen(true)}
              onKeyDown={onKeyDown}
              placeholder="e.g. Banjara Hills Road No. 12, Gachibowli, 500034"
              className="min-h-12 w-full bg-transparent py-3 pr-3 outline-none"
              autoComplete="off"
              role="combobox"
              aria-expanded={showList}
              aria-controls={listId}
              aria-autocomplete="list"
            />
          </div>
        </label>

        {showList ? (
          <ul
            id={listId}
            role="listbox"
            className="mt-2 max-h-[22rem] overflow-y-auto border border-line bg-paper"
          >
            {searching ? (
              <li className="px-4 py-4 text-sm text-ink/55">Searching Hyderabad…</li>
            ) : null}
            {!searching && hits.length === 0 ? (
              <li className="px-4 py-4 text-sm text-ink/60">
                No matching street or area. Try a landmark, colony name, or pincode.
              </li>
            ) : null}
            {hits.map((hit, index) => {
              const compact = compactGeocodeHit(hit);
              const detail = hit.detail || compact.detail;
              const selected = index === active;
              return (
                <li key={`${hit.lat}-${hit.lng}-${hit.label}`} role="option" aria-selected={selected}>
                  <button
                    type="button"
                    className={`flex w-full items-start gap-4 border-b border-line px-4 py-4 text-left last:border-b-0 ${
                      selected ? "bg-paper-2" : "hover:bg-paper-2"
                    }`}
                    onMouseEnter={() => setActive(index)}
                    onClick={() => pick(hit)}
                  >
                    <span className="mt-0.5 shrink-0 text-moss" aria-hidden>
                      ⌖
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-base font-medium leading-snug">{compact.title}</span>
                      <span className="mt-1 block text-sm leading-relaxed text-ink/65">{detail}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>

      <button
        type="button"
        onClick={useCurrentLocation}
        className="text-sm text-moss underline"
        disabled={locating}
      >
        {locating ? "Finding you…" : "Use current location"}
      </button>
      {error && !showList ? <p className="text-sm text-clay">{error}</p> : null}

      <div className="relative z-0 overflow-hidden border border-line">
        <MapPicker
          lat={value.located ? value.lat : HYD.lat}
          lng={value.located ? value.lng : HYD.lng}
          onChange={(lat, lng) => {
            void reverse(lat, lng);
          }}
        />
        {value.located ? (
          <div className="pointer-events-none absolute inset-x-3 bottom-3 z-[500] border border-line bg-paper/95 p-3">
            <p className="text-xs uppercase tracking-[0.16em] text-moss">Delivering the case here</p>
            <p className="mt-1 text-sm font-medium leading-snug">{value.address}</p>
            <p className="font-mono text-[11px] text-ink/45">
              {value.lat.toFixed(6)}, {value.lng.toFixed(6)}
            </p>
          </div>
        ) : (
          <div className="pointer-events-none absolute inset-x-3 bottom-3 z-[500] border border-line bg-paper/95 p-3 text-sm text-ink/70">
            Pick a suggestion above, or drag the pin onto the exact spot.
          </div>
        )}
      </div>

      {value.located ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            House / flat / shop (optional)
            <input
              value={value.house}
              onChange={(e) => onChange({ ...value, house: e.target.value })}
              placeholder="e.g. Flat 402"
              className="mt-1 w-full border border-line bg-paper px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            Landmark (optional)
            <input
              value={value.landmark}
              onChange={(e) => onChange({ ...value, landmark: e.target.value })}
              placeholder="e.g. opposite GVK One"
              className="mt-1 w-full border border-line bg-paper px-3 py-2"
            />
          </label>
        </div>
      ) : null}
    </div>
  );
}
