import { estAbandonnee } from './completude';
import type { ChecklistItem, Dab, Fiche, FicheComplete } from './types';

export type StatutDab = Fiche['statut'] | 'a_visiter';

/** Statut d'un DAB pour la tournée : celui de sa fiche la plus récente. */
type FicheTournee = Pick<Fiche, 'dab_id' | 'statut' | 'arrivee_at'> & { identification?: { visite_impossible?: string } };
export function statutDab(dabId: string, fiches: FicheTournee[]): StatutDab {
  const f = fiches.filter((x) => x.dab_id === dabId && !estAbandonnee(x)).sort((a, b) => b.arrivee_at.localeCompare(a.arrivee_at))[0];
  return f ? f.statut : 'a_visiter';
}

export function avancementTournee(dabs: Pick<Dab, 'id'>[], fiches: FicheTournee[]) {
  const r = { total: dabs.length, releves: 0, enCours: 0, aReprendre: 0, aVisiter: 0 };
  for (const d of dabs) {
    const s = statutDab(d.id, fiches);
    if (s === 'terminee' || s === 'validee') r.releves++;
    else if (s === 'brouillon') r.enCours++;
    else if (s === 'renvoyee') r.aReprendre++;
    else r.aVisiter++;
  }
  return r;
}

/** Ce que le consultant relit avant de terminer : points pas OK, pièces à prévoir, photos (hors signature), n° de série. */
export function recapitulatif(fc: FicheComplete, items: Pick<ChecklistItem, 'id' | 'libelle'>[], nomsPieces: Map<string, string>) {
  return {
    pasOk: fc.reponses.filter((r) => r.valeur === 'NOK').map((r) => items.find((i) => i.id === r.item_id)?.libelle ?? r.item_id),
    pieces: fc.pieces.filter((p) => !p.supprimee && p.quantite > 0)
      .map((p) => `${p.quantite} × ${(p.pn && nomsPieces.get(p.pn)) || p.pn || p.pn_libre}`),
    photos: fc.photos.filter((p) => p.cible !== 'signature').length,
    numeroSerie: fc.fiche.identification.numero_serie ?? '',
  };
}

const PRIORITE: Record<StatutDab, number> = { renvoyee: 0, brouillon: 1, a_visiter: 2, terminee: 3, validee: 3 };

/** Range la liste pour la tournée : à reprendre, en cours, puis à visiter (par agence) ; les DAB déjà relevés à part. */
export function rangerTournee<T extends { code: string; agence: string; statut: StatutDab }>(lignes: T[]) {
  const tri = [...lignes].sort((a, b) => PRIORITE[a.statut] - PRIORITE[b.statut]
    || a.agence.localeCompare(b.agence, 'fr') || a.code.localeCompare(b.code, 'fr'));
  return { aTraiter: tri.filter((l) => PRIORITE[l.statut] < 3), releves: tri.filter((l) => PRIORITE[l.statut] === 3) };
}
