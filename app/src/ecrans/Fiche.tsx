import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../local/db';
import { chargerFicheComplete, terminerFiche } from '../local/fiches';
import { elementsManquants, type Manque } from '../domaine/completude';
import { enregistrerArrivee, positionNavigateur } from '../domaine/arrivee';
import { Identification } from './parties/Identification';
import { Preventif } from './parties/Preventif';
import { Mecanique } from './parties/Mecanique';
import { Systeme } from './parties/Systeme';
import { Cloture } from './parties/Cloture';
import { Manques } from './Manques';

const PARTIES = ['Identification', 'Préventif', 'Mécanique', 'Système', 'Clôture'];

export function Fiche({ ficheId, retour, apresTerminer }: { ficheId: string; retour: () => void; apresTerminer: () => void }) {
  const [partie, setPartie] = useState(1);
  const [manquesAffiches, setManquesAffiches] = useState<Manque[] | null>(null);
  const [encours, setEncours] = useState(false);
  const items = useLiveQuery(async () => (await db.checklist.orderBy('ordre').toArray())
    .filter((i) => i.actif && (i.modele === 'Tous' || i.modele === 'Wincor')), []) ?? [];
  const fc = useLiveQuery(async () => {
    try { return await chargerFicheComplete(ficheId); } catch { return undefined; }
  }, [ficheId]);
  const dab = useLiveQuery(async () => (fc ? db.dab.get(fc.fiche.dab_id) : undefined), [fc?.fiche.dab_id]);
  if (!fc) return <p className="page">Chargement…</p>;

  const manques = elementsManquants(fc, items);
  const parPartie = (p: number) => manques.filter((m) => m.partie === p).length;
  const lectureSeule = fc.fiche.statut === 'validee';

  async function terminer() {
    setEncours(true);
    const m = await terminerFiche(ficheId, items, () => enregistrerArrivee(positionNavigateur, () => new Date(), 15000));
    setEncours(false);
    if (m.length) setManquesAffiches(m); else apresTerminer();
  }

  function allerA(m: Manque) {
    setManquesAffiches(null); setPartie(m.partie);
    const cible = m.cle.includes(':') ? m.cle.split(':').slice(1).join(':') : '';
    setTimeout(() => document.getElementById(m.partie === 2 ? `item-${cible}` : `module-${cible}`)?.scrollIntoView({ block: 'center' }), 50);
  }

  if (manquesAffiches) return <Manques manques={manquesAffiches} allerA={allerA} fermer={() => setManquesAffiches(null)} />;

  return (
    <div className="page fiche">
      <div className="entete">
        <button className="petit" onClick={retour}>← Liste</button>
        <strong>{dab?.code}</strong>
        <span className={`pastille ${fc.fiche.statut}`}>{fc.fiche.statut === 'terminee' ? 'Terminée' : fc.fiche.statut === 'renvoyee' ? 'À reprendre' : fc.fiche.statut === 'validee' ? 'Validée' : 'En cours'}</span>
      </div>
      {fc.fiche.statut === 'renvoyee' && fc.fiche.motif_renvoi && <p className="erreur">Renvoyée : {fc.fiche.motif_renvoi}</p>}
      <nav className="onglets">
        {PARTIES.map((p, i) => (
          <button key={p} className={partie === i + 1 ? 'actif' : ''} onClick={() => { setPartie(i + 1); window.scrollTo(0, 0); }}>
            {i + 1}. {p}<br /><small>{parPartie(i + 1) ? `${parPartie(i + 1)} à faire` : '✓'}</small>
          </button>
        ))}
      </nav>
      <fieldset disabled={lectureSeule}>
        {partie === 1 && <Identification fiche={fc.fiche} dab={dab} />}
        {partie === 2 && <Preventif ficheId={ficheId} items={items} reponses={fc.reponses} />}
        {partie === 3 && <Mecanique ficheId={ficheId} etats={fc.etats} pieces={fc.pieces} />}
        {partie === 4 && <Systeme fiche={fc.fiche} />}
        {partie === 5 && <Cloture fiche={fc.fiche} />}
      </fieldset>
      <div className="ligne bas">
        {partie > 1 && <button onClick={() => { setPartie(partie - 1); window.scrollTo(0, 0); }}>← Précédent</button>}
        {partie < 5 && <button onClick={() => { setPartie(partie + 1); window.scrollTo(0, 0); }}>Suivant →</button>}
      </div>
      {!lectureSeule && (
        <button className="principal" disabled={encours} onClick={terminer}>
          {encours ? 'Vérification…' : manques.length ? `Terminer la fiche (${manques.length} à faire)` : 'Terminer la fiche'}
        </button>
      )}
    </div>
  );
}
