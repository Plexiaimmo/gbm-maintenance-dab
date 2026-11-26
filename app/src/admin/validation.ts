export type ResultatValidation = { appliquees: string[]; non_appliquees: string[] };

const NOMS: Record<string, string> = { code_banque: 'code de la banque', banque: 'banque', agence: 'agence' };

/** Ce que la validation a changé sur le DAB, et ce qu'il reste à faire à la main. */
export function resumerValidation(r: ResultatValidation | null | undefined): { appliquees: string; nonAppliquees: string[] } {
  if (!r) return { appliquees: '', nonAppliquees: [] };
  return {
    appliquees: r.appliquees.length ? `Appliqué au DAB : ${r.appliquees.map((a) => NOMS[a] ?? a).join(', ')}.` : 'Aucune correction à appliquer au DAB.',
    nonAppliquees: r.non_appliquees,
  };
}
