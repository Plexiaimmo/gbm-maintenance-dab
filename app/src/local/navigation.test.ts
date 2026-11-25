import { beforeEach, describe, expect, it } from 'vitest';
import { lireEcran, lirePartie, memoriserEcran, memoriserPartie, oublierNavigation } from './navigation';

describe('navigation mémorisée (survit à un rechargement de la page)', () => {
  beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });

  it("rouvre la fiche en cours après un rechargement", () => {
    memoriserEcran({ nom: 'fiche', ficheId: 'F1' });
    expect(lireEcran()).toEqual({ nom: 'fiche', ficheId: 'F1' });
  });

  it("rouvre le suivi et le détail d'une fiche (administrateur)", () => {
    memoriserEcran({ nom: 'detail', ficheId: 'F2' });
    expect(lireEcran()).toEqual({ nom: 'detail', ficheId: 'F2' });
    memoriserEcran({ nom: 'suivi' });
    expect(lireEcran()).toEqual({ nom: 'suivi' });
  });

  it("revient à la liste pour les écrans qui ne se rouvrent pas tels quels (arrivée, nouveau DAB)", () => {
    memoriserEcran({ nom: 'arrivee', dabId: 'D1' });
    expect(lireEcran()).toEqual({ nom: 'liste' });
    memoriserEcran({ nom: 'nouveau' });
    expect(lireEcran()).toEqual({ nom: 'liste' });
  });

  it("ignore une valeur abîmée", () => {
    localStorage.setItem('ecran', '{pas du json');
    expect(lireEcran()).toEqual({ nom: 'liste' });
    localStorage.setItem('ecran', JSON.stringify({ nom: 'fiche' }));
    expect(lireEcran()).toEqual({ nom: 'liste' });
  });

  it("retient la rubrique ouverte de chaque fiche", () => {
    memoriserPartie('F1', 3);
    memoriserPartie('F2', 5);
    expect(lirePartie('F1')).toBe(3);
    expect(lirePartie('F2')).toBe(5);
    expect(lirePartie('F3')).toBe(1);
  });

  it("ne retient pas une rubrique hors limites", () => {
    localStorage.setItem('partie:F1', '9');
    expect(lirePartie('F1')).toBe(1);
  });

  it("oublie tout à la déconnexion", () => {
    memoriserEcran({ nom: 'fiche', ficheId: 'F1' });
    memoriserPartie('F1', 4);
    oublierNavigation();
    expect(lireEcran()).toEqual({ nom: 'liste' });
    expect(lirePartie('F1')).toBe(1);
  });
});
