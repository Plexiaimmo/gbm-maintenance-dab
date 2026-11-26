/** Code des DAB ajoutés sur le terrain : BANQUE-VILLE-AGENCE-N, jamais tapé à la main. */
export const VILLES_CODE: Record<string, string> = {
  Brazzaville: 'BZV', 'Pointe-Noire': 'PNR', Dolisie: 'DLS', Nkayi: 'NKY', Ouesso: 'OUE', Owando: 'OWD', Oyo: 'OYO',
  Impfondo: 'IMP', Madingou: 'MDG', Sibiti: 'SBT', Kinkala: 'KKL', Djambala: 'DJB', Ewo: 'EWO', Gamboma: 'GMB',
  Mossendjo: 'MSJ', Makoua: 'MKA', Loandjili: 'LDJ', Mouyondzi: 'MYD', Boko: 'BKO', Ngo: 'NGO',
};
/** Villes proposées d'emblée sur le terrain (les autres se saisissent avec « Autre ville »). */
export const VILLES_PRINCIPALES = ['Brazzaville', 'Pointe-Noire', 'Dolisie', 'Nkayi', 'Ouesso', 'Owando', 'Oyo', 'Impfondo'];
export const CODE_NOUVEAU = /^[A-Z0-9]{2,8}-[A-Z]{3}-[A-Z0-9]+(-[A-Z0-9]+)*-[0-9]+$/;

export const normaliserAgence = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-+|-+$/g, '');

/** Code de ville sur 3 lettres : celui de la table si la ville est connue, sinon les 3 premières lettres. */
export function codeVille(ville: string): string {
  const v = ville.trim();
  const connu = Object.entries(VILLES_CODE).find(([nom]) => normaliserAgence(nom) === normaliserAgence(v));
  if (connu) return connu[1];
  const lettres = normaliserAgence(v).replace(/[^A-Z]/g, '');
  return lettres.length >= 3 ? lettres.slice(0, 3) : '';
}

/** Villes à proposer : Brazzaville et Pointe-Noire d'abord, puis les autres villes déjà présentes, par ordre alphabétique. */
export function villesConnues(villes: (string | null | undefined)[]): string[] {
  const autres = [...new Set(villes.map((v) => (v ?? '').trim()).filter((v) => v && v !== 'Brazzaville' && v !== 'Pointe-Noire'))]
    .sort((a, b) => a.localeCompare(b, 'fr'));
  return ['Brazzaville', 'Pointe-Noire', ...autres];
}

export function codeDab(banque: string, ville: string, agence: string, existants: string[]): string {
  const b = normaliserAgence(banque).replace(/-/g, '').slice(0, 8), v = codeVille(ville), a = normaliserAgence(agence);
  if (b.length < 2 || !v || !a) return '';
  const pris = new Set(existants.map((c) => c.toUpperCase()));
  let n = 1;
  while (pris.has(`${b}-${v}-${a}-${n}`)) n++;
  return `${b}-${v}-${a}-${n}`;
}

/** Nom de ville saisi à la main : l'orthographe déjà connue si elle existe, sinon la saisie avec une majuscule initiale. */
export function nomVille(saisie: string, connues: string[]): string {
  const s = saisie.trim().replace(/\s+/g, ' ');
  if (!s) return '';
  const cle = normaliserAgence(s);
  const trouvee = [...connues, ...Object.keys(VILLES_CODE)].find((v) => normaliserAgence(v) === cle);
  return trouvee ?? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}
