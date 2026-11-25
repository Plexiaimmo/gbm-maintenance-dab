import { useLiveQuery } from 'dexie-react-hooks';
import type { Dab, Fiche } from '../../domaine/types';
import { db } from '../../local/db';
import { normaliserSN } from '../../domaine/sn';
import { majPartie } from '../../local/fiches';
import { BoutonPhoto } from '../../composants/BoutonPhoto';
import { Champ, ChoixOuAutre } from './Commun';

const MARQUES = ['Wincor Nixdorf', 'Diebold Nixdorf', 'NCR', 'Hyosung', 'GRG'];
const MODELES = ['ProCash 280', 'ProCash 2050xe', 'ProCash 2100xe', 'ProCash 2250xe', 'ProCash 285', 'CINEO C4060'];

export function Identification({ fiche, dab }: { fiche: Fiche; dab?: Dab }) {
  const id = fiche.identification;
  const maj = (patch: Partial<Fiche['identification']>) => majPartie(fiche.id, 'identification', patch);
  const site = useLiveQuery(async () => (dab?.site_id ? db.sites.get(dab.site_id) : undefined), [dab?.site_id]);
  const banques = useLiveQuery(() => db.banques.toArray(), []) ?? [];
  const banqueListe = banques.find((b) => b.id === site?.banque_id)?.code ?? dab?.agence_saisie?.split(' — ')[0];
  const agenceListe = site?.nom ?? dab?.agence_saisie?.split(' — ')[1];
  const sites = useLiveQuery(() => db.sites.toArray(), []) ?? [];
  const banqueChoisie = banques.find((b) => b.code === (id.banque || banqueListe))?.id;
  const agencesDeLaBanque = [...new Set(sites.filter((x) => x.banque_id === banqueChoisie).map((x) => x.nom))].sort((a, b) => a.localeCompare(b, 'fr'));
  const marqueInconnue = !dab?.marque || /vérifier/i.test(dab?.modele ?? '');
  const dansListe = (v?: string | null) => `Dans la liste : ${v || 'non renseigné'}. Laissez vide si c'est juste.`;
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
      <ChoixOuAutre libelle="Modèle exact" valeur={id.modele} enregistrer={(v) => maj({ modele: v })}
        options={[...new Set([dab?.modele, ...MODELES].filter((m) => m && !/vérifier/i.test(m)) as string[])]} />
      <h2>La liste est-elle juste ?</h2>
      <p className={marqueInconnue ? 'bandeau-info attention' : 'consigne'}>
        {marqueInconnue ? 'La marque de ce DAB est inconnue : indiquez-la. ' : ''}Corrigez seulement ce qui est différent de ce que vous voyez sur place.
      </p>
      <ChoixOuAutre libelle="Marque" aide={dansListe(marqueInconnue ? null : dab?.marque)} valeur={id.marque} enregistrer={(v) => maj({ marque: v })} options={MARQUES} />
      <Champ libelle="Code affiché sur le DAB" aide={dansListe(dab?.code)} clavier="sn" valeur={id.code_affiche} enregistrer={(v) => maj({ code_affiche: v.toUpperCase() })} />
      <ChoixOuAutre libelle="Banque" aide={dansListe(banqueListe)} valeur={id.banque} enregistrer={(v) => maj({ banque: v, ...(v ? { agence: '' } : {}) })}
        options={banques.map((b) => b.code).filter((c) => c !== 'TEST')} />
      <ChoixOuAutre libelle="Agence" aide={dansListe(agenceListe)} valeur={id.agence} enregistrer={(v) => maj({ agence: v })} options={agencesDeLaBanque} />
      <Champ libelle="Autre chose à corriger" aide="facultatif" multi valeur={id.corrections} enregistrer={(v) => maj({ corrections: v })} />
    </section>
  );
}
