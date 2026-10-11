export function normalizeUsername(input: string): string | null {
  const value = input.trim().toLowerCase();
  if (!/^[a-z][a-z0-9_]{2,31}$/.test(value)) return null;
  return value;
}
