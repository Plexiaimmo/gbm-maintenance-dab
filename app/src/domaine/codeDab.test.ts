import { expect, test } from 'vitest';
import { codeDab, normaliserAgence, CODE_NOUVEAU } from './codeDab';

test('agence normalisée : majuscules, sans accents, tirets entre les mots', () => {
  expect(normaliserAgence("  Poto-poto  marché d'Ouenzé ")).toBe('POTO-POTO-MARCHE-D-OUENZE');
});

test('code calculé BANQUE-VILLE-AGENCE-N, avec le premier numéro libre', () => {
  const existants = ['BGFI-BZV-POTO-POTO-1', 'bgfi-bzv-poto-poto-3', 'UBA-BZV-POTO-POTO-2'];
  expect(codeDab('BGFI', 'Brazzaville', 'Poto-Poto', existants)).toBe('BGFI-BZV-POTO-POTO-2');
  expect(codeDab('UBA', 'Pointe-Noire', 'Grand Marché', [])).toBe('UBA-PNR-GRAND-MARCHE-1');
});

test('code incomplet tant que banque ou agence manquent', () => {
  expect(codeDab('', 'Brazzaville', 'Centre', [])).toBe('');
  expect(codeDab('BGFI', 'Brazzaville', '  ', [])).toBe('');
});

test('format imposé aux nouveaux DAB', () => {
  expect(CODE_NOUVEAU.test('BGFI-BZV-POTO-POTO-2')).toBe(true);
  expect(CODE_NOUVEAU.test('dab poto 2')).toBe(false);
  expect(CODE_NOUVEAU.test('BGFI-KIN-CENTRE-1')).toBe(false);
});
