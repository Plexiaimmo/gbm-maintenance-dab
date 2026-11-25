import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../supabase';

const CLE = 'utilisateur';
export type Utilisateur = { id: string };

export const memoriserUtilisateur = (id: string) => localStorage.setItem(CLE, id);
export const oublierUtilisateur = () => { localStorage.removeItem(CLE); localStorage.removeItem('role'); localStorage.removeItem('nom'); };

/** L'utilisateur de la tablette : celui de la session, ou le dernier connecté si la session n'a pas pu être
 *  rafraîchie (hors ligne). Seule une déconnexion volontaire l'oublie. */
export function utilisateurCourant(session: Session | null): Utilisateur | null {
  if (session?.user) { memoriserUtilisateur(session.user.id); return { id: session.user.id }; }
  const id = localStorage.getItem(CLE);
  return id ? { id } : null;
}

export function useSession(): { session: Session | null; utilisateur: Utilisateur | null; pret: boolean } {
  const [session, setSession] = useState<Session | null>(null);
  // Un utilisateur déjà connecté sur cette tablette n'attend pas le serveur (hors ligne, le rafraîchissement peut durer).
  const [pret, setPret] = useState(() => !!localStorage.getItem(CLE));
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setPret(true); }).catch(() => setPret(true));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);
  return { session, utilisateur: utilisateurCourant(session), pret };
}

/** La confirmation se fait dans l'application (bouton « Oui, me déconnecter ») :
 *  window.confirm est bloqué dans certains navigateurs et répond « non » sans rien afficher. */
export async function deconnecter(recharger: () => void = () => window.location.reload()) {
  oublierUtilisateur();
  await supabase.auth.signOut().catch(() => undefined);
  recharger();
}
