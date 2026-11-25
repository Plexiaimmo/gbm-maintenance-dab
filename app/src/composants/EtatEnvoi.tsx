import { Icone } from './Icone';

/** Bandeau pleine largeur, seulement quand il faut agir : refus, hors ligne, reconnexion. */
export function EtatEnvoi(props: { attente: number; refuses: number; enLigne: boolean; erreur?: string; lancer: () => void; reconnecter: () => void }) {
  const { attente, refuses, enLigne, erreur, reconnecter } = props;
  return <>
    {refuses > 0 && <p className="etat-envoi hors">{refuses} élément{refuses > 1 ? 's' : ''} refusé{refuses > 1 ? 's' : ''} par le serveur — gardé{refuses > 1 ? 's' : ''} sur la tablette. Prévenez Yousri.</p>}
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
