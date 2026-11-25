export interface DabSuivi { id: string; code: string; ville: string | null; site_id: string | null; banque: string; agence: string; nouveau?: boolean }
export interface FicheSuivi { id: string; dab_id: string; statut: string; arrivee_at: string; [k: string]: unknown }
export interface Signal { fiche_id: string; douteux: boolean; raisons: string[]; sans_signature: boolean }
export interface LigneSuivi { dab: DabSuivi; fiche?: FicheSuivi; signal?: Signal; nbFiches: number }

/** Une ligne par DAB avec sa dernière fiche, et les compteurs de l'écran de suivi. */
export function resumerSuivi(dabs: DabSuivi[], fiches: FicheSuivi[], signaux: Signal[]) {
  const lignes: LigneSuivi[] = dabs.map((dab) => {
    const siennes = fiches.filter((f) => f.dab_id === dab.id).sort((a, b) => b.arrivee_at.localeCompare(a.arrivee_at));
    const fiche = siennes[0];
    return { dab, fiche, signal: fiche && signaux.find((s) => s.fiche_id === fiche.id), nbFiches: siennes.length };
  });
  const visite = (l: LigneSuivi) => !!l.fiche && l.fiche.statut !== 'brouillon';
  return {
    lignes,
    compteurs: {
      total: lignes.length,
      visites: lignes.filter(visite).length,
      restants: lignes.filter((l) => !visite(l)).length,
      douteux: lignes.filter((l) => l.signal?.douteux).length,
      sans_signature: lignes.filter((l) => l.signal?.sans_signature).length,
      a_valider: lignes.filter((l) => l.fiche?.statut === 'terminee').length,
    },
  };
}
