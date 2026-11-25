/** Code des DAB ajoutés sur le terrain : BANQUE-VILLE-AGENCE-N, jamais tapé à la main. */
export const VILLES_CODE: Record<string, string> = { Brazzaville: 'BZV', 'Pointe-Noire': 'PNR' };
export const CODE_NOUVEAU = /^[A-Z0-9]{2,8}-(BZV|PNR)-[A-Z0-9]+(-[A-Z0-9]+)*-[0-9]+$/;

export const normaliserAgence = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-+|-+$/g, '');

export function codeDab(banque: string, ville: string, agence: string, existants: string[]): string {
  const b = normaliserAgence(banque).replace(/-/g, ''), v = VILLES_CODE[ville], a = normaliserAgence(agence);
  if (!b || !v || !a) return '';
  const pris = new Set(existants.map((c) => c.toUpperCase()));
  let n = 1;
  while (pris.has(`${b}-${v}-${a}-${n}`)) n++;
  return `${b}-${v}-${a}-${n}`;
}
