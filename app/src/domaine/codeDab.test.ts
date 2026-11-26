import { expect, test } from 'vitest';
import { codeDab, codeVille, nomVille, normaliserAgence, CODE_NOUVEAU, villesConnues } from './codeDab';

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
  expect(CODE_NOUVEAU.test('BGFI-B-CENTRE-1')).toBe(false);
  expect(CODE_NOUVEAU.test('BGFI-DLS-CENTRE-1')).toBe(true);
});

test('toute ville a un code de 3 lettres : connu pour les villes du Congo, calculé sinon', () => {
  expect(codeVille('Brazzaville')).toBe('BZV');
  expect(codeVille('Pointe-Noire')).toBe('PNR');
  expect(codeVille('Dolisie')).toBe('DLS');
  expect(codeVille('  ouesso ')).toBe('OUE');
  expect(codeVille('Bétou')).toBe('BET');
  expect(codeVille('')).toBe('');
});

test("un DAB d'une ville hors liste reçoit quand même un code", () => {
  expect(codeDab('BGFI', 'Dolisie', 'Centre', [])).toBe('BGFI-DLS-CENTRE-1');
  expect(codeDab('LCB', 'Mossaka', 'Marché', [])).toBe('LCB-MOS-MARCHE-1');
});

test('villes proposées : Brazzaville et Pointe-Noire en tête, puis celles déjà présentes dans la liste', () => {
  expect(villesConnues(['Pointe-Noire', 'Dolisie', 'Brazzaville', 'Dolisie', '', null, 'Ouesso']))
    .toEqual(['Brazzaville', 'Pointe-Noire', 'Dolisie', 'Ouesso']);
});

test('une ville tapée à la main reprend l’orthographe connue, sinon une majuscule initiale', () => {
  expect(nomVille('  dolisie ', ['Brazzaville'])).toBe('Dolisie');
  expect(nomVille('POINTE NOIRE', [])).toBe('Pointe-Noire');
  expect(nomVille('mossaka', ['Mossaka'])).toBe('Mossaka');
  expect(nomVille('kintélé', [])).toBe('Kintélé');
  expect(nomVille('   ', [])).toBe('');
});

test('le code produit respecte toujours le format accepté par le serveur, même avec un sigle trop long ou trop court', () => {
  const long = codeDab('Ecobank Congo', 'Brazzaville', 'Centre', []);
  expect(long).toBe('ECOBANKC-BZV-CENTRE-1');
  expect(CODE_NOUVEAU.test(long)).toBe(true);
  expect(codeDab('B', 'Brazzaville', 'Centre', [])).toBe('');
  expect(codeDab('BGFI', 'Brazzaville', '***', [])).toBe('');
});
