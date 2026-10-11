"use client";

import { useState } from "react";
import { initialsFor, portraitFor } from "@/lib/portraits";

export function PersonPhoto({
  name,
  photoUrl,
  photoSource,
  size = "md",
}: {
  name: string;
  photoUrl?: string | null;
  photoSource?: string | null;
  size?: "sm" | "md" | "lg";
}) {
  const portrait = portraitFor(name, photoUrl, photoSource);
  const [broken, setBroken] = useState(false);
  const dim = size === "lg" ? "h-28 w-28" : size === "sm" ? "h-14 w-14" : "h-20 w-20";
  const show = portrait?.photoUrl && !broken;

  if (show) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={portrait.photoUrl}
        alt={name}
        referrerPolicy="no-referrer"
        onError={() => setBroken(true)}
        className={`${dim} shrink-0 border border-line object-cover object-top`}
      />
    );
  }

  return (
    <div
      className={`${dim} flex shrink-0 items-center justify-center bg-moss text-paper`}
      aria-hidden
    >
      <span className={size === "lg" ? "text-2xl" : "text-lg"}>{initialsFor(name)}</span>
    </div>
  );
}
