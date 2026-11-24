import { useEffect, useRef, useState } from 'react';
import { vibrer } from '../../lib/tactile';

type Clavier = 'texte' | 'nombre' | 'sn';

/** Grand champ de saisie, enregistré à chaque frappe. Ne se réécrit pas pendant que l'on tape. */
export function Champ({ libelle, valeur, enregistrer, clavier = 'texte', multi = false, aide, suffixe, suggestions, phrases }: {
  libelle: string; valeur?: string; enregistrer: (v: string) => void; clavier?: Clavier; multi?: boolean; aide?: string;
  suffixe?: string; suggestions?: string[]; phrases?: string[];
}) {
  const [v, setV] = useState(valeur ?? '');
  const enCours = useRef(false);
  useEffect(() => { if (!enCours.current) setV(valeur ?? ''); }, [valeur]);
  const maj = (x: string) => { setV(x); enregistrer(x); };
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
      {suggestions && (
        <div className="pastilles" role="group" aria-label={`Choix rapides : ${libelle}`}>
          {suggestions.map((s) => (
            <button key={s} type="button" className={v === s ? 'pastille-choix actif' : 'pastille-choix'}
              onClick={() => { vibrer(); maj(s); }}>{s}</button>
          ))}
        </div>
      )}
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
