import { beforeEach, expect, test } from 'vitest';
import { utilisateurCourant, memoriserUtilisateur, oublierUtilisateur } from './session';

beforeEach(() => localStorage.clear());

test('session valide : son utilisateur, mémorisé', () => {
  expect(utilisateurCourant({ user: { id: 'u1' } } as never)).toEqual({ id: 'u1' });
  expect(utilisateurCourant(null)).toEqual({ id: 'u1' });
});

test('session expirée hors ligne : on garde l\'utilisateur mémorisé, la tablette reste utilisable', () => {
  memoriserUtilisateur('u2');
  expect(utilisateurCourant(null)).toEqual({ id: 'u2' });
});

test('déconnexion volontaire : plus d\'utilisateur', () => {
  memoriserUtilisateur('u3'); oublierUtilisateur();
  expect(utilisateurCourant(null)).toBeNull();
});
