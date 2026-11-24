import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import { useSession } from './local/session';
import { chargerReferentiel } from './local/referentiel';
import { db } from './local/db';
import { Connexion } from './ecrans/Connexion';

export default function App() {
  const { session, pret } = useSession();
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!session) return;
    chargerReferentiel(supabase)
      .then((r) => setMessage(`Liste des DAB chargée : ${r.dab}`))
      .catch(async () => setMessage(`Hors ligne — liste gardée sur la tablette : ${await db.dab.count()} DAB`));
  }, [session]);

  if (!pret) return <p className="page">Chargement…</p>;
  if (!session) return <Connexion />;
  return (
    <div className="page">
      <p className="info">{message}</p>
      <button onClick={() => supabase.auth.signOut()}>Se déconnecter</button>
    </div>
  );
}
