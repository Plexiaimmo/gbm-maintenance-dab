import type { Dab, Fiche } from '../../domaine/types';
import { normaliserSN } from '../../domaine/sn';
import { majFiche } from '../../local/fiches';
import { BoutonPhoto } from '../../composants/BoutonPhoto';
import { Champ } from './Commun';

export function Identification({ fiche, dab }: { fiche: Fiche; dab?: Dab }) {
  const id = fiche.identification;
  const maj = (patch: Partial<Fiche['identification']>) => majFiche(fiche.id, { identification: { ...id, ...patch } });
  return (
    <section>
      <p className="info">Arrivée enregistrée à {new Date(fiche.arrivee_at).toLocaleTimeString('fr-FR')}
        {fiche.gps_motif ? ' — position GPS non obtenue' : ' avec la position GPS'}.</p>
      <p><strong>{dab?.code}</strong> · {dab?.ville}</p>
      <Champ libelle="Modèle exact" valeur={id.modele} enregistrer={(v) => maj({ modele: v })} />
      <h3>Plaque du numéro de série</h3>
      <BoutonPhoto ficheId={fiche.id} cible="plaque" libelle="Photographier la plaque" />
      <Champ libelle="Numéro de série (tel qu'écrit sur la plaque)" valeur={id.numero_serie}
        enregistrer={(v) => maj({ numero_serie: normaliserSN(v) ?? '' })} />
      <Champ libelle="Autres corrections (facultatif)" multi valeur={id.corrections} enregistrer={(v) => maj({ corrections: v })} />
    </section>
  );
}
