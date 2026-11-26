import { describe, expect, it } from 'vitest';
import { resumerValidation } from './validation';

describe('compte rendu de la validation', () => {
  it('dit en français ce qui a été appliqué au DAB', () => {
    expect(resumerValidation({ appliquees: ['code_banque', 'banque', 'agence'], non_appliquees: [] }))
      .toEqual({ appliquees: 'Appliqué au DAB : code de la banque, banque, agence.', nonAppliquees: [] });
  });
  it("dit qu'il n'y avait rien à changer", () => {
    expect(resumerValidation({ appliquees: [], non_appliquees: [] }).appliquees).toBe('Aucune correction à appliquer au DAB.');
  });
  it('remonte ce qui reste à faire à la main', () => {
    const r = resumerValidation({ appliquees: [], non_appliquees: ['banque inconnue : ZZZ', 'agence non appliquée : Ailleurs'] });
    expect(r.nonAppliquees).toEqual(['banque inconnue : ZZZ', 'agence non appliquée : Ailleurs']);
  });
  it("supporte l'absence de réponse (ancienne version de la fonction)", () => {
    expect(resumerValidation(null)).toEqual({ appliquees: '', nonAppliquees: [] });
  });
});
