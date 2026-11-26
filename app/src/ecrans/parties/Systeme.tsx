import type { Fiche } from '../../domaine/types';
import { MODULES } from '../../domaine/types';
import { majPartie } from '../../local/fiches';
import { BoutonPhoto } from '../../composants/BoutonPhoto';
import { vibrer } from '../../lib/tactile';
import { Champ, ChoixOuAutre, Exception, OuiNon } from './Commun';

const WINDOWS = ['Windows 7', 'Windows 10', 'Windows 10 IoT LTSC', 'Windows 11 IoT'];
const LOGICIELS = ['ProTopas', 'ProCash/NDC', 'ProCash/DDC', 'ProFlex4'];

/** « Tous OK » ou la liste des modules en erreur, choisis au doigt. */
function TestInterne({ valeur, enregistrer }: { valeur?: string; enregistrer: (v: string) => void }) {
  const enErreur = valeur && valeur !== 'Tous OK' ? valeur.replace(/^En erreur : /, '').split(', ').filter(Boolean) : [];
  const basculer = (m: string) => {
    vibrer();
    const l = enErreur.includes(m) ? enErreur.filter((x) => x !== m) : [...enErreur, m];
    enregistrer(l.length ? `En erreur : ${l.join(', ')}` : '');
  };
  return (
    <div className="champ">
      <p className="champ-libelle">Test interne des modules</p>
      <div className="pastilles">
        <button type="button" className={valeur === 'Tous OK' ? 'pastille-choix ok actif' : 'pastille-choix ok'} onClick={() => { vibrer(); enregistrer('Tous OK'); }}>✓ Tous OK</button>
        {MODULES.map((m) => (
          <button key={m} type="button" className={enErreur.includes(m) ? 'pastille-choix nok actif' : 'pastille-choix'} onClick={() => basculer(m)}>{m}</button>
        ))}
      </div>
      {enErreur.length > 0 && <p className="champ-aide">Touchez les modules en erreur ; touchez à nouveau pour retirer.</p>}
    </div>
  );
}

export function Systeme({ fiche }: { fiche: Fiche }) {
  const s = fiche.systeme;
  const maj = (p: Partial<Fiche['systeme']>) => majPartie(fiche.id, 'systeme', p);
  return (
    <section>
      <Exception libelle="Je ne peux pas accéder au système" actif={!!s.acces_impossible} basculer={(v) => maj({ acces_impossible: v })}
        motif={s.motif_acces} enregistrerMotif={(v) => maj({ motif_acces: v })}
        motifs={['Pas de mot de passe', 'DAB éteint ou ne démarre pas', 'Refus de la banque', 'Écran ou clavier opérateur en panne']} />
      {!s.acces_impossible && <>
      <ChoixOuAutre libelle="Version de Windows" options={WINDOWS} valeur={s.version_windows} enregistrer={(v) => maj({ version_windows: v })} />
      <ChoixOuAutre libelle="Logiciel applicatif" options={LOGICIELS} valeur={s.logiciel} enregistrer={(v) => maj({ logiciel: v })} />
      <Champ libelle="Version du logiciel" clavier="nombre" valeur={s.logiciel_version} enregistrer={(v) => maj({ logiciel_version: v })} />
      <OuiNon libelle="Date et heure système correctes ?" valeur={s.heure_correcte} enregistrer={(v) => maj({ heure_correcte: v })} />
      <Champ libelle="Espace disque libre" clavier="nombre" chiffres suffixe="Go" valeur={s.espace_disque_go} enregistrer={(v) => maj({ espace_disque_go: v })} />
      <h2>Journal d'erreurs</h2>
      <BoutonPhoto ficheId={fiche.id} cible="journal" libelle="Photographier l'écran du journal" />
      <TestInterne valeur={s.test_interne} enregistrer={(v) => maj({ test_interne: v })} />
      </>}
      <OuiNon libelle="Dispositif anti-skimming présent ?" valeur={s.antiskimming} enregistrer={(v) => maj({ antiskimming: v })} />
      {s.antiskimming && <BoutonPhoto ficheId={fiche.id} cible="antiskimming" libelle="Photographier le dispositif" />}
    </section>
  );
}
