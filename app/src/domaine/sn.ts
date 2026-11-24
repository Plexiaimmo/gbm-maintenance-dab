/** Numéro de série sans espaces, en majuscules ; null si vide. */
export function normaliserSN(s: string | null | undefined): string | null {
  const v = (s ?? '').replace(/\s+/g, '').toUpperCase();
  return v || null;
}
