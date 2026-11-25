import type { ChecklistItem, Dab, Fiche, FicheComplete } from './types';

export type StatutDab = Fiche['statut'] | 'a_visiter';

/** Statut d'un DAB pour la tournée : celui de sa fiche la plus récente. */
export function statutDab(dabId: string, fiches: Pick<Fiche, 'dab_id' | 'statut' | 'arrivee_at'>[]): StatutDab {
  const f = fiches.filter((x) => x.dab_id === dabId).sort((a, b) => b.arrivee_at.localeCompare(a.arrivee_at))[0];
  return f ? f.statut : 'a_visiter';
}

export function avancementTournee(dabs: Pick<Dab, 'id'>[], fiches: Pick<Fiche, 'dab_id' | 'statut' | 'arrivee_at'>[]) {
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
