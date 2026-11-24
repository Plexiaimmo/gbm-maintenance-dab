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
      <h1>Quel DAB ?</h1>
      <input className="recherche" type="search" placeholder="Code, agence, banque ou n° de série" value={texte} onChange={(e) => setTexte(e.target.value)}
        enterKeyHint="search" autoCorrect="off" spellCheck={false} />
      <div className="segments">
        {['', 'Brazzaville', 'Pointe-Noire'].map((v) => (
          <button key={v} className={`segment ${ville === v ? 'actif' : ''}`} onClick={() => setVille(v)}>{v || 'Toutes les villes'}</button>
        ))}
      </div>
      <p className="discret">{lignes.length} DAB{texte || ville ? ' trouvés' : ''}</p>
      <ul className="liste">
        {lignes.map(({ d, agence, banque, f }) => (
          <li key={d.id}>
            <button className={`carte-dab ${f ? f.statut : ''}`} onClick={() => ouvrir(d.id)}>
              <span className="carte-code">{d.code}</span>
              <span className="carte-lieu">{agence || d.agence_saisie || 'Agence non renseignée'}, {d.ville}</span>
              <span className="carte-detail">{banque}{banque && d.modele ? ', ' : ''}{d.modele}{d.origine === 'nouveau_a_verifier' ? ' (nouveau, à vérifier)' : ''}</span>
              <span className={`statut ${f ? f.statut : 'vide'}`}>{f ? LIBELLE[f.statut] : 'À visiter'}</span>
            </button>
          </li>
        ))}
      </ul>
      {lignes.length === 0 && <p className="bandeau-info">Aucun DAB ne correspond. Vérifiez l'orthographe ou ajoutez-le ci-dessous.</p>}
      <button className="secondaire large" onClick={nouveau}>+ Ajouter un DAB absent de la liste</button>
    </div>
  );
}
