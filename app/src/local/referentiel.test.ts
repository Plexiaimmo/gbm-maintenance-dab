import { beforeEach, expect, test } from 'vitest';
import { db } from './db';
import { chargerReferentiel } from './referentiel';

const tables: Record<string, unknown[]> = {
  dab: [{ id: 'd1', code: 'A' }, { id: 'd2', code: 'B' }, { id: 'd3', code: 'C' }],
  sites: [{ id: 's1' }], banques: [{ id: 'b1' }], checklist_items: [{ id: 'CHK-P101', ordre: 10 }],
  articles: [{ pn: 'X' }], parametres: [{ cle: 'duree_min_minutes', valeur: '60' }],
};
const client = { from: (t: string) => ({ select: async () => ({ data: tables[t], error: null }) }) };

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
  const enPanne = { from: () => ({ select: async () => ({ data: null, error: { message: 'réseau' } }) }) };
  await expect(chargerReferentiel(enPanne as never)).rejects.toThrow('réseau');
  expect(await db.dab.count()).toBe(3);
});
