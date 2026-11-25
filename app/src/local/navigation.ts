/** Où l'on en est dans l'application, gardé sur la tablette : un rechargement de la page (geste « tirer pour
 *  actualiser », mise à jour de l'application, navigateur recyclé) ne doit jamais faire sortir de la fiche. */
export type EcranMemo =
  | { nom: 'suivi' } | { nom: 'detail'; ficheId: string } | { nom: 'liste' }
  | { nom: 'nouveau'; code?: string } | { nom: 'arrivee'; dabId: string } | { nom: 'fiche'; ficheId: string };

const CLE_ECRAN = 'ecran';
const NB_PARTIES = 5;
const cleePartie = (ficheId: string) => `partie:${ficheId}`;

export function memoriserEcran(e: EcranMemo) {
  try { localStorage.setItem(CLE_ECRAN, JSON.stringify(e)); } catch { /* stockage plein ou refusé : tant pis */ }
}

/** Seuls la fiche en cours et le suivi se rouvrent tels quels ; les autres écrans repartent de la liste. */
export function lireEcran(): EcranMemo {
  try {
    const e = JSON.parse(localStorage.getItem(CLE_ECRAN) ?? 'null') as { nom?: string; ficheId?: unknown } | null;
    if (e?.nom === 'suivi') return { nom: 'suivi' };
    if ((e?.nom === 'fiche' || e?.nom === 'detail') && typeof e.ficheId === 'string' && e.ficheId) return { nom: e.nom, ficheId: e.ficheId };
  } catch { /* valeur abîmée : on repart de la liste */ }
  return { nom: 'liste' };
}

export function memoriserPartie(ficheId: string, partie: number) {
  try { localStorage.setItem(cleePartie(ficheId), String(partie)); } catch { /* idem */ }
}

export function lirePartie(ficheId: string): number {
  const p = Number(localStorage.getItem(cleePartie(ficheId)));
  return Number.isInteger(p) && p >= 1 && p <= NB_PARTIES ? p : 1;
}

export function oublierNavigation() {
  localStorage.removeItem(CLE_ECRAN);
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const k = localStorage.key(i);
    if (k?.startsWith('partie:')) localStorage.removeItem(k);
  }
}
