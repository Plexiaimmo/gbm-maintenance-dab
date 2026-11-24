import { useEffect, useState } from 'react';

/** Champ texte enregistré à chaque frappe (la base locale est rapide). */
export function Champ({ libelle, valeur, enregistrer, type = 'text', multi = false, aide }: {
  libelle: string; valeur?: string; enregistrer: (v: string) => void; type?: string; multi?: boolean; aide?: string;
}) {
  const [v, setV] = useState(valeur ?? '');
  useEffect(() => setV(valeur ?? ''), [valeur]);
  const maj = (x: string) => { setV(x); enregistrer(x); };
  return (
    <label>{libelle}{aide && <small className="discret"> — {aide}</small>}
      {multi ? <textarea rows={3} value={v} onChange={(e) => maj(e.target.value)} />
        : <input type={type} inputMode={type === 'number' ? 'decimal' : undefined} value={v} onChange={(e) => maj(e.target.value)} />}
    </label>
  );
}

export function OuiNon({ libelle, valeur, enregistrer }: { libelle: string; valeur?: boolean; enregistrer: (v: boolean) => void }) {
  return (
    <div className="question"><span>{libelle}</span>
      <div className="ligne choix">
        <button type="button" className={valeur === true ? 'actif' : ''} onClick={() => enregistrer(true)}>Oui</button>
        <button type="button" className={valeur === false ? 'actif' : ''} onClick={() => enregistrer(false)}>Non</button>
      </div>
    </div>
  );
}
