import { useEffect, useRef, useState } from 'react';
import { vibrer } from '../../lib/tactile';
import { ecrireChoix, lireChoix, nettoyerNombre } from '../../domaine/choix';

type Clavier = 'texte' | 'nombre' | 'sn';

/** Grand champ de saisie, enregistré à chaque frappe. Ne se réécrit pas pendant que l'on tape. */
export function Champ({ libelle, valeur, enregistrer, clavier = 'texte', multi = false, aide, suffixe, phrases, chiffres = false }: {
  libelle: string; valeur?: string; enregistrer: (v: string) => void; clavier?: Clavier; multi?: boolean; aide?: string;
  suffixe?: string; phrases?: string[]; chiffres?: boolean;
}) {
  const [v, setV] = useState(valeur ?? '');
  const enCours = useRef(false);
  useEffect(() => { if (!enCours.current) setV(valeur ?? ''); }, [valeur]);
  const maj = (x: string) => { const n = chiffres ? nettoyerNombre(x) : x; setV(n); enregistrer(n); };
  const commun = {
    value: v, onChange: (e: { target: { value: string } }) => maj(e.target.value),
    onFocus: () => { enCours.current = true; }, onBlur: () => { enCours.current = false; },
    spellCheck: clavier === 'texte', autoCorrect: clavier === 'texte' ? 'on' : 'off',
  };
  return (
    <div className="champ">
      <label className="champ-libelle">{libelle}{aide && <span className="champ-aide">{aide}</span>}
        <span className="champ-zone">
          {multi
            ? <textarea rows={3} enterKeyHint="done" {...commun} />
            : <input type="text" enterKeyHint="next" {...commun}
                inputMode={clavier === 'nombre' ? 'decimal' : 'text'}
                autoCapitalize={clavier === 'sn' ? 'characters' : 'sentences'} />}
          {suffixe && <span className="champ-suffixe">{suffixe}</span>}
        </span>
      </label>
      {phrases && (
        <div className="pastilles" role="group" aria-label="Phrases rapides">
          {phrases.map((p) => (
            <button key={p} type="button" className="pastille-choix ajout"
              onClick={() => { vibrer(); maj(v.trim() ? `${v.trim()}, ${p.toLowerCase()}` : p); }}>+ {p}</button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Choix exclusif en gros boutons. */
export function Choix<T extends string | boolean>({ libelle, options, valeur, choisir, ton }: {
  libelle?: string; options: [T, string][]; valeur?: T; choisir: (v: T) => void; ton?: (v: T) => string;
}) {
  return (
    <div className="choix-bloc">
      {libelle && <p className="champ-libelle">{libelle}</p>}
      <div className="segments" role="radiogroup" aria-label={libelle}>
        {options.map(([o, l]) => (
          <button key={String(o)} type="button" role="radio" aria-checked={valeur === o}
            className={`segment ${ton?.(o) ?? ''} ${valeur === o ? 'actif' : ''}`} onClick={() => { vibrer(); choisir(o); }}>{l}</button>
        ))}
      </div>
    </div>
  );
}

export const OuiNon = ({ libelle, valeur, enregistrer }: { libelle: string; valeur?: boolean; enregistrer: (v: boolean) => void }) => (
  <Choix<boolean> libelle={libelle} options={[[true, 'Oui'], [false, 'Non']]} valeur={valeur} choisir={enregistrer} />
);

const Pastille = ({ actif, onClick, children }: { actif: boolean; onClick: () => void; children: string }) => (
  <button type="button" aria-pressed={actif} className={actif ? 'pastille-choix actif' : 'pastille-choix'} onClick={() => { vibrer(); onClick(); }}>{children}</button>
);

/** Un choix à toucher parmi une liste. La saisie au clavier n'apparaît que si l'on touche « Autre ». */
export function ChoixOuAutre({ libelle, options, valeur, enregistrer, aide }: {
  libelle: string; options: string[]; valeur?: string; enregistrer: (v: string) => void; aide?: string;
}) {
  const horsListe = !!valeur && !options.includes(valeur);
  const [autre, setAutre] = useState(horsListe);
  useEffect(() => { if (horsListe) setAutre(true); }, [horsListe]);
  return (
    <div className="champ">
      <p className="champ-libelle">{libelle}{aide && <span className="champ-aide">{aide}</span>}</p>
      <div className="pastilles" role="group" aria-label={libelle}>
        {options.map((o) => (
          <Pastille key={o} actif={!autre && valeur === o} onClick={() => { setAutre(false); enregistrer(valeur === o ? '' : o); }}>{o}</Pastille>
        ))}
        <Pastille actif={autre} onClick={() => { if (autre) { setAutre(false); if (horsListe) enregistrer(''); } else { setAutre(true); enregistrer(''); } }}>Autre</Pastille>
      </div>
      {autre && <Champ libelle="Précisez" valeur={horsListe ? valeur : ''} enregistrer={enregistrer} />}
    </div>
  );
}

/** Plusieurs choix à toucher ; « Autre » ajoute une précision écrite après les choix. */
export function ChoixMultiple({ libelle, options, valeur, enregistrer, aide }: {
  libelle: string; options: string[]; valeur?: string; enregistrer: (v: string) => void; aide?: string;
}) {
  const { choisis, autre } = lireChoix(valeur, options);
  const [ouvert, setOuvert] = useState(!!autre);
  useEffect(() => { if (autre) setOuvert(true); }, [autre]);
  const basculer = (o: string) => enregistrer(ecrireChoix(choisis.includes(o) ? choisis.filter((x) => x !== o) : [...choisis, o], autre, options));
  return (
    <div className="champ">
      <p className="champ-libelle">{libelle}{aide && <span className="champ-aide">{aide}</span>}</p>
      <div className="pastilles" role="group" aria-label={libelle}>
        {options.map((o) => <Pastille key={o} actif={choisis.includes(o)} onClick={() => basculer(o)}>{o}</Pastille>)}
        <Pastille actif={ouvert} onClick={() => { if (ouvert) { setOuvert(false); if (autre) enregistrer(ecrireChoix(choisis, '', options)); } else setOuvert(true); }}>Autre</Pastille>
      </div>
      {ouvert && <Champ libelle="Précisez" valeur={autre} enregistrer={(v) => enregistrer(ecrireChoix(choisis, v, options))} />}
    </div>
  );
}

/** Sortie de la règle (plaque illisible, système inaccessible…) : jamais bloquant, mais toujours avec un motif. */
export function Exception({ libelle, actif, basculer, motifs, motif, enregistrerMotif }: {
  libelle: string; actif: boolean; basculer: (v: boolean) => void; motifs?: string[]; motif?: string; enregistrerMotif?: (v: string) => void;
}) {
  return (
    <div className={actif ? 'exception actif' : 'exception'}>
      <button type="button" className={actif ? 'pastille-choix attention actif' : 'pastille-choix'} aria-pressed={actif}
        onClick={() => { vibrer(); basculer(!actif); }}>{libelle}</button>
      {actif && motifs && enregistrerMotif && <ChoixOuAutre libelle="Pourquoi ?" options={motifs} valeur={motif} enregistrer={enregistrerMotif} />}
    </div>
  );
}
