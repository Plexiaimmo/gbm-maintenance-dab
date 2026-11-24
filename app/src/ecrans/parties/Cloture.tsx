import type { Fiche } from '../../domaine/types';
import { majPartie } from '../../local/fiches';
import { BoutonPhoto } from '../../composants/BoutonPhoto';
import { Signature } from '../../composants/Signature';
import { Champ, Choix } from './Commun';

export function Cloture({ fiche }: { fiche: Fiche }) {
  const c = fiche.cloture;
  const maj = (p: Partial<Fiche['cloture']>) => majPartie(fiche.id, 'cloture', p);
  return (
    <section>
      <h2>Ticket test</h2>
      <BoutonPhoto ficheId={fiche.id} cible="ticket" libelle="Photographier le ticket test" />
      <h2>Mesures électriques</h2>
      <div className="deux-colonnes">
        <Champ libelle="Phase-neutre" clavier="nombre" suffixe="V" valeur={c.tension_phase_neutre} enregistrer={(v) => maj({ tension_phase_neutre: v })} />
        <Champ libelle="Neutre-terre" clavier="nombre" suffixe="V" valeur={c.tension_neutre_terre} enregistrer={(v) => maj({ tension_neutre_terre: v })} />
      </div>
      <BoutonPhoto ficheId={fiche.id} cible="multimetre" libelle="Photographier le multimètre" />
      <h2>Gestionnaire de l'agence</h2>
      <Choix<boolean> options={[[false, 'Présent, il signe'], [true, 'Absent ou refus']]} valeur={!!c.gestionnaire_absent}
        choisir={(v) => maj({ gestionnaire_absent: v })} />
      {c.gestionnaire_absent ? <>
        <Champ libelle="Motif" multi valeur={c.motif_absence} enregistrer={(v) => maj({ motif_absence: v })}
          phrases={['Gestionnaire absent', 'Refus de signer', 'Agence fermée', 'Personne habilitée absente']} />
        <BoutonPhoto ficheId={fiche.id} cible="site_absent" libelle="Photographier le site" />
      </> : <>
        <Champ libelle="Nom du gestionnaire" valeur={c.gestionnaire_nom} enregistrer={(v) => maj({ gestionnaire_nom: v })} />
        <Signature ficheId={fiche.id} />
      </>}
    </section>
  );
}
