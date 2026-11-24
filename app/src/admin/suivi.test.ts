import { expect, test } from 'vitest';
import { resumerSuivi } from './suivi';

const dab = (id: string, ville = 'Brazzaville') => ({ id, code: id.toUpperCase(), ville, site_id: null, banque: 'BGFI', agence: 'A' });
const fiche = (id: string, dab_id: string, statut: string, arrivee_at: string) => ({ id, dab_id, statut, arrivee_at });

test('compteurs et dernière fiche par DAB', () => {
  const r = resumerSuivi(
    [dab('d1'), dab('d2'), dab('d3', 'Pointe-Noire'), dab('d4')],
    [fiche('f1', 'd1', 'renvoyee', '2026-12-01T08:00:00Z'), fiche('f2', 'd1', 'terminee', '2026-12-02T08:00:00Z'),
     fiche('f3', 'd2', 'brouillon', '2026-12-01T09:00:00Z'), fiche('f4', 'd3', 'validee', '2026-12-01T10:00:00Z')],
    [{ fiche_id: 'f2', douteux: true, raisons: ['GPS absent'], sans_signature: false },
     { fiche_id: 'f4', douteux: false, raisons: [], sans_signature: true }],
  );
  expect(r.compteurs).toEqual({ total: 4, visites: 2, restants: 2, douteux: 1, sans_signature: 1, a_valider: 1 });
  const d1 = r.lignes.find((l) => l.dab.id === 'd1')!;
  expect(d1.fiche?.id).toBe('f2');
  expect(d1.signal?.raisons).toEqual(['GPS absent']);
  expect(r.lignes.find((l) => l.dab.id === 'd4')!.fiche).toBeUndefined();
});
