import { useState, type FormEvent } from 'react';
import { supabase } from '../supabase';

export function Connexion() {
  const [email, setEmail] = useState('');
  const [mdp, setMdp] = useState('');
  const [erreur, setErreur] = useState('');
  const [encours, setEncours] = useState(false);

  async function envoyer(e: FormEvent) {
    e.preventDefault();
    setEncours(true); setErreur('');
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: mdp });
    setEncours(false);
    if (error) setErreur(navigator.onLine ? 'E-mail ou mot de passe incorrect.' : 'Pas de réseau : la première connexion demande Internet.');
  }

  return (
    <form className="page connexion" onSubmit={envoyer}>
      <h1>GBM — Relevé DAB</h1>
      <label>Adresse e-mail<input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
      <label>Mot de passe<input type="password" autoComplete="current-password" value={mdp} onChange={(e) => setMdp(e.target.value)} required /></label>
      {erreur && <p className="erreur">{erreur}</p>}
      <button className="principal" disabled={encours}>{encours ? 'Connexion…' : 'Se connecter'}</button>
    </form>
  );
}
