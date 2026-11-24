import { test } from 'node:test';
import assert from 'node:assert/strict';
import { valider } from './valider.ts';

const ok = { email: 'chaker@exemple.com', nom: 'Chaker', role: 'consultant', mot_de_passe: 'Abcdefgh12' };

test('corps valide accepté', () => assert.equal(valider(ok), null));
test('rôle inconnu refusé', () => assert.match(valider({ ...ok, role: 'technicien' }) ?? '', /rôle/));
test('e-mail mal formé refusé', () => assert.match(valider({ ...ok, email: 'chaker@' }) ?? '', /e-mail/));
test('mot de passe trop court refusé', () => assert.match(valider({ ...ok, mot_de_passe: 'court1' }) ?? '', /10 caractères/));
test('nom vide refusé', () => assert.match(valider({ ...ok, nom: ' ' }) ?? '', /nom/));
