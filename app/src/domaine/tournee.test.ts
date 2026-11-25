import { expect, test } from 'vitest';
import { avancementTournee, recapitulatif, statutDab } from './tournee';
import type { ChecklistItem, Dab, Fiche, FicheComplete } from './types';

const dab = (id: string): Dab => ({ id, code: id, site_id: null, marque: null, modele: null, numero_serie: null, ville: null, origine: 'reference' });
const fiche = (id: string, dab_id: string, statut: Fiche['statut'], arrivee_at: string) =>
  ({ id, dab_id, statut, arrivee_at }) as Fiche;

test('statut d\'un DAB : celui de sa fiche la plus récente, sinon à visiter', () => {
  const f = [fiche('a', 'd1', 'renvoyee', '2026-12-01T08:00:00Z'), fiche('b', 'd1', 'brouillon', '2026-12-02T08:00:00Z')];
  expect(statutDab('d1', f)).toBe('brouillon');
  expect(statutDab('d2', f)).toBe('a_visiter');
});

test('avancement : terminée ou validée comptent comme relevées, les autres par statut', () => {
  const dabs = ['d1', 'd2', 'd3', 'd4', 'd5'].map(dab);
  const f = [fiche('a', 'd1', 'terminee', '2026-12-01T08:00:00Z'), fiche('b', 'd2', 'validee', '2026-12-01T09:00:00Z'),
    fiche('c', 'd3', 'brouillon', '2026-12-01T10:00:00Z'), fiche('d', 'd4', 'renvoyee', '2026-12-01T11:00:00Z')];
  expect(avancementTournee(dabs, f)).toEqual({ total: 5, releves: 2, enCours: 1, aReprendre: 1, aVisiter: 1 });
});

test('récapitulatif de fin de fiche : points pas OK, pièces avec leur nom, photos et n° de série', () => {
  const items = [{ id: 'P1', libelle: 'Courroie du lecteur' }, { id: 'P2', libelle: 'Ventilateurs' }] as ChecklistItem[];
  const fc = {
    fiche: { identification: { numero_serie: '53100412' } },
    reponses: [{ item_id: 'P1', valeur: 'NOK' }, { item_id: 'P2', valeur: 'OK' }],
    pieces: [{ module: 'Imprimantes', pn: '1750186288', quantite: 1 }, { module: 'PC', pn_libre: 'Ventilateur 80 mm', quantite: 2 },
      { module: 'PC', pn: 'X', quantite: 1, supprimee: true }],
    photos: [{ cible: 'plaque' }, { cible: 'ticket' }, { cible: 'signature' }],
  } as unknown as FicheComplete;
  const noms = new Map([['1750186288', 'TP07 Receipt Printer (USB)']]);
  expect(recapitulatif(fc, items, noms)).toEqual({
    pasOk: ['Courroie du lecteur'],
    pieces: ['1 × TP07 Receipt Printer (USB)', '2 × Ventilateur 80 mm'],
    photos: 2, numeroSerie: '53100412',
  });
});

test('ordre de la liste : en cours et à reprendre d\'abord, puis à visiter par agence, les relevés à part', async () => {
  const { rangerTournee } = await import('./tournee');
  const l = (code: string, agence: string, statut: string) => ({ code, agence, statut: statut as never });
  const r = rangerTournee([l('D5', 'Nova', 'terminee'), l('D1', 'Poto-Poto', 'a_visiter'), l('D2', 'Bacongo', 'a_visiter'),
    l('D3', 'Zz', 'renvoyee'), l('D4', 'Aa', 'brouillon'), l('D6', 'Bacongo', 'validee')]);
  expect(r.aTraiter.map((x) => x.code)).toEqual(['D3', 'D4', 'D2', 'D1']);
  expect(r.releves.map((x) => x.code)).toEqual(['D6', 'D5']);
});
