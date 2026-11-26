import { expect, test } from 'vitest';
import { derogations, elementsManquants, MOTIF_ERREUR, sansSignature } from './completude';
import { MODULES, type ChecklistItem, type FicheComplete } from './types';

const item = (id: string, o: Partial<ChecklistItem> = {}): ChecklistItem => ({
  id, ordre: 1, libelle: id, module: 'PC', consigne: '', obligatoire: true, modele: 'Tous',
  photo_requise: false, commentaire_requis: false, actif: true, ...o,
});
const ITEMS = [item('A'), item('B', { obligatoire: false }),
  item('CHK-P127', { photo_requise: true, commentaire_requis: true })];

function complete(): FicheComplete {
  return {
    fiche: {
      id: 'f', dab_id: 'd', consultant_id: 'c', statut: 'brouillon', arrivee_at: '2026-12-01T08:00:00Z',
      identification: { modele: 'ProCash 2050xe', numero_serie: 'SN1' },
      systeme: { version_windows: '10', logiciel: 'ProTopas', logiciel_version: '5.2', heure_correcte: true,
        espace_disque_go: '40', test_interne: 'Tous OK', antiskimming: false },
      cloture: { tension_phase_neutre: '230', tension_neutre_terre: '0,5', gestionnaire_nom: 'M. Ngoma' },
      sans_signature: false, sync: 'a_envoyer',
    },
    reponses: [
      { fiche_id: 'f', item_id: 'A', valeur: 'OK', sync: 'a_envoyer' },
      { fiche_id: 'f', item_id: 'B', valeur: 'NA', sync: 'a_envoyer' },
      { fiche_id: 'f', item_id: 'CHK-P127', valeur: 'OK', commentaire: '230 V / 0,5 V', sync: 'a_envoyer' },
    ],
    etats: MODULES.map((m) => ({ fiche_id: 'f', module: m, etat: 'Bon' as const, sync: 'a_envoyer' as const })),
    pieces: [],
    photos: ['plaque', 'item:CHK-P127', 'journal', 'ticket', 'multimetre'].map((cible) => ({ cible })),
    signature: true,
  };
}
const cles = (f: FicheComplete) => elementsManquants(f, ITEMS).map((m) => `${m.partie}:${m.cle}`);

test('fiche complète → aucun manque', () => expect(elementsManquants(complete(), ITEMS)).toEqual([]));

test('partie 1 : plaque et numéro de série', () => {
  const f = complete(); f.photos = f.photos.filter((p) => p.cible !== 'plaque');
  expect(cles(f)).toEqual(['1:plaque']);
  const g = complete(); g.fiche.identification.numero_serie = '  ';
  expect(cles(g)).toEqual(['1:numero_serie']);
});

test('partie 2 : réponses', () => {
  const f = complete(); f.reponses = f.reponses.filter((r) => r.item_id !== 'A');
  expect(cles(f)).toEqual(['2:item:A']);
  const g = complete(); g.reponses = g.reponses.filter((r) => r.item_id !== 'B');
  expect(cles(g)).toEqual(['2:item:B']); // même facultatif, jamais à vide
  const h = complete(); h.reponses[0].valeur = 'NA';
  expect(cles(h)).toEqual(['2:na:A']); // N/A possible sur un point obligatoire, mais expliqué
  h.reponses[0].commentaire = 'Pas de module de dépôt sur ce DAB';
  expect(cles(h)).toEqual([]);
  const i = complete(); i.reponses[0].valeur = 'NOK';
  expect(cles(i)).toEqual(['2:commentaire:A', '2:photo:A']);
  const j = complete(); j.photos = j.photos.filter((p) => p.cible !== 'item:CHK-P127');
  expect(cles(j)).toEqual(['2:photo:CHK-P127']);
  const k = complete(); k.reponses[2].commentaire = '';
  expect(cles(k)).toEqual(['2:commentaire:CHK-P127']);
});

test('partie 3 : états mécaniques', () => {
  const f = complete(); f.etats = f.etats.filter((e) => e.module !== 'PC');
  expect(cles(f)).toEqual(['3:etat:PC']);
  const g = complete(); g.etats[3] = { ...g.etats[3], etat: 'Use', commentaire: 'courroie usée' };
  g.photos.push({ cible: 'module:Distributeur' });
  expect(cles(g)).toEqual(['3:pieces:Distributeur']);
  g.pieces.push({ id: 'p', fiche_id: 'f', module: 'Distributeur', pn_libre: 'Courroie', quantite: 1, sync: 'a_envoyer' });
  expect(cles(g)).toEqual([]);
  g.pieces[0].supprimee = true;
  expect(cles(g)).toEqual(['3:pieces:Distributeur']);
  const h = complete(); h.etats[3] = { ...h.etats[3], etat: 'A_remplacer' };
  expect(cles(h)).toEqual(['3:commentaire:Distributeur', '3:photo:Distributeur', '3:pieces:Distributeur']);
});

test('partie 4 : système', () => {
  const f = complete(); f.photos = f.photos.filter((p) => p.cible !== 'journal');
  expect(cles(f)).toEqual(['4:journal']);
  const g = complete(); g.fiche.systeme.antiskimming = true;
  expect(cles(g)).toEqual(['4:photo_antiskimming']);
  const h = complete(); delete h.fiche.systeme.heure_correcte;
  expect(cles(h)).toEqual(['4:heure_correcte']);
});

test('partie 5 : clôture et signature', () => {
  // Les mesures électriques ne sont plus exigées à la clôture (le consultant n'a pas forcément de multimètre).
  const f = complete(); f.fiche.cloture = { gestionnaire_nom: 'M. Ngoma' };
  f.photos = f.photos.filter((p) => p.cible !== 'multimetre');
  expect(cles(f)).toEqual([]);
  const g = complete(); g.signature = false;
  expect(cles(g)).toEqual(['5:signature']);
  const h = complete(); h.signature = false; h.fiche.cloture.gestionnaire_absent = true;
  expect(cles(h)).toEqual(['5:motif_absence', '5:photo_site_absent']);
  h.fiche.cloture.motif_absence = 'Gestionnaire en congé'; h.photos.push({ cible: 'site_absent' });
  expect(cles(h)).toEqual([]);
  expect(sansSignature(h)).toBe(true);
  expect(sansSignature(complete())).toBe(false);
});

test('plaque illisible : le n° de série n’est plus exigé, la photo reste', () => {
  const f = complete(); f.fiche.identification.numero_serie = ''; f.fiche.identification.plaque_illisible = true;
  expect(cles(f)).toEqual([]);
  f.photos = f.photos.filter((p) => p.cible !== 'plaque');
  expect(cles(f)).toEqual(['1:plaque']);
});

test('système inaccessible : motif exigé, puis seules les questions visibles restent (anti-skimming)', () => {
  const f = complete(); f.fiche.systeme = { acces_impossible: true, antiskimming: false };
  f.photos = f.photos.filter((p) => p.cible !== 'journal');
  expect(cles(f)).toEqual(['4:motif_systeme']);
  f.fiche.systeme.motif_acces = 'Pas de mot de passe';
  expect(cles(f)).toEqual([]);
  delete f.fiche.systeme.antiskimming;
  expect(cles(f)).toEqual(['4:antiskimming']);
});

test('pas de ticket test : motif exigé à la place de la photo', () => {
  const f = complete(); f.photos = f.photos.filter((p) => p.cible !== 'ticket'); f.fiche.cloture.ticket_impossible = true;
  expect(cles(f)).toEqual(['5:motif_ticket']);
  f.fiche.cloture.motif_ticket = 'Imprimante en panne';
  expect(cles(f)).toEqual([]);
});

test('visite impossible : seuls le motif et une photo du site sont exigés', () => {
  const f = complete();
  f.fiche.identification = {}; f.fiche.systeme = {}; f.fiche.cloture = {}; f.reponses = []; f.etats = []; f.photos = []; f.signature = false;
  f.fiche.identification.visite_impossible = 'DAB retiré';
  expect(cles(f)).toEqual(['1:photo_visite_impossible']);
  f.photos = [{ cible: 'visite_impossible' }];
  expect(cles(f)).toEqual([]);
  f.fiche.identification.visite_impossible = '  ';
  expect(cles(f).length).toBeGreaterThan(5); // motif vide = fiche normale
});

test('dérogations listées pour l’administrateur', () => {
  const f = complete();
  expect(derogations(f, ITEMS)).toEqual([]);
  f.fiche.identification.plaque_illisible = true;
  f.fiche.systeme.acces_impossible = true; f.fiche.systeme.motif_acces = 'Pas de mot de passe';
  f.fiche.cloture.ticket_impossible = true; f.fiche.cloture.motif_ticket = 'Imprimante en panne';
  f.reponses[0].valeur = 'NA'; f.reponses[0].commentaire = 'pas de module';
  expect(derogations(f, ITEMS)).toEqual(['Plaque illisible', 'Système inaccessible : Pas de mot de passe',
    'Pas de ticket test : Imprimante en panne', 'N/A sur point obligatoire : A (pas de module)']);
  const g = complete(); g.fiche.identification.visite_impossible = 'Accès refusé par l’agence';
  expect(derogations(g, ITEMS)).toEqual(['Visite impossible : Accès refusé par l’agence']);
});

test('fiche ouverte par erreur : terminable sans photo', () => {
  const f = complete(); f.photos = []; f.reponses = []; f.fiche.identification = { visite_impossible: MOTIF_ERREUR };
  expect(cles(f)).toEqual([]);
});
