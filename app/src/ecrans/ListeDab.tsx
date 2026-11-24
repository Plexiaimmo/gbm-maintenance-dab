import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../local/db';
import type { Fiche } from '../domaine/types';

const LIBELLE: Record<Fiche['statut'], string> = { brouillon: 'En cours', terminee: 'Terminée', validee: 'Validée', renvoyee: 'À reprendre' };

export function ListeDab({ ouvrir, nouveau }: { ouvrir: (dabId: string) => void; nouveau: () => void }) {
  const [texte, setTexte] = useState('');
  const [ville, setVille] = useState('');
  const dabs = useLiveQuery(() => db.dab.toArray(), []) ?? [];
  const sites = useLiveQuery(() => db.sites.toArray(), []) ?? [];
  const banques = useLiveQuery(() => db.banques.toArray(), []) ?? [];
  const fiches = useLiveQuery(() => db.fiches.toArray(), []) ?? [];

  const lignes = useMemo(() => {
    const t = texte.trim().toLowerCase();
    return dabs.map((d) => {
      const s = sites.find((x) => x.id === d.site_id);
      const b = banques.find((x) => x.id === s?.banque_id);
      const f = fiches.filter((x) => x.dab_id === d.id).sort((a, b2) => b2.arrivee_at.localeCompare(a.arrivee_at))[0];
      return { d, agence: s?.nom ?? '', banque: b?.code ?? '', f };
    }).filter((l) => (!ville || l.d.ville === ville)
      && (!t || [l.d.code, l.agence, l.banque, l.d.numero_serie ?? ''].some((v) => v.toLowerCase().includes(t))))
      .sort((a, b) => a.d.code.localeCompare(b.d.code));
  }, [dabs, sites, banques, fiches, texte, ville]);

  return (
    <div className="page">
      <h1>DAB Wincor</h1>
      <input placeholder="Rechercher : code, agence, banque, n° de série" value={texte} onChange={(e) => setTexte(e.target.value)} />
      <div className="ligne choix">
        {['', 'Brazzaville', 'Pointe-Noire'].map((v) => (
          <button key={v} className={ville === v ? 'actif' : ''} onClick={() => setVille(v)}>{v || 'Toutes les villes'}</button>
        ))}
      </div>
      <p className="discret">{lignes.length} DAB</p>
      <ul className="liste">
        {lignes.map(({ d, agence, banque, f }) => (
          <li key={d.id}>
            <button className="carte" onClick={() => ouvrir(d.id)}>
              <strong>{d.code}</strong> <span className="discret">{banque} · {agence || 'agence ?'} · {d.ville}</span>
              <span className="discret">{d.modele}{d.origine === 'nouveau_a_verifier' ? ' · nouveau, à vérifier' : ''}</span>
              {f && <span className={`pastille ${f.statut}`}>{LIBELLE[f.statut]}</span>}
            </button>
          </li>
        ))}
      </ul>
      <button onClick={nouveau}>➕ DAB absent de la liste</button>
    </div>
  );
}
