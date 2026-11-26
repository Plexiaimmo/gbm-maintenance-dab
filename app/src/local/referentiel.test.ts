import { beforeEach, expect, test } from 'vitest';
import { db } from './db';
import { chargerReferentiel } from './referentiel';

const tables: Record<string, unknown[]> = {
  dab: [{ id: 'd1', code: 'A' }, { id: 'd2', code: 'B' }, { id: 'd3', code: 'C' }],
  sites: [{ id: 's1' }], banques: [{ id: 'b1' }], checklist_items: [{ id: 'CHK-P101', ordre: 10 }],
  articles: [{ pn: 'X' }], parametres: [{ cle: 'duree_min_minutes', valeur: '60' }],
};
const client = { from: (t: string) => ({ select: () => ({ range: async (de: number, a: number) => ({ data: tables[t].slice(de, a + 1), error: null }) }) }) };

beforeEach(async () => { await db.delete(); await db.open(); });

test('charge le référentiel sans toucher aux saisies ni dupliquer', async () => {
  await db.fiches.put({ id: 'f1', dab_id: 'd1', statut: 'brouillon', sync: 'a_envoyer' } as never);
  const r = await chargerReferentiel(client as never);
  expect(r.dab).toBe(3);
  await chargerReferentiel(client as never);
  expect(await db.dab.count()).toBe(3);
  expect(await db.checklist.count()).toBe(1);
  expect(await db.fiches.count()).toBe(1);
});

test('une erreur serveur ne vide pas le référentiel local', async () => {
  await chargerReferentiel(client as never);
  const enPanne = { from: () => ({ select: () => ({ range: async () => ({ data: null, error: { message: 'réseau' } }) }) }) };
  await expect(chargerReferentiel(enPanne as never)).rejects.toThrow('réseau');
  expect(await db.dab.count()).toBe(3);
});

test('plus de 1000 articles : tous chargés', async () => {
  const beaucoup = { ...tables, articles: Array.from({ length: 1500 }, (_, i) => ({ pn: `P${i}` })) };
  const gros = { from: (t: string) => ({ select: () => ({ range: async (de: number, a: number) => ({ data: (beaucoup as Record<string, unknown[]>)[t].slice(de, a + 1), error: null }) }) }) };
  await chargerReferentiel(gros as never);
  expect(await db.articles.count()).toBe(1500);
});

test('un DAB ajouté sur la tablette et refusé par le serveur reste sur la tablette', async () => {
  await db.dab.put({ id: 'local', code: 'X-BZV-Y-1', sync: 'rejete' } as never);
  await chargerReferentiel(client as never);
  expect(await db.dab.get('local')).toBeDefined();
});

test('une liste de DAB vide (compte mal configuré) ne vide jamais la tablette', async () => {
  await chargerReferentiel(client as never);
  const vide = { from: (t: string) => ({ select: () => ({ range: async (de: number, a: number) => ({ data: t === 'dab' || t === 'checklist_items' ? [] : tables[t].slice(de, a + 1), error: null }) }) }) };
  await expect(chargerReferentiel(vide as never)).rejects.toThrow(/aucun DAB/i);
  expect(await db.dab.count()).toBe(3);
  expect(await db.checklist.count()).toBe(1);
});
