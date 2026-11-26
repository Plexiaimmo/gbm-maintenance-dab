import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import { deconnecter, useSession } from './local/session';
import { chargerReferentiel } from './local/referentiel';
import { estAbandonnee } from './domaine/completude';
import { db } from './local/db';
import { Connexion } from './ecrans/Connexion';
import { ListeDab } from './ecrans/ListeDab';
import { NouveauDab } from './ecrans/NouveauDab';
import { Arrivee } from './ecrans/Arrivee';
import { Fiche } from './ecrans/Fiche';
import { EtatEnvoi, PastilleEnvoi } from './composants/EtatEnvoi';
import { Icone } from './composants/Icone';
import { LogoGbm } from './composants/Logos';
import { useSynchro } from './sync/useSynchro';
import { Suivi } from './ecrans/admin/Suivi';
import { FicheDetail } from './ecrans/admin/FicheDetail';
import { Synthese } from './ecrans/admin/Synthese';
import { chargerExport } from './admin/donnees';
import { lireEcran, memoriserEcran } from './local/navigation';

import type { EcranMemo as Ecran } from './local/navigation';

export default function App() {
  const { session, utilisateur, pret } = useSession();
  const [message, setMessage] = useState('');
  const [ecran, setEcran] = useState<Ecran>(lireEcran);
  const [role, setRole] = useState<string | null>(() => localStorage.getItem('role'));
  const synchro = useSynchro(!!session);
  const [reconnexion, setReconnexion] = useState(false);
  const [quitter, setQuitter] = useState(false);
  const [menu, setMenu] = useState(false);
  const [depuisSynthese, setDepuisSynthese] = useState(false);
  const [nom, setNom] = useState<string>(() => localStorage.getItem('nom') ?? '');
  useEffect(() => { if (session) setReconnexion(false); }, [session]);
  // L'écran courant survit à un rechargement ; une fiche disparue (supprimée) ramène à la liste.
  useEffect(() => { memoriserEcran(ecran); }, [ecran]);
  useEffect(() => {
    if (ecran.nom !== 'fiche') return;
    void db.fiches.get(ecran.ficheId).then((f) => { if (!f) setEcran({ nom: 'liste' }); });
  }, [ecran]);

  useEffect(() => {
    if (!session) return;
    supabase.from('profils').select('role, nom').eq('id', session.user.id).single().then(({ data }) => {
      if (!data?.role) return;
      if (data.nom) { localStorage.setItem('nom', data.nom); setNom(data.nom); }
      localStorage.setItem('role', data.role); setRole(data.role);
      if (data.role !== 'consultant') setEcran((e) => (e.nom === 'liste' ? { nom: 'suivi' } : e));
    });
  }, [session]);

  useEffect(() => {
    if (!session) return;
    chargerReferentiel(supabase)
      .then((r) => setMessage(`Liste des DAB à jour : ${r.dab}`))
      .catch(async (e: Error) => setMessage(e.message.startsWith('Le serveur') ? e.message : `Hors ligne — liste gardée sur la tablette : ${await db.dab.count()} DAB`));
  }, [session]);

  if (!pret) return <p className="page">Chargement…</p>;
  if (!utilisateur || reconnexion) return <Connexion />;
  const moi = utilisateur.id;

  async function ouvrirDab(dabId: string) {
    const enCours = (await db.fiches.where('dab_id').equals(dabId).toArray())
      .filter((f) => f.consultant_id === moi && f.statut !== 'validee' && !estAbandonnee(f))
      .sort((a, b) => b.arrivee_at.localeCompare(a.arrivee_at))[0];
    setEcran(enCours ? { nom: 'fiche', ficheId: enCours.id } : { nom: 'arrivee', dabId });
  }

  const terrain = ecran.nom === 'liste' || ecran.nom === 'fiche';
  const versSuivi = role && role !== 'consultant';
  const confirmation = quitter && (
    <div className="page confirmer-sortie" role="alertdialog" aria-label="Confirmer la déconnexion">
      <p>Se déconnecter ? Les saisies non envoyées restent sur la tablette, mais il faudra du réseau pour se reconnecter.</p>
      <div className="actions">
        <button onClick={() => void deconnecter()}>Oui, me déconnecter</button>
        <button className="secondaire" onClick={() => setQuitter(false)}>Annuler</button>
      </div>
    </div>
  );
  const actionsAccueil = <>
    <PastilleEnvoi attente={synchro.attente} enLigne={synchro.enLigne} lancer={synchro.lancer} />
    <button className="rond" aria-label="Menu" aria-expanded={menu} onClick={() => setMenu(!menu)}><Icone nom="menu" /></button>
    {menu && (
      <div className="menu" role="menu">
        {versSuivi && <button role="menuitem" onClick={() => { setMenu(false); setEcran({ nom: 'suivi' }); }}>Suivi des fiches</button>}
        <button role="menuitem" onClick={() => { setMenu(false); setQuitter(true); }}>Déconnexion</button>
      </div>
    )}
  </>;

  return (
    <>
      {!terrain && (
        <header className="barre">
          <span className="barre-titre"><LogoGbm hauteur={26} />Relevé DAB</span>
          <div className="actions-barre">
            {versSuivi && (ecran.nom === 'suivi' || ecran.nom === 'detail'
              ? role === 'admin' && <button className="petit" onClick={() => setEcran({ nom: 'liste' })}>Mode terrain</button>
              : <button className="petit" onClick={() => setEcran({ nom: 'suivi' })}>Suivi</button>)}
            <button className="petit" onClick={() => setQuitter(true)}>Déconnexion</button>
          </div>
        </header>
      )}
      {confirmation}
      {(ecran.nom === 'liste' || ecran.nom === 'fiche' || ecran.nom === 'arrivee' || ecran.nom === 'nouveau') && <EtatEnvoi attente={synchro.attente} refuses={synchro.refuses} enLigne={synchro.enLigne} erreur={!session ? 'session' : synchro.dernier?.erreur} lancer={synchro.lancer} reconnecter={() => setReconnexion(true)} />}
      {(message.startsWith('Hors ligne') || message.startsWith('Le serveur')) && ecran.nom === 'liste' && <p className="page info">{message}</p>}
      {ecran.nom === 'suivi' && <Suivi ouvrir={(ficheId) => { setDepuisSynthese(false); setEcran({ nom: 'detail', ficheId }); }} synthese={() => setEcran({ nom: 'synthese' })}
        exporter={async () => {
          const [{ construireClasseur }, XLSX, d] = await Promise.all([import('./admin/export'), import('xlsx'), chargerExport()]);
          XLSX.writeFile(construireClasseur(d), `releve-wincor-${new Date().toISOString().slice(0, 10)}.xlsx`);
        }} />}
      {ecran.nom === 'synthese' && <Synthese ouvrir={(ficheId) => { setDepuisSynthese(true); setEcran({ nom: 'detail', ficheId }); }} retour={() => setEcran({ nom: 'suivi' })} />}
      {ecran.nom === 'detail' && <FicheDetail ficheId={ecran.ficheId} admin={role === 'admin'} retourLibelle={depuisSynthese ? '← À signaler' : '← Suivi'} retour={() => setEcran({ nom: depuisSynthese ? 'synthese' : 'suivi' })} />}
      {ecran.nom === 'liste' && <ListeDab ouvrir={ouvrirDab} nouveau={(code) => setEcran({ nom: 'nouveau', code })} nom={nom} actions={actionsAccueil} />}
      {ecran.nom === 'nouveau' && <NouveauDab codeInitial={ecran.code} consultantId={moi} cree={(dabId) => setEcran({ nom: 'arrivee', dabId })} annuler={() => setEcran({ nom: 'liste' })} />}
      {ecran.nom === 'arrivee' && <Arrivee dabId={ecran.dabId} consultantId={moi} ouverte={(ficheId) => setEcran({ nom: 'fiche', ficheId })} annuler={() => setEcran({ nom: 'liste' })} />}
      {ecran.nom === 'fiche' && <Fiche ficheId={ecran.ficheId} retour={() => setEcran({ nom: 'liste' })} apresTerminer={() => { setEcran({ nom: 'liste' }); void synchro.lancer(); }} />}
    </>
  );
}
