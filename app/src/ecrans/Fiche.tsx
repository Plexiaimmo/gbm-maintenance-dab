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
import { allerVers, useEcranAllume } from '../lib/tactile';
import { recapitulatif } from '../domaine/tournee';
import { Icone } from '../composants/Icone';

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
  const site = useLiveQuery(async () => (dab?.site_id ? db.sites.get(dab.site_id) : undefined), [dab?.site_id]);
  const articles = useLiveQuery(() => db.articles.toArray(), []) ?? [];
  useEcranAllume(!!fc && fc.fiche.statut !== 'validee');
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
    setTimeout(() => allerVers(m.partie === 2 ? `item-${cible}` : `module-${cible}`), 80);
  }

  if (manquesAffiches) return <Manques manques={manquesAffiches} allerA={allerA} fermer={() => setManquesAffiches(null)} />;

  const aller = (p: number) => { setPartie(p); window.scrollTo(0, 0); };
  return (
    <div className="fiche">
      <header className="fiche-entete">
        <div className="fiche-haut">
          <button className="rond" onClick={retour} aria-label="Retour à la liste"><Icone nom="retour" /></button>
          <div className="fiche-titre">
            <strong>{dab?.code}</strong>
            <span>{[site?.nom ?? dab?.agence_saisie, dab?.ville].filter(Boolean).join(', ')}{dab?.modele ? `. ${dab.modele}` : ''}</span>
          </div>
          <div className="fiche-compte">
            {lectureSeule ? <><b className="pret">Validée</b><span>lecture seule</span></>
              : manques.length ? <><b>{manques.length}</b><span>à faire</span></> : <><b className="pret">Prête</b><span>tout est rempli</span></>}
          </div>
        </div>
        <nav className="rail" aria-label="Parties de la fiche">
          {PARTIES.map((p, i) => {
            const reste = parPartie(i + 1);
            return (
              <button key={p} className={`rail-etape ${partie === i + 1 ? 'actif' : ''} ${reste ? '' : 'fini'}`} onClick={() => aller(i + 1)}
                aria-current={partie === i + 1 ? 'step' : undefined}>
                <span className="rail-nom">{p}</span>
                <span className="rail-etat">{reste ? `${reste} à faire` : 'Fait'}</span>
              </button>
            );
          })}
        </nav>
      </header>
      {fc.fiche.statut === 'renvoyee' && fc.fiche.motif_renvoi && <p className="bandeau-info alerte">À reprendre : {fc.fiche.motif_renvoi}</p>}
      <fieldset className="fiche-contenu" disabled={lectureSeule}>
        {partie === 1 && <Identification fiche={fc.fiche} dab={dab} />}
        {partie === 2 && <Preventif ficheId={ficheId} items={items} reponses={fc.reponses} />}
        {partie === 3 && <Mecanique ficheId={ficheId} etats={fc.etats} pieces={fc.pieces} />}
        {partie === 4 && <Systeme fiche={fc.fiche} />}
        {partie === 5 && <Cloture fiche={fc.fiche} recap={recapitulatif(fc, items, new Map(articles.map((a) => [a.pn, a.designation ?? a.pn])))} />}
      </fieldset>
      <div className="barre-pouce">
        <button className="pouce-nav" disabled={partie === 1} onClick={() => aller(partie - 1)}>Précédent</button>
        {!lectureSeule && (
          <button className={`pouce-terminer ${manques.length ? '' : 'pret'}`} disabled={encours} onClick={terminer}>
            {encours ? 'Vérification…' : manques.length ? <>Terminer la fiche<small>{manques.length} élément{manques.length > 1 ? 's' : ''} à faire</small></> : <><Icone nom="coche" />Terminer la fiche</>}
          </button>
        )}
        <button className="pouce-nav suivant" disabled={partie === 5} onClick={() => aller(partie + 1)}>Suivant</button>
      </div>
    </div>
  );
}
