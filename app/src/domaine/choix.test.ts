import { describe, expect, it } from 'vitest';
import { ecrireChoix, lireChoix, nettoyerNombre } from './choix';

const OPT = ['Courroie', 'Rouleaux', 'Capteur'];

describe('choix multiples + « Autre »', () => {
  it('relit les choix cochés et le texte « autre »', () => {
    expect(lireChoix('Courroie, capteur cassé', OPT)).toEqual({ choisis: ['Courroie'], autre: 'capteur cassé' });
    expect(lireChoix('', OPT)).toEqual({ choisis: [], autre: '' });
    expect(lireChoix(undefined, OPT)).toEqual({ choisis: [], autre: '' });
  });
  it("écrit les choix dans l'ordre de la liste, puis l'autre texte", () => {
    expect(ecrireChoix(['Capteur', 'Courroie'], '', OPT)).toBe('Courroie, Capteur');
    expect(ecrireChoix(['Rouleaux'], 'vis desserrée', OPT)).toBe('Rouleaux, vis desserrée');
    expect(ecrireChoix([], '  ', OPT)).toBe('');
  });
  it("aller-retour stable, même si l'autre texte contient une virgule", () => {
    const v = ecrireChoix(['Courroie'], 'axe tordu, vis', OPT);
    expect(lireChoix(v, OPT)).toEqual({ choisis: ['Courroie'], autre: 'axe tordu, vis' });
  });
});

describe('nombre au clavier', () => {
  it('ne garde que les chiffres et un seul séparateur décimal', () => {
    expect(nettoyerNombre('12a,5')).toBe('12.5');
    expect(nettoyerNombre('1.2.3')).toBe('1.23');
    expect(nettoyerNombre('abc')).toBe('');
    expect(nettoyerNombre('  45 ')).toBe('45');
  });
});
