import { describe, expect, it } from 'vitest';
import { synthese } from './synthese';
import type { ExportDonnees } from './export';

const f = (id: string, dab: string, statut: string, arrivee: string) =>
  ({ id, dab_code: dab, banque: 'B', agence: 'A', ville: 'Brazzaville', statut, arrivee_at: arrivee, douteux: false, raisons: [], sans_signature: false,
     identification: {}, systeme: {}, cloture: {} });

const donnees: ExportDonnees = {
  fiches: [
    f('f1', 'DAB-A', 'terminee', '2026-12-01T08:00:00Z'),   // ancienne visite du DAB A : remplacée par f2
    f('f2', 'DAB-A', 'validee', '2026-12-05T08:00:00Z'),
    f('f3', 'DAB-B', 'brouillon', '2026-12-02T08:00:00Z'),  // pas rendue : ignorée
    f('f4', 'DAB-C', 'terminee', '2026-12-03T08:00:00Z'),
  ],
  reponses: [
    { fiche_id: 'f2', item_id: 'CHK-1', libelle: 'Ventilateurs', valeur: 'NOK', commentaire: 'Bruyant' },
    { fiche_id: 'f4', item_id: 'CHK-1', libelle: 'Ventilateurs', valeur: 'NOK' },
    { fiche_id: 'f4', item_id: 'CHK-2', libelle: 'Courroies', valeur: 'OK' },
    { fiche_id: 'f1', item_id: 'CHK-2', libelle: 'Courroies', valeur: 'NOK' },
    { fiche_id: 'f3', item_id: 'CHK-3', libelle: 'Écran', valeur: 'NOK' },
  ],
  etats: [
    { fiche_id: 'f2', module: 'Distributeur', etat: 'Use' },
    { fiche_id: 'f4', module: 'Distributeur', etat: 'A_remplacer' },
    { fiche_id: 'f4', module: 'Imprimantes', etat: 'Absent' },
    { fiche_id: 'f4', module: 'EPP', etat: 'Bon' },
    { fiche_id: 'f1', module: 'Écran', etat: 'A_remplacer' },
  ],
  pieces: [
    { fiche_id: 'f2', module: 'Distributeur', pn: '0175', pn_libre: null, quantite: 2 },
    { fiche_id: 'f4', module: 'Distributeur', pn: '0175', pn_libre: null, quantite: 1 },
    { fiche_id: 'f4', module: 'Distributeur', pn: null, pn_libre: 'Vis spéciale', quantite: 1 },
    { fiche_id: 'f2', module: 'Distributeur', pn: null, pn_libre: 'vis spéciale ', quantite: 2 },
    { fiche_id: 'f1', module: 'Écran', pn: '0175', pn_libre: null, quantite: 9 },
    { fiche_id: 'f3', module: 'Écran', pn: '0175', pn_libre: null, quantite: 9 },
  ],
  articles: [{ pn: '0175', designation: 'Courroie' }],
};

describe('synthèse des fiches rendues', () => {
  const s = synthese(donnees);

  it("ne retient que la dernière fiche rendue de chaque DAB (ni brouillon, ni ancienne visite)", () => {
    expect(s.nbFiches).toBe(2);
  });
  it('additionne les pièces à prévoir, avec leur nom et les DAB concernés', () => {
    const courroie = s.pieces.find((p) => p.pn === '0175')!;
    expect(courroie.designation).toBe('Courroie');
    expect(courroie.quantite).toBe(3);
    expect(courroie.dabs.map((d) => d.code)).toEqual(['DAB-A', 'DAB-C']);
  });
  it('regroupe les pièces hors catalogue qui ne diffèrent que par la casse ou les espaces', () => {
    const libres = s.pieces.filter((p) => p.pn === null);
    expect(libres).toHaveLength(1);
    expect(libres[0].quantite).toBe(3);
  });
  it('classe les pièces les plus nombreuses en premier', () => {
    expect(s.pieces.map((p) => p.quantite)).toEqual([3, 3]);
  });
  it('liste les points pas OK avec les DAB concernés', () => {
    expect(s.pasOk).toEqual([{ itemId: 'CHK-1', libelle: 'Ventilateurs', dabs: [{ code: 'DAB-A', ficheId: 'f2' }, { code: 'DAB-C', ficheId: 'f4' }] }]);
  });
  it('regroupe les modules usés, à remplacer ou absents, sans les modules bons', () => {
    expect(s.modules.map((m) => m.module)).toEqual(['Distributeur', 'Imprimantes']);
    const d = s.modules[0];
    expect(d.use.map((x) => x.code)).toEqual(['DAB-A']);
    expect(d.aRemplacer.map((x) => x.code)).toEqual(['DAB-C']);
    expect(s.modules[1].absent.map((x) => x.code)).toEqual(['DAB-C']);
  });
  it("supporte l'absence de toute fiche", () => {
    expect(synthese({ fiches: [], reponses: [], etats: [], pieces: [], articles: [] })).toEqual({ nbFiches: 0, ecarts: [], pieces: [], pasOk: [], modules: [] });
  });
});

describe('écarts avec la base : tout ce que le terrain contredit ou ajoute', () => {
  const base = (id: string, dab: string, identification: Record<string, unknown>, extra: Record<string, unknown> = {}) =>
    ({ ...f(id, dab, 'terminee', '2026-12-02T08:00:00Z'), identification, sn_base: 'SN-BASE', modele_base: 'ProCash 2050xe', ...extra });
  const d = (fiches: ReturnType<typeof base>[], reponses: ExportDonnees['reponses'] = []): ExportDonnees =>
    ({ fiches, reponses, etats: [], pieces: [], articles: [], items: [{ id: 'CHK-9', libelle: 'Dépôt', obligatoire: true }] });

  it('ne signale rien quand le relevé confirme la base', () => {
    expect(synthese(d([base('a', 'DAB-1', { numero_serie: 'SN-BASE', modele: 'ProCash 2050xe' })])).ecarts).toEqual([]);
  });
  it('liste les corrections, le n° de série et le modèle différents, la ville, et marque les nouveaux DAB', () => {
    const e = synthese(d([
      base('a', 'DAB-1', { numero_serie: 'SN-NEUF', modele: 'ProCash 280', ville: 'Dolisie', banque: 'LCB', corrections: 'DAB mural' }),
      base('b', 'LCB-DLS-CENTRE-1', { numero_serie: 'SN-X', modele: 'ProCash 280' }, { nouveau: true, sn_base: null, modele_base: null }),
    ])).ecarts;
    expect(e.map((x) => x.dab.code)).toEqual(['LCB-DLS-CENTRE-1', 'DAB-1']);
    expect(e[0].lignes).toEqual(['Nouveau DAB ajouté sur le terrain']);
    expect(e[1].lignes).toEqual(['N° de série : SN-BASE → SN-NEUF', 'Modèle : ProCash 2050xe → ProCash 280', 'Ville : Dolisie', 'Banque : LCB', 'Remarque : DAB mural']);
  });
  it('signale un n° de série déjà relevé sur un autre DAB (doublon probable) en tête', () => {
    const e = synthese(d([
      base('a', 'DAB-1', { numero_serie: 'SN-BASE', modele: 'ProCash 2050xe' }),
      base('b', 'BGFI-BZV-X-1', { numero_serie: 'sn-base', modele: 'ProCash 2050xe' }, { nouveau: true, sn_base: null }),
    ])).ecarts;
    expect(e[0].dab.code).toBe('BGFI-BZV-X-1');
    expect(e[0].lignes).toContain('Même n° de série que DAB-1 : doublon probable');
    expect(e[0].doublon).toBe(true);
  });
  it('liste les exceptions acceptées sur le terrain', () => {
    const e = synthese(d([base('a', 'DAB-1', { numero_serie: 'SN-BASE', modele: 'ProCash 2050xe', plaque_illisible: true })],
      [{ fiche_id: 'a', item_id: 'CHK-9', libelle: 'Dépôt', valeur: 'NA', commentaire: 'pas de module' }])).ecarts;
    expect(e[0].lignes).toEqual(['Plaque illisible', 'N/A sur point obligatoire : Dépôt (pas de module)']);
  });
});
