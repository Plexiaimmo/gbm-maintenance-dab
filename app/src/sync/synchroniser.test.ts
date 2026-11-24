import { beforeEach, expect, test } from 'vitest';
import { db } from '../local/db';
import { synchroniser } from './synchroniser';
import { FauxClient } from './fauxClient';

const octets = (n: number) => new Uint8Array(n).buffer;

async function jeu(nbPhotos = 3) {
  await db.fiches.put({ id: 'f1', dab_id: 'd1', consultant_id: 'c1', statut: 'brouillon', arrivee_at: '2026-12-01T08:00:00Z',
    identification: {}, systeme: {}, cloture: {}, sans_signature: false, sync: 'a_envoyer' });
  await db.reponses.put({ fiche_id: 'f1', item_id: 'A', valeur: 'OK', sync: 'a_envoyer' });
  await db.etats.put({ fiche_id: 'f1', module: 'PC', etat: 'Bon', sync: 'a_envoyer' });
  for (let i = 1; i <= nbPhotos; i++)
    await db.photos.put({ id: `p${i}`, fiche_id: 'f1', cible: `c${i}`, donnees: octets(10 * i), type: 'image/jpeg',
      prise_at: null, prise_tablette_at: '2026-12-01T08:10:00Z', sync: 'a_envoyer' });
}
const c = () => new FauxClient();
beforeEach(async () => { await db.delete(); await db.open(); });

test('envoi nominal : tout est envoyé, octets locaux libérés', async () => {
  await jeu(); const cl = c();
  const r = await synchroniser(cl as never);
  expect(r).toMatchObject({ restants: 0 });
  expect(cl.lignes.fiches.size).toBe(1);
  expect(cl.lignes.reponses_checklist.size).toBe(1);
  expect(cl.lignes.photos.size).toBe(3);
  expect(cl.objets.get('fiches/f1/p2.jpg')).toBe(20);
  expect((await db.photos.get('p1'))?.donnees).toBeUndefined();
  expect((await db.fiches.get('f1'))?.sync).toBe('envoye');
});

test('coupure sur la 3e photo puis reprise : rien de perdu, rien en double', async () => {
  await jeu(); const cl = c();
  cl.pannes.push((op, cible) => (op === 'upload' && cible.endsWith('p3.jpg') ? { error: { message: 'Failed to fetch' } } : null));
  const r1 = await synchroniser(cl as never);
  expect(r1.restants).toBe(1);
  expect((await db.photos.get('p3'))?.donnees?.byteLength).toBe(30);
  cl.pannes = [];
  const r2 = await synchroniser(cl as never);
  expect(r2.restants).toBe(0);
  expect(cl.lignes.photos.size).toBe(3);
});

test('coupure entre le téléversement et la ligne : relance sans doublon', async () => {
  await jeu(1); const cl = c();
  cl.pannes.push((op, t) => (op === 'upsert' && t === 'photos' ? { error: { message: 'Failed to fetch' } } : null));
  await synchroniser(cl as never);
  expect(cl.objets.size).toBe(1);
  expect((await db.photos.get('p1'))?.donnees).toBeDefined();
  cl.pannes = [];
  await synchroniser(cl as never);
  expect(cl.objets.size).toBe(1);
  expect(cl.lignes.photos.size).toBe(1);
});

test('session expirée : rafraîchie puis nouvel essai ; échec du rafraîchissement : rien marqué envoyé', async () => {
  await jeu(0); const cl = c(); let fois = 0;
  cl.pannes.push((op, t) => (op === 'upsert' && t === 'fiches' && fois++ === 0 ? { error: { message: 'JWT expired', code: 'PGRST301' }, status: 401 } : null));
  expect((await synchroniser(cl as never)).restants).toBe(0);
  expect(cl.appelsRefresh).toBe(1);

  await db.fiches.update('f1', { sync: 'a_envoyer' });
  const cl2 = c(); cl2.refreshOk = false;
  cl2.pannes.push((op) => (op === 'upsert' ? { error: { message: 'JWT expired', code: 'PGRST301' }, status: 401 } : null));
  const r = await synchroniser(cl2 as never);
  expect(r.erreur).toBe('session');
  expect((await db.fiches.get('f1'))?.sync).toBe('a_envoyer');
});

test('deux appels simultanés : un seul envoi', async () => {
  await jeu(1); const cl = c(); let appels = 0;
  cl.pannes.push((op, t) => { if (op === 'upsert' && t === 'fiches') appels++; return null; });
  await Promise.all([synchroniser(cl as never), synchroniser(cl as never)]);
  expect(appels).toBe(1);
});

test('modification pendant l\'envoi : reste à envoyer', async () => {
  await jeu(0); const cl = c();
  cl.pannes.push((op, t) => {
    if (op === 'upsert' && t === 'fiches') void db.fiches.update('f1', { systeme: { logiciel: 'modifié' } });
    return null;
  });
  await synchroniser(cl as never);
  const f = await db.fiches.get('f1');
  expect(f?.systeme.logiciel).toBe('modifié');
  expect(f?.sync).toBe('a_envoyer');
});

test('pièce retirée sur la tablette : supprimée sur le serveur et localement', async () => {
  await jeu(0); const cl = c();
  await db.pieces.put({ id: 'x', fiche_id: 'f1', module: 'PC', pn_libre: 'Ventilateur', quantite: 1, sync: 'a_envoyer' });
  await synchroniser(cl as never);
  expect(cl.lignes.pieces_a_prevoir.has('x')).toBe(true);
  await db.pieces.update('x', { supprimee: true, sync: 'a_envoyer' });
  await synchroniser(cl as never);
  expect(cl.lignes.pieces_a_prevoir.has('x')).toBe(false);
  expect(await db.pieces.get('x')).toBeUndefined();
});

test('DAB ajouté sur la tablette envoyé avant la fiche ; déjà présent = pas d\'erreur', async () => {
  await db.dab.put({ id: 'n1', code: 'NOUVEAU', site_id: null, marque: 'Wincor', modele: 'P', numero_serie: null, ville: 'Brazzaville',
    origine: 'nouveau_a_verifier', cree_par: 'c1', agence_saisie: 'BGFI — Port', sync: 'a_envoyer' });
  const cl = c(); cl.lignes.dab = new Map([['n1', { id: 'n1' }]]);
  const r = await synchroniser(cl as never);
  expect(r.restants).toBe(0);
  expect((await db.dab.get('n1'))?.sync).toBe('envoye');
});

test('statut décidé par l\'admin récupéré : renvoyée avec motif, validée', async () => {
  await jeu(0); await db.fiches.update('f1', { statut: 'terminee', sync: 'envoye' });
  await db.fiches.put({ ...(await db.fiches.get('f1'))!, id: 'f2' });
  const cl = c();
  cl.serveurFiches = [{ id: 'f1', statut: 'renvoyee', motif_renvoi: 'Photo floue' }, { id: 'f2', statut: 'validee', motif_renvoi: null }];
  await synchroniser(cl as never);
  expect(await db.fiches.get('f1')).toMatchObject({ statut: 'renvoyee', motif_renvoi: 'Photo floue' });
  expect((await db.fiches.get('f2'))?.statut).toBe('validee');
});
