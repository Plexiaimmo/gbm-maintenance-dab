import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import { deconnecter, useSession } from './local/session';
import { chargerReferentiel } from './local/referentiel';
import { db } from './local/db';
import { Connexion } from './ecrans/Connexion';
import { ListeDab } from './ecrans/ListeDab';
import { NouveauDab } from './ecrans/NouveauDab';
import { Arrivee } from './ecrans/Arrivee';
import { Fiche } from './ecrans/Fiche';
import { EtatEnvoi } from './composants/EtatEnvoi';
import { useSynchro } from './sync/useSynchro';
import { Suivi } from './ecrans/admin/Suivi';
import { FicheDetail } from './ecrans/admin/FicheDetail';
import { chargerExport } from './admin/donnees';

type Ecran = { nom: 'suivi' } | { nom: 'detail'; ficheId: string } | { nom: 'liste' } | { nom: 'nouveau' } | { nom: 'arrivee'; dabId: string } | { nom: 'fiche'; ficheId: string };

export default function App() {
  const { session, utilisateur, pret } = useSession();
  const [message, setMessage] = useState('');
  const [ecran, setEcran] = useState<Ecran>({ nom: 'liste' });
  const [role, setRole] = useState<string | null>(() => localStorage.getItem('role'));
  const synchro = useSynchro(!!session);
  const [reconnexion, setReconnexion] = useState(false);
  const [quitter, setQuitter] = useState(false);
  useEffect(() => { if (session) setReconnexion(false); }, [session]);

  useEffect(() => {
    if (!session) return;
    supabase.from('profils').select('role').eq('id', session.user.id).single().then(({ data }) => {
      if (!data?.role) return;
      localStorage.setItem('role', data.role); setRole(data.role);
      if (data.role !== 'consultant') setEcran((e) => (e.nom === 'liste' ? { nom: 'suivi' } : e));
    });
  }, [session]);

  useEffect(() => {
    if (!session) return;
    chargerReferentiel(supabase)
      .then((r) => setMessage(`Liste des DAB à jour : ${r.dab}`))
      .catch(async () => setMessage(`Hors ligne — liste gardée sur la tablette : ${await db.dab.count()} DAB`));
  }, [session]);

  if (!pret) return <p className="page">Chargement…</p>;
  if (!utilisateur || reconnexion) return <Connexion />;
  const moi = utilisateur.id;

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
        {role && role !== 'consultant' && (ecran.nom === 'suivi' || ecran.nom === 'detail'
          ? role === 'admin' && <button className="petit" onClick={() => setEcran({ nom: 'liste' })}>Mode terrain</button>
          : <button className="petit" onClick={() => setEcran({ nom: 'suivi' })}>Suivi</button>)}
        <button className="petit" onClick={() => setQuitter(true)}>Déconnexion</button>
      </header>
      {quitter && (
        <div className="page confirmer-sortie" role="alertdialog" aria-label="Confirmer la déconnexion">
          <p>Se déconnecter ? Les saisies non envoyées restent sur la tablette, mais il faudra du réseau pour se reconnecter.</p>
          <div className="actions">
            <button onClick={() => void deconnecter()}>Oui, me déconnecter</button>
            <button className="secondaire" onClick={() => setQuitter(false)}>Annuler</button>
          </div>
        </div>
      )}
      {(ecran.nom === 'liste' || ecran.nom === 'fiche' || ecran.nom === 'arrivee' || ecran.nom === 'nouveau') && <EtatEnvoi attente={synchro.attente} refuses={synchro.refuses} enLigne={synchro.enLigne} erreur={!session ? 'session' : synchro.dernier?.erreur} lancer={synchro.lancer} reconnecter={() => setReconnexion(true)} />}
      {message && ecran.nom === 'liste' && <p className="page info">{message}</p>}
      {ecran.nom === 'suivi' && <Suivi ouvrir={(ficheId) => setEcran({ nom: 'detail', ficheId })}
        exporter={async () => {
          const [{ construireClasseur }, XLSX, d] = await Promise.all([import('./admin/export'), import('xlsx'), chargerExport()]);
          XLSX.writeFile(construireClasseur(d), `releve-wincor-${new Date().toISOString().slice(0, 10)}.xlsx`);
        }} />}
      {ecran.nom === 'detail' && <FicheDetail ficheId={ecran.ficheId} admin={role === 'admin'} retour={() => setEcran({ nom: 'suivi' })} />}
      {ecran.nom === 'liste' && <ListeDab ouvrir={ouvrirDab} nouveau={() => setEcran({ nom: 'nouveau' })} />}
      {ecran.nom === 'nouveau' && <NouveauDab consultantId={moi} cree={(dabId) => setEcran({ nom: 'arrivee', dabId })} annuler={() => setEcran({ nom: 'liste' })} />}
      {ecran.nom === 'arrivee' && <Arrivee dabId={ecran.dabId} consultantId={moi} ouverte={(ficheId) => setEcran({ nom: 'fiche', ficheId })} annuler={() => setEcran({ nom: 'liste' })} />}
      {ecran.nom === 'fiche' && <Fiche ficheId={ecran.ficheId} retour={() => setEcran({ nom: 'liste' })} apresTerminer={() => { setEcran({ nom: 'liste' }); void synchro.lancer(); }} />}
    </>
  );
}
