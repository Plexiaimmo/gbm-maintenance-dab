export function EtatEnvoi(props: { attente: number; refuses: number; enLigne: boolean; erreur?: string; lancer: () => void; reconnecter: () => void }) {
  return <>{props.refuses > 0 && <p className="etat-envoi hors">{props.refuses} élément{props.refuses > 1 ? 's' : ''} refusé{props.refuses > 1 ? 's' : ''} par le serveur — gardé{props.refuses > 1 ? 's' : ''} sur la tablette. Prévenez Yousri.</p>}<Bandeau {...props} /></>;
}

function Bandeau({ attente, enLigne, erreur, lancer, reconnecter }: { attente: number; enLigne: boolean; erreur?: string; lancer: () => void; reconnecter: () => void }) {
  if (!enLigne) return <p className="etat-envoi hors">Pas de réseau — vos saisies sont gardées sur la tablette ({attente} en attente)</p>;
  if (erreur === 'session') return (
    <p className="etat-envoi hors">Reconnectez-vous pour envoyer les {attente} éléments en attente. Rien n'est perdu.
      <button className="petit" onClick={reconnecter}>Se reconnecter</button></p>);
  if (attente === 0) return <p className="etat-envoi ok">✓ Tout est envoyé</p>;
  return (
    <p className="etat-envoi attente">{attente} élément{attente > 1 ? 's' : ''} en attente d'envoi
      <button className="petit" onClick={lancer}>Envoyer maintenant</button></p>
  );
}
