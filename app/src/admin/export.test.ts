import { expect, test } from 'vitest';
import * as XLSX from 'xlsx';
import { construireClasseur, type ExportDonnees } from './export';

const fiche = (id: string, dab: string) => ({
  id, dab_code: dab, banque: 'BGFI', agence: 'Centre', ville: 'Brazzaville', statut: 'terminee',
  arrivee_at: '2026-12-01T08:00:00Z', depart_at: '2026-12-01T10:00:00Z', douteux: false, raisons: [], sans_signature: false,
  identification: { numero_serie: 'SN' }, systeme: { logiciel: 'ProTopas' }, cloture: { tension_phase_neutre: '230' },
});
const d: ExportDonnees = {
  fiches: [fiche('f1', 'DAB-1'), fiche('f2', 'DAB-2')],
  reponses: [{ fiche_id: 'f1', item_id: 'CHK-P101', libelle: 'PC', valeur: 'OK' }],
  etats: [{ fiche_id: 'f1', module: 'Distributeur', etat: 'Use', commentaire: 'usé' }],
  pieces: [{ fiche_id: 'f1', module: 'Distributeur', pn: '0175', pn_libre: null, quantite: 2 },
           { fiche_id: 'f2', module: 'Distributeur', pn: '0175', pn_libre: null, quantite: 1 }],
  articles: [{ pn: '0175', designation: 'Courroie' }],
};

test('six onglets aux noms exacts', () => {
  expect(construireClasseur(d).SheetNames).toEqual(['Fiches', 'Preventif', 'Mecanique', 'Systeme', 'Cloture', 'Pieces_a_prevoir']);
});

test('pièces consolidées par PN', () => {
  const lignes = XLSX.utils.sheet_to_json<Record<string, unknown>>(construireClasseur(d).Sheets.Pieces_a_prevoir);
  expect(lignes).toEqual([{ PN: '0175', 'Désignation': 'Courroie', 'Quantité totale': 3, 'Nombre de DAB': 2 }]);
});

test('dates en vraies dates Excel et durée en minutes', () => {
  const ws = construireClasseur(d).Sheets.Fiches;
  const ligne = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws)[0];
  expect(ligne['Durée (min)']).toBe(120);
  const cellule = Object.entries(ws).find(([k, v]) => /^[A-Z]+2$/.test(k) && (v as XLSX.CellObject).t === 'd');
  expect(cellule).toBeDefined();
});
