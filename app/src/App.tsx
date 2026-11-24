import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import { useSession } from './local/session';
import { chargerReferentiel } from './local/referentiel';
import { db } from './local/db';
import { Connexion } from './ecrans/Connexion';
import { ListeDab } from './ecrans/ListeDab';
import { NouveauDab } from './ecrans/NouveauDab';
import { Arrivee } from './ecrans/Arrivee';
import { Fiche } from './ecrans/Fiche';
import { EtatEnvoi } from './composants/EtatEnvoi';
import { useSynchro } from './sync/useSynchro';

type Ecran = { nom: 'liste' } | { nom: 'nouveau' } | { nom: 'arrivee'; dabId: string } | { nom: 'fiche'; ficheId: string };

export default function App() {
  const { session, pret } = useSession();
  const [message, setMessage] = useState('');
  const [ecran, setEcran] = useState<Ecran>({ nom: 'liste' });
  const synchro = useSynchro(!!session);

  useEffect(() => {
    if (!session) return;
    chargerReferentiel(supabase)
      .then((r) => setMessage(`Liste des DAB à jour : ${r.dab}`))
      .catch(async () => setMessage(`Hors ligne — liste gardée sur la tablette : ${await db.dab.count()} DAB`));
  }, [session]);

  if (!pret) return <p className="page">Chargement…</p>;
  if (!session) return <Connexion />;
  const moi = session.user.id;

  async function ouvrirDab(dabId: string) {
    const enCours = (await db.fiches.where('dab_id').equals(dabId).toArray())
      .filter((f) => f.consultant_id === moi && f.statut !== 'validee')
      .sort((a, b) => b.arrivee_at.localeCompare(a.arrivee_at))[0];
    setEcran(enCours ? { nom: 'fiche', ficheId: enCours.id } : { nom: 'arrivee', dabId });
  }

  return (
    <>
      <header className="barre">
        <span>GBM Relevé DAB</span>
        <button className="petit" onClick={() => supabase.auth.signOut()}>Déconnexion</button>
      </header>
      <EtatEnvoi attente={synchro.attente} enLigne={synchro.enLigne} erreur={synchro.dernier?.erreur} lancer={synchro.lancer} />
      {message && ecran.nom === 'liste' && <p className="page info">{message}</p>}
      {ecran.nom === 'liste' && <ListeDab ouvrir={ouvrirDab} nouveau={() => setEcran({ nom: 'nouveau' })} />}
      {ecran.nom === 'nouveau' && <NouveauDab consultantId={moi} cree={(dabId) => setEcran({ nom: 'arrivee', dabId })} annuler={() => setEcran({ nom: 'liste' })} />}
      {ecran.nom === 'arrivee' && <Arrivee dabId={ecran.dabId} consultantId={moi} ouverte={(ficheId) => setEcran({ nom: 'fiche', ficheId })} annuler={() => setEcran({ nom: 'liste' })} />}
      {ecran.nom === 'fiche' && <Fiche ficheId={ecran.ficheId} retour={() => setEcran({ nom: 'liste' })} apresTerminer={() => { setEcran({ nom: 'liste' }); void synchro.lancer(); }} />}
    </>
  );
}
