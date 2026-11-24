import { beforeEach, expect, test } from 'vitest';
import { db } from '../local/db';
import { enregistrerPhoto } from './stockage';

const outils = { lireHeure: async () => null, compresser: async (f: Blob) => f };
beforeEach(async () => { await db.delete(); await db.open(); });

test('reprendre une photo remplace la précédente et la remet à envoyer', async () => {
  const id1 = await enregistrerPhoto('f1', 'plaque', new Blob(['a']), outils);
  await db.photos.update(id1, { sync: 'envoye', televersee: true });
  const id2 = await enregistrerPhoto('f1', 'plaque', new Blob(['bb']), outils);
  expect(id2).toBe(id1);
  const p = await db.photos.get(id1);
  expect(await db.photos.count()).toBe(1);
  expect(p?.sync).toBe('a_envoyer');
  expect(p?.televersee).toBe(false);
  expect(p?.blob?.size).toBe(2);
});
