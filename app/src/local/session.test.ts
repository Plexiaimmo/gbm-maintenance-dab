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

test('déconnexion : ne dépend pas de window.confirm (bloqué dans certains navigateurs, il répond « non » sans rien afficher)', async () => {
  const { deconnecter } = await import('./session');
  const avant = window.confirm;
  window.confirm = () => false;
  memoriserUtilisateur('u4');
  let recharge = false;
  await deconnecter(() => { recharge = true; });
  window.confirm = avant;
  expect(utilisateurCourant(null)).toBeNull();
  expect(recharge).toBe(true);
});
