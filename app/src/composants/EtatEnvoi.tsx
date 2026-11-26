import { useLiveQuery } from 'dexie-react-hooks';
import { Icone } from './Icone';
import { db } from '../local/db';

const NOMS: Record<string, string> = { dab: 'DAB', fiches: 'Fiche', reponses: 'Réponse', etats: 'État de module', pieces: 'Pièce', photos: 'Photo' };

/** Ce qui a été refusé, avec le motif du serveur : à montrer à Yousri si cela ne part toujours pas. */
function DetailRefus() {
  const refus = useLiveQuery(async () => {
    const l: string[] = [];
    for (const [t, nom] of Object.entries(NOMS))
      for (const r of await db.table(t).where('sync').equals('rejete').toArray() as { rejet?: string; code?: string; cible?: string; item_id?: string }[])
        l.push(`${nom}${r.code ? ` ${r.code}` : r.cible ? ` ${r.cible}` : r.item_id ? ` ${r.item_id}` : ''} : ${r.rejet ?? 'motif inconnu'}`);
    return l;
  }, []) ?? [];
  if (!refus.length) return null;
  return <details className="detail-refus"><summary>Voir le détail</summary><ul>{refus.slice(0, 30).map((r, i) => <li key={i}>{r}</li>)}</ul></details>;
}

/** Bandeau pleine largeur, seulement quand il faut agir : refus, hors ligne, reconnexion. */
export function EtatEnvoi(props: { attente: number; refuses: number; enLigne: boolean; erreur?: string; lancer: () => void; reconnecter: () => void }) {
  const { attente, refuses, enLigne, erreur, reconnecter } = props;
  return <>
    {refuses > 0 && <div className="etat-envoi hors">{refuses} élément{refuses > 1 ? 's' : ''} refusé{refuses > 1 ? 's' : ''} par le serveur, gardé{refuses > 1 ? 's' : ''} sur la tablette et renvoyé{refuses > 1 ? 's' : ''} à chaque envoi. Continuez votre travail ; si cela persiste, montrez ce détail à Yousri.<DetailRefus /></div>}
    {!enLigne && <p className="etat-envoi hors">Pas de réseau — vos saisies sont gardées sur la tablette ({attente} en attente)</p>}
    {enLigne && erreur === 'session' && (
      <p className="etat-envoi hors">Reconnectez-vous pour envoyer les {attente} éléments en attente. Rien n'est perdu.
        <button className="petit" onClick={reconnecter}>Se reconnecter</button></p>)}
  </>;
}

/** Pastille de l'accueil : où en est l'envoi ; touchée, elle envoie tout de suite. */
export function PastilleEnvoi({ attente, enLigne, lancer }: { attente: number; enLigne: boolean; lancer: () => void }) {
  if (!enLigne) return <button className="pastille-envoi hors" disabled><Icone nom="horsLigne" taille={18} />Hors ligne</button>;
  if (attente === 0) return <button className="pastille-envoi ok" onClick={lancer}><Icone nom="coche" taille={18} />Tout est envoyé</button>;
  return <button className="pastille-envoi attente" onClick={lancer}><Icone nom="envoi" taille={18} />{attente} en attente, envoyer</button>;
}
