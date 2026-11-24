import type { Fiche } from '../../domaine/types';
import { majFiche } from '../../local/fiches';
import { BoutonPhoto } from '../../composants/BoutonPhoto';
import { Signature } from '../../composants/Signature';
import { Champ } from './Commun';

export function Cloture({ fiche }: { fiche: Fiche }) {
  const c = fiche.cloture;
  const maj = (p: Partial<Fiche['cloture']>) => majFiche(fiche.id, { cloture: { ...c, ...p } });
  return (
    <section>
      <h3>Ticket test</h3>
      <BoutonPhoto ficheId={fiche.id} cible="ticket" libelle="Photographier le ticket test" />
      <h3>Mesures électriques</h3>
      <Champ libelle="Tension phase-neutre (V)" type="number" valeur={c.tension_phase_neutre} enregistrer={(v) => maj({ tension_phase_neutre: v })} />
      <Champ libelle="Tension neutre-terre (V)" type="number" valeur={c.tension_neutre_terre} enregistrer={(v) => maj({ tension_neutre_terre: v })} />
      <BoutonPhoto ficheId={fiche.id} cible="multimetre" libelle="Photographier le multimètre" />
      <h3>Gestionnaire de l'agence</h3>
      <div className="ligne choix">
        <button type="button" className={!c.gestionnaire_absent ? 'actif' : ''} onClick={() => maj({ gestionnaire_absent: false })}>Présent, il signe</button>
        <button type="button" className={c.gestionnaire_absent ? 'actif' : ''} onClick={() => maj({ gestionnaire_absent: true })}>Absent ou refus</button>
      </div>
      {c.gestionnaire_absent ? <>
        <Champ libelle="Motif" multi valeur={c.motif_absence} enregistrer={(v) => maj({ motif_absence: v })} />
        <BoutonPhoto ficheId={fiche.id} cible="site_absent" libelle="Photographier le site" />
      </> : <>
        <Champ libelle="Nom du gestionnaire" valeur={c.gestionnaire_nom} enregistrer={(v) => maj({ gestionnaire_nom: v })} />
        <Signature ficheId={fiche.id} />
      </>}
    </section>
  );
}
