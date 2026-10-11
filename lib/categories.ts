import categoriesData from "@/data/routing/categories.json";
import type { CategoryId } from "./types";
import type { Locale } from "./i18n";

export type CategoryOption = { id: CategoryId; label: string; labelTe?: string };

export const CATEGORIES: CategoryOption[] = categoriesData.categories.map((c) => ({
  id: c.id as CategoryId,
  label: c.label,
  labelTe: "labelTe" in c ? String(c.labelTe) : undefined,
}));

export function getCategoryLabel(id: string, locale: Locale | string = "en"): string {
  const row = CATEGORIES.find((c) => c.id === id);
  if (!row) return id;
  if (locale === "te" && row.labelTe) return row.labelTe;
  return row.label;
}
