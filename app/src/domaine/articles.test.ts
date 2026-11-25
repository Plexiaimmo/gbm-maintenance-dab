import { describe, expect, it } from 'vitest';
import { chercherArticles } from './articles';

const A = [
  { pn: '01750000000', designation: 'Courroie de transport' },
  { pn: '01750123456', designation: 'Rouleau entraîneur' },
  { pn: '01750999999', designation: null },
  { pn: '01770000001', designation: 'Capteur photosensor' },
];

describe('recherche de pièce dans le catalogue', () => {
  it('trouve par morceau de numéro (PN)', () => expect(chercherArticles(A, '0175').map((a) => a.pn)).toEqual(['01750000000', '01750123456', '01750999999']));
  it('trouve par nom, sans tenir compte des majuscules ni des accents', () => {
    expect(chercherArticles(A, 'ENTRAINEUR').map((a) => a.pn)).toEqual(['01750123456']);
    expect(chercherArticles(A, 'courroie').map((a) => a.pn)).toEqual(['01750000000']);
  });
  it("ne renvoie rien tant qu'on n'a pas tapé au moins 2 caractères", () => {
    expect(chercherArticles(A, '')).toEqual([]);
    expect(chercherArticles(A, '0')).toEqual([]);
  });
  it('limite le nombre de propositions', () => expect(chercherArticles(A, '01', 2)).toHaveLength(2));
  it('renvoie une liste vide si rien ne correspond', () => expect(chercherArticles(A, 'zzz')).toEqual([]));
});
