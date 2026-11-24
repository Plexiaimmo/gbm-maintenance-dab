import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { dimensionsCibles, lireHeurePrise, preparerPhoto } from './capture';

const fichier = (nom: string) =>
  new File([readFileSync(`${process.cwd()}/src/photos/fixtures/${nom}`)], nom, { type: 'image/jpeg' });

test('dimensions : plus grand côté ramené à 1600, jamais agrandi', () => {
  expect(dimensionsCibles(4000, 3000)).toEqual({ l: 1600, h: 1200 });
  expect(dimensionsCibles(3000, 4000)).toEqual({ l: 1200, h: 1600 });
  expect(dimensionsCibles(800, 600)).toEqual({ l: 800, h: 600 });
});

test('heure de prise lue dans les EXIF, null sinon', async () => {
  expect((await lireHeurePrise(fichier('avec_exif.jpg')))?.getFullYear()).toBe(2026);
  expect(await lireHeurePrise(fichier('sans_exif.jpg'))).toBeNull();
});

test('preparerPhoto lit l\'EXIF avant de compresser', async () => {
  const ordre: string[] = [];
  const r = await preparerPhoto(fichier('avec_exif.jpg'), new Date('2026-12-01T10:00:00Z'), {
    lireHeure: async (f) => { ordre.push('exif'); return lireHeurePrise(f); },
    compresser: async (f) => { ordre.push('compression'); return new Blob([await f.arrayBuffer()], { type: 'image/jpeg' }); },
  });
  expect(ordre).toEqual(['exif', 'compression']);
  expect(r.prise_at?.getDate()).toBe(1);
  expect(r.prise_tablette_at.toISOString()).toBe('2026-12-01T10:00:00.000Z');
  expect(r.blob.type).toBe('image/jpeg');
});
