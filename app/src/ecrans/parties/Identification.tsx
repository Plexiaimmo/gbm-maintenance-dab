import type { Dab, Fiche } from '../../domaine/types';
import { normaliserSN } from '../../domaine/sn';
import { majFiche } from '../../local/fiches';
import { BoutonPhoto } from '../../composants/BoutonPhoto';
import { Champ } from './Commun';

const MODELES = ['ProCash 280', 'ProCash 2050xe', 'ProCash 2100xe', 'ProCash 2250xe', 'ProCash 285', 'CINEO C4060'];

export function Identification({ fiche, dab }: { fiche: Fiche; dab?: Dab }) {
  const id = fiche.identification;
  const maj = (patch: Partial<Fiche['identification']>) => majFiche(fiche.id, { identification: { ...id, ...patch } });
  return (
    <section>
      <p className={fiche.gps_motif ? 'bandeau-info attention' : 'bandeau-info'}>
        Arrivée enregistrée à {new Date(fiche.arrivee_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
        {fiche.gps_motif ? ', sans position GPS' : ', avec la position GPS'}.
      </p>
      <h2>Plaque du numéro de série</h2>
      <BoutonPhoto ficheId={fiche.id} cible="plaque" libelle="Photographier la plaque" />
      <Champ libelle="Numéro de série" aide="tel qu'écrit sur la plaque" clavier="sn" valeur={id.numero_serie}
        enregistrer={(v) => maj({ numero_serie: normaliserSN(v) ?? '' })} />
      <Champ libelle="Modèle exact" valeur={id.modele} enregistrer={(v) => maj({ modele: v })}
        suggestions={[...new Set([dab?.modele, ...MODELES].filter(Boolean) as string[])]} />
      <Champ libelle="Autre chose à corriger" aide="facultatif" multi valeur={id.corrections} enregistrer={(v) => maj({ corrections: v })} />
    </section>
  );
}
