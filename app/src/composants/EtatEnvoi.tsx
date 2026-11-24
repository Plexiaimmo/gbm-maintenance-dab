export function EtatEnvoi({ attente, enLigne, erreur, lancer }: { attente: number; enLigne: boolean; erreur?: string; lancer: () => void }) {
  if (!enLigne) return <p className="etat-envoi hors">Pas de réseau — vos saisies sont gardées sur la tablette ({attente} en attente)</p>;
  if (erreur === 'session') return <p className="etat-envoi hors">Reconnectez-vous pour envoyer les {attente} éléments en attente. Rien n'est perdu.</p>;
  if (attente === 0) return <p className="etat-envoi ok">✓ Tout est envoyé</p>;
  return (
    <p className="etat-envoi attente">{attente} élément{attente > 1 ? 's' : ''} en attente d'envoi
      <button className="petit" onClick={lancer}>Envoyer maintenant</button></p>
  );
}
