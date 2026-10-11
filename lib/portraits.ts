import portraitsFile from "@/data/officials/portraits.json";

export type Portrait = {
  photoUrl: string;
  photoSource: string;
  photoSourceLabel: string;
};

type PortraitEntry = Portrait & { name: string; aka?: string[] };

const byName = new Map<string, Portrait>();

function remember(label: string, portrait: Portrait) {
  const key = label.trim().toLowerCase();
  if (key) byName.set(key, portrait);
}

for (const entry of Object.values(portraitsFile.portraits) as PortraitEntry[]) {
  const portrait: Portrait = {
    photoUrl: entry.photoUrl,
    photoSource: entry.photoSource,
    photoSourceLabel: entry.photoSourceLabel,
  };
  remember(entry.name, portrait);
  for (const alias of entry.aka ?? []) remember(alias, portrait);
}

export function portraitFor(name: string, photoUrl?: string | null, photoSource?: string | null): Portrait | null {
  if (photoUrl) {
    return {
      photoUrl,
      photoSource: photoSource || "",
      photoSourceLabel: photoSource ? "Sourced portrait" : "",
    };
  }
  return byName.get(name.trim().toLowerCase()) ?? null;
}

export function initialsFor(name: string): string {
  const parts = name
    .replace(/Sri |Smt |,\s*IAS/gi, "")
    .split(/[\s.]+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 1 && !/^(the|and|of)$/i.test(part));
  const letters = parts.slice(0, 2).map((part) => part[0]?.toUpperCase() || "").join("");
  return letters || name.slice(0, 2).toUpperCase();
}
