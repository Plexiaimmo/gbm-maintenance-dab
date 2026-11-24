import { expect, test } from 'vitest';
import { toutLire } from './pagination';

test('lit toutes les pages au-delà de 1000 lignes', async () => {
  const lignes = Array.from({ length: 2500 }, (_, i) => ({ i }));
  const appels: [number, number][] = [];
  const r = await toutLire(async (de, a) => { appels.push([de, a]); return { data: lignes.slice(de, a + 1), error: null }; });
  expect(r).toHaveLength(2500);
  expect(appels).toEqual([[0, 999], [1000, 1999], [2000, 2999]]);
});

test('une erreur interrompt la lecture', async () => {
  await expect(toutLire(async () => ({ data: null, error: { message: 'réseau' } }))).rejects.toThrow('réseau');
});
