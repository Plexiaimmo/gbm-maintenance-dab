import { describe, expect, it } from 'vitest';
import { legendesPhotos } from './photos';

const items = [
  { id: 'CHK-P101', libelle: 'Dépoussiérage intérieur du PC', ordre: 10 },
  { id: 'CHK-P102', libelle: 'Ventilateurs', ordre: 20 },
];
const ph = (cible: string) => ({ cible, url: 'http://x/' + cible });

describe('photos d\'une fiche : légende et ordre de lecture', () => {
  it('donne une légende en français à chaque photo', () => {
    const r = legendesPhotos([ph('plaque'), ph('ticket'), ph('journal'), ph('antiskimming'), ph('signature'), ph('site_absent')], items);
    expect(r.map((x) => x.legende)).toEqual(['Plaque du numéro de série', "Journal d'erreurs", 'Anti-skimming', 'Ticket test', 'Signature du gestionnaire', 'Site (gestionnaire absent)']);
  });
  it('nomme les photos du préventif par le point contrôlé, et celles de la mécanique par le module', () => {
    const r = legendesPhotos([ph('module:Distributeur'), ph('item:CHK-P102')], items);
    expect(r.map((x) => x.legende)).toEqual(['Ventilateurs', 'Mécanique : Distributeur']);
  });
  it("range dans l'ordre de la fiche : identification, préventif (ordre de la liste), mécanique, système, clôture", () => {
    const r = legendesPhotos([ph('ticket'), ph('module:EPP'), ph('item:CHK-P102'), ph('plaque'), ph('item:CHK-P101'), ph('journal')], items);
    expect(r.map((x) => x.cible)).toEqual(['plaque', 'item:CHK-P101', 'item:CHK-P102', 'module:EPP', 'journal', 'ticket']);
  });
  it('garde une légende lisible pour un point inconnu, et ignore les photos sans lien', () => {
    const r = legendesPhotos([ph('item:CHK-INCONNU'), { cible: 'plaque' }], items);
    expect(r).toHaveLength(1);
    expect(r[0].legende).toBe('Point CHK-INCONNU');
  });
});
