import { expect, test } from 'vitest';
import { enregistrerArrivee } from './arrivee';

const maintenant = () => new Date('2026-12-01T08:00:00Z');

test('position obtenue', async () => {
  const pos = async () => ({ coords: { latitude: -4.26, longitude: 15.24, accuracy: 12 }, timestamp: Date.parse('2026-12-01T07:59:58Z') }) as GeolocationPosition;
  const a = await enregistrerArrivee(pos, maintenant);
  expect(a).toEqual({ at: '2026-12-01T08:00:00.000Z', lat: -4.26, lng: 15.24, precision: 12, gps_at: '2026-12-01T07:59:58.000Z' });
});

test('GPS refusé : on enregistre quand même l\'heure', async () => {
  const pos = () => Promise.reject({ code: 1, message: 'denied' });
  expect(await enregistrerArrivee(pos, maintenant)).toEqual({ at: '2026-12-01T08:00:00.000Z', gps_motif: 'refuse' });
});

test('GPS indisponible ou trop long', async () => {
  const panne = () => Promise.reject({ code: 2, message: 'unavailable' });
  expect((await enregistrerArrivee(panne, maintenant)).gps_motif).toBe('indisponible');
  const jamais = () => new Promise<GeolocationPosition>(() => {});
  expect((await enregistrerArrivee(jamais, maintenant, 20)).gps_motif).toBe('indisponible');
});
