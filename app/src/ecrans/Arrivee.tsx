import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../local/db';
import { creerFiche } from '../local/fiches';
import { enregistrerArrivee, positionNavigateur } from '../domaine/arrivee';

/** Confirmation d'arrivée : obligatoire avant de remplir la fiche. */
export function Arrivee({ dabId, consultantId, ouverte, annuler }: {
  dabId: string; consultantId: string; ouverte: (ficheId: string) => void; annuler: () => void;
}) {
  const dab = useLiveQuery(() => db.dab.get(dabId), [dabId]);
  const [encours, setEncours] = useState(false);
  async function arriver() {
    setEncours(true);
    const a = await enregistrerArrivee(positionNavigateur, () => new Date());
    ouverte(await creerFiche(dabId, consultantId, a));
  }
  return (
    <div className="page">
      <h1>{dab?.code}</h1>
      <p>{dab?.modele} · {dab?.ville}</p>
      <p className="info">Touchez « Je suis arrivé » une fois devant le DAB. L'heure et la position sont enregistrées automatiquement.</p>
      <button className="principal" disabled={encours} onClick={arriver}>{encours ? 'Recherche de la position…' : 'Je suis arrivé'}</button>
      <button onClick={annuler}>Annuler</button>
    </div>
  );
}
