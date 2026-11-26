import { beforeEach, expect, test } from 'vitest';
import { db } from './db';
import { chargerFicheComplete, creerFiche, majFiche, majPartie, repondre, terminerFiche } from './fiches';
import { MODULES, type ChecklistItem } from '../domaine/types';

const ITEMS: ChecklistItem[] = [{ id: 'A', ordre: 1, libelle: 'A', module: 'PC', consigne: '', obligatoire: true,
  modele: 'Tous', photo_requise: false, commentaire_requis: false, actif: true }];
const arrivee = { at: '2026-12-01T08:00:00.000Z', lat: -4.26, lng: 15.24 };
const depart = async () => ({ at: '2026-12-01T10:05:00.000Z', lat: -4.2601, lng: 15.2401 });

beforeEach(async () => {
  await db.delete(); await db.open();
  await db.dab.put({ id: 'd1', code: 'X', site_id: null, marque: 'Wincor', modele: 'ProCash 280', numero_serie: 'SN9', ville: 'Brazzaville', origine: 'reference' });
});

async function remplir(id: string) {
  await majFiche(id, {
    systeme: { version_windows: '10', logiciel: 'P', logiciel_version: '1', heure_correcte: true, espace_disque_go: '5', test_interne: 'OK', antiskimming: false },
    cloture: { tension_phase_neutre: '230', tension_neutre_terre: '1', gestionnaire_nom: 'G' },
  });
  await repondre(id, 'A', 'OK');
  for (const m of MODULES) await db.etats.put({ fiche_id: id, module: m, etat: 'Bon', sync: 'a_envoyer' });
  for (const cible of ['plaque', 'journal', 'ticket', 'multimetre', 'signature'])
    await db.photos.put({ id: cible, fiche_id: id, cible, prise_at: null, prise_tablette_at: arrivee.at, sync: 'a_envoyer' });
}

test('creerFiche : brouillon avec arrivée et identification préremplie depuis le DAB', async () => {
  const id = await creerFiche('d1', 'c1', arrivee);
  const f = await db.fiches.get(id);
  expect(f).toMatchObject({ statut: 'brouillon', arrivee_at: arrivee.at, arrivee_lat: -4.26, sync: 'a_envoyer',
    identification: { modele: 'ProCash 280', numero_serie: 'SN9' } });
});

test('terminerFiche refuse une fiche incomplète', async () => {
  const id = await creerFiche('d1', 'c1', arrivee);
  const manques = await terminerFiche(id, ITEMS, depart);
  expect(manques.length).toBeGreaterThan(0);
  expect((await db.fiches.get(id))?.statut).toBe('brouillon');
});

test('terminerFiche accepte une fiche complète et pose le départ', async () => {
  const id = await creerFiche('d1', 'c1', arrivee);
  await remplir(id);
  expect(await terminerFiche(id, ITEMS, depart)).toEqual([]);
  expect(await db.fiches.get(id)).toMatchObject({ statut: 'terminee', depart_at: '2026-12-01T10:05:00.000Z', depart_lat: -4.2601, sans_signature: false });
});

test('modifier après Terminer : remis à envoyer, statut inchangé', async () => {
  const id = await creerFiche('d1', 'c1', arrivee);
  await remplir(id);
  await terminerFiche(id, ITEMS, depart);
  await db.fiches.update(id, { sync: 'envoye' });
  await repondre(id, 'A', 'NOK', 'courroie');
  const f = await db.fiches.get(id);
  expect(f?.statut).toBe('terminee');
  expect(f?.sync).toBe('a_envoyer');
  expect((await chargerFicheComplete(id)).reponses[0]).toMatchObject({ valeur: 'NOK', commentaire: 'courroie', sync: 'a_envoyer' });
});

test('fiche renvoyée : repasse en brouillon à la première modification', async () => {
  const id = await creerFiche('d1', 'c1', arrivee);
  await db.fiches.update(id, { statut: 'renvoyee', sync: 'envoye' });
  await majFiche(id, { identification: { modele: 'ProCash 280', numero_serie: 'SN10' } });
  expect((await db.fiches.get(id))?.statut).toBe('brouillon');
});

test('saisies rapides sur deux champs d\'une même partie : aucune ne s\'efface (fusion dans la base, pas depuis l\'écran)', async () => {
  const id = await creerFiche('d1', 'c1', arrivee);
  await Promise.all([
    majPartie(id, 'systeme', { logiciel_version: '3.3.1' }),
    majPartie(id, 'systeme', { espace_disque_go: '42' }),
    majPartie(id, 'cloture', { gestionnaire_nom: 'G' }),
    majPartie(id, 'cloture', { tension_phase_neutre: '228' }),
  ]);
  const f = await db.fiches.get(id);
  expect(f?.systeme).toMatchObject({ logiciel_version: '3.3.1', espace_disque_go: '42' });
  expect(f?.cloture).toMatchObject({ gestionnaire_nom: 'G', tension_phase_neutre: '228' });
});

test('un modèle « À vérifier » dans la base n’est pas recopié : le consultant doit le relever', async () => {
  await db.dab.put({ id: 'd2', code: 'Y', site_id: null, marque: null, modele: 'À vérifier', numero_serie: null, ville: 'Mossaka', origine: 'nouveau_a_verifier' } as never);
  const id = await creerFiche('d2', 'c1', arrivee);
  expect((await db.fiches.get(id))?.identification.modele).toBe('');
});
