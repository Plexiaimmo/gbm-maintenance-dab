import { describe, expect, it } from 'vitest';
import { classeCarte, tonEtat } from './etatPiece';

describe("couleur de l'état d'un module (Mécanique)", () => {
  it('Bon est vert', () => expect(tonEtat('Bon')).toBe('ok'));
  it('Usé est jaune (à surveiller)', () => expect(tonEtat('Use')).toBe('attention'));
  it('À remplacer est rouge', () => expect(tonEtat('A_remplacer')).toBe('nok'));
  it('Absent reste noir (aucune couleur)', () => expect(tonEtat('Absent')).toBe(''));
  it("la carte du module suit la même couleur, et reste neutre tant qu'on n'a pas répondu", () => {
    expect(classeCarte(undefined)).toBe('');
    expect(classeCarte('Bon')).toBe('repondu ok');
    expect(classeCarte('Use')).toBe('repondu attention');
    expect(classeCarte('A_remplacer')).toBe('repondu nok');
    expect(classeCarte('Absent')).toBe('repondu');
  });
});
