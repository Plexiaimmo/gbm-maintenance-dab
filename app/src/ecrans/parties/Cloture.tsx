import type { Fiche } from '../../domaine/types';
import { majPartie } from '../../local/fiches';
import { BoutonPhoto } from '../../composants/BoutonPhoto';
import { Signature } from '../../composants/Signature';
import { Champ, Choix, ChoixOuAutre, Exception } from './Commun';
import type { recapitulatif } from '../../domaine/tournee';

export function Cloture({ fiche, recap }: { fiche: Fiche; recap: ReturnType<typeof recapitulatif> }) {
  const c = fiche.cloture;
  const maj = (p: Partial<Fiche['cloture']>) => majPartie(fiche.id, 'cloture', p);
  return (
    <section>
      <h2>Ticket test</h2>
      {!c.ticket_impossible && <BoutonPhoto ficheId={fiche.id} cible="ticket" libelle="Photographier le ticket test" />}
      <Exception libelle="Pas de ticket possible" actif={!!c.ticket_impossible} basculer={(v) => maj({ ticket_impossible: v })}
        motif={c.motif_ticket} enregistrerMotif={(v) => maj({ motif_ticket: v })}
        motifs={['Imprimante en panne', 'Plus de papier', 'DAB hors service', 'Pas d’accès au mode test']} />
      <h2>Gestionnaire de l'agence</h2>
      <Choix<boolean> options={[[false, 'Présent, il signe'], [true, 'Absent ou refus']]} valeur={!!c.gestionnaire_absent}
        choisir={(v) => maj({ gestionnaire_absent: v })} />
      {c.gestionnaire_absent ? <>
        <ChoixOuAutre libelle="Motif" options={['Gestionnaire absent', 'Refus de signer', 'Agence fermée', 'Personne habilitée absente']}
          valeur={c.motif_absence} enregistrer={(v) => maj({ motif_absence: v })} />
        <BoutonPhoto ficheId={fiche.id} cible="site_absent" libelle="Photographier le site" />
      </> : <>
        <Champ libelle="Nom du gestionnaire" valeur={c.gestionnaire_nom} enregistrer={(v) => maj({ gestionnaire_nom: v })} />
        <Signature ficheId={fiche.id} />
      </>}
      <div className="recap">
        <h2>À vérifier avant d'envoyer</h2>
        {recap.pasOk.length > 0
          ? <p className="rouge">{recap.pasOk.length} point{recap.pasOk.length > 1 ? 's' : ''} pas OK : {recap.pasOk.join(', ')}</p>
          : <p>Aucun point pas OK au préventif</p>}
        {recap.pieces.length > 0 && <p className="ambre">Pièces à prévoir : {recap.pieces.join(', ')}</p>}
        <p>{recap.photos} photo{recap.photos > 1 ? 's' : ''}{recap.numeroSerie ? `, n° de série ${recap.numeroSerie}` : ''}</p>
      </div>
    </section>
  );
}
