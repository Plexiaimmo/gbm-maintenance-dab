import type { Fiche } from '../../domaine/types';
import { majFiche } from '../../local/fiches';
import { BoutonPhoto } from '../../composants/BoutonPhoto';
import { Champ, OuiNon } from './Commun';

export function Systeme({ fiche }: { fiche: Fiche }) {
  const s = fiche.systeme;
  const maj = (p: Partial<Fiche['systeme']>) => majFiche(fiche.id, { systeme: { ...s, ...p } });
  return (
    <section>
      <Champ libelle="Version de Windows" valeur={s.version_windows} enregistrer={(v) => maj({ version_windows: v })} aide="ex. Windows 10 IoT LTSC" />
      <Champ libelle="Logiciel applicatif" valeur={s.logiciel} enregistrer={(v) => maj({ logiciel: v })} aide="ex. ProTopas, ProCash/NDC" />
      <Champ libelle="Version du logiciel" valeur={s.logiciel_version} enregistrer={(v) => maj({ logiciel_version: v })} />
      <OuiNon libelle="Date et heure système correctes ?" valeur={s.heure_correcte} enregistrer={(v) => maj({ heure_correcte: v })} />
      <Champ libelle="Espace disque libre (Go)" type="number" valeur={s.espace_disque_go} enregistrer={(v) => maj({ espace_disque_go: v })} />
      <h3>Journal d'erreurs</h3>
      <BoutonPhoto ficheId={fiche.id} cible="journal" libelle="Photographier l'écran du journal" />
      <Champ libelle="Résultat du test interne des modules" multi valeur={s.test_interne} enregistrer={(v) => maj({ test_interne: v })} aide="modules en erreur, ou « tous OK »" />
      <OuiNon libelle="Dispositif anti-skimming présent ?" valeur={s.antiskimming} enregistrer={(v) => maj({ antiskimming: v })} />
      {s.antiskimming && <BoutonPhoto ficheId={fiche.id} cible="antiskimming" libelle="Photographier le dispositif" />}
    </section>
  );
}
