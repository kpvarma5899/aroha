"use client";

import { useEffect, useRef, useState } from "react";
import type { AddressParts, GeocodeHit } from "@/lib/address";
import { composeAddress, isAddressReady } from "@/lib/address";

export function AddressFields({
  parts,
  onChange,
  onPick,
}: {
  parts: AddressParts;
  onChange: (parts: AddressParts) => void;
  onPick: (hit: GeocodeHit) => void;
}) {
  const [suggestions, setSuggestions] = useState<GeocodeHit[]>([]);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  const query = [parts.house, parts.street, parts.area, parts.landmark, parts.pincode]
    .map((value) => value.trim())
    .filter(Boolean)
    .join(", ");

  useEffect(() => {
    if (query.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    const timer = window.setTimeout(async () => {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
      const data = (await res.json()) as { results?: GeocodeHit[] };
      setSuggestions(data.results ?? []);
      setOpen(true);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    function close(event: MouseEvent) {
      if (box.current && !box.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  function set(field: keyof AddressParts, value: string) {
    onChange({ ...parts, [field]: value });
  }

  return (
    <div ref={box} className="space-y-3">
      <label className="block text-sm">
        House / flat / plot
        <input
          value={parts.house}
          onChange={(e) => set("house", e.target.value)}
          placeholder="e.g. Flat 402, Plot 12"
          className="mt-1 w-full border border-line bg-paper px-3 py-2"
        />
      </label>
      <label className="block text-sm">
        Street / colony
        <input
          value={parts.street}
          onChange={(e) => set("street", e.target.value)}
          placeholder="e.g. Road No. 12"
          className="mt-1 w-full border border-line bg-paper px-3 py-2"
        />
      </label>
      <label className="block text-sm">
        Area / locality
        <input
          value={parts.area}
          onChange={(e) => set("area", e.target.value)}
          placeholder="e.g. Banjara Hills, Kukatpally, Charminar"
          className="mt-1 w-full border border-line bg-paper px-3 py-2"
          required
        />
      </label>
      <label className="block text-sm">
        Landmark
        <input
          value={parts.landmark}
          onChange={(e) => set("landmark", e.target.value)}
          placeholder="e.g. near GVK One"
          className="mt-1 w-full border border-line bg-paper px-3 py-2"
        />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm">
          City
          <input value="Hyderabad" readOnly className="mt-1 w-full border border-line bg-paper-2 px-3 py-2 text-ink/70" />
        </label>
        <label className="block text-sm">
          Pincode
          <input
            inputMode="numeric"
            maxLength={6}
            value={parts.pincode}
            onChange={(e) => set("pincode", e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="500034"
            className="mt-1 w-full border border-line bg-paper px-3 py-2"
          />
        </label>
      </div>

      {open && suggestions.length > 0 ? (
        <ul className="border border-line bg-paper">
          {suggestions.map((hit) => (
            <li key={`${hit.lat}-${hit.lng}-${hit.label}`}>
              <button
                type="button"
                className="w-full px-3 py-2 text-left text-sm hover:bg-paper-2"
                onClick={() => {
                  onPick(hit);
                  setOpen(false);
                }}
              >
                <span className="block font-medium">{hit.label}</span>
                <span className="block text-xs text-ink/60">{hit.address}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {!isAddressReady(parts) ? (
        <p className="text-sm text-ink/60">Enter a street or area so we can place this on the map.</p>
      ) : (
        <p className="text-xs text-ink/55">{composeAddress(parts)}</p>
      )}
    </div>
  );
}
