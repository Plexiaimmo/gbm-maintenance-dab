import { useMemo, useState, type ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../local/db';
import { avancementTournee, statutDab, type StatutDab } from '../domaine/tournee';
import { Icone } from '../composants/Icone';

const LIBELLE: Record<StatutDab, string> = { brouillon: 'En cours', terminee: 'Terminée', validee: 'Validée', renvoyee: 'À reprendre', a_visiter: '' };
const VILLES = ['Brazzaville', 'Pointe-Noire'];

const initiales = (nom: string) => nom.split(/\s+/).filter(Boolean).slice(0, 2).map((m) => m[0]!.toUpperCase()).join('');
const aujourdhui = () => new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

export function ListeDab({ ouvrir, nouveau, nom, actions }: { ouvrir: (dabId: string) => void; nouveau: () => void; nom?: string; actions: ReactNode }) {
  const [texte, setTexte] = useState('');
  const [ville, setVille] = useState('');
  const dabs = useLiveQuery(() => db.dab.toArray(), []) ?? [];
  const sites = useLiveQuery(() => db.sites.toArray(), []) ?? [];
  const banques = useLiveQuery(() => db.banques.toArray(), []) ?? [];
  const fiches = useLiveQuery(() => db.fiches.toArray(), []) ?? [];
  const av = avancementTournee(dabs, fiches);

  const lignes = useMemo(() => {
    const t = texte.trim().toLowerCase();
    return dabs.map((d) => {
      const s = sites.find((x) => x.id === d.site_id);
      const b = banques.find((x) => x.id === s?.banque_id);
      return { d, agence: s?.nom ?? d.agence_saisie ?? '', banque: b?.code ?? '', statut: statutDab(d.id, fiches) };
    }).filter((l) => (!ville || l.d.ville === ville)
      && (!t || [l.d.code, l.agence, l.banque, l.d.numero_serie ?? ''].some((v) => v.toLowerCase().includes(t))))
      .sort((a, b) => a.d.code.localeCompare(b.d.code));
  }, [dabs, sites, banques, fiches, texte, ville]);

  return (
    <>
      <section className="tournee">
        <div className="tournee-haut">
          <div className="salut">
            {nom && <span className="avatar" aria-hidden="true">{initiales(nom)}</span>}
            <div><small>{aujourdhui()}</small><strong>{nom ? `Bonjour ${nom.split(/\s+/)[0]}` : 'Bonjour'}</strong></div>
          </div>
          <div className="tournee-actions">{actions}</div>
        </div>
        <div className="avancement">
          <small>Tournée Wincor, Brazzaville et Pointe-Noire</small>
          <p className="chiffre"><b>{av.releves}</b><span>/ {av.total} DAB relevés</span></p>
          <div className="progres" role="progressbar" aria-label="DAB relevés" aria-valuemin={0} aria-valuemax={av.total} aria-valuenow={av.releves}>
            <div style={{ width: `${av.total ? (100 * av.releves) / av.total : 0}%` }} />
          </div>
        </div>
        <div className="compteurs-tournee">
          <div><b>{av.enCours}</b><span>En cours</span></div>
          <div><b className={av.aReprendre ? 'rouge' : ''}>{av.aReprendre}</b><span>À reprendre</span></div>
          <div><b>{av.aVisiter}</b><span>À visiter</span></div>
        </div>
      </section>
      <div className="page">
        <label className="recherche-zone">
          <Icone nom="recherche" />
          <input className="recherche" type="search" placeholder="Code, agence, banque ou n° de série" aria-label="Chercher un DAB" value={texte}
            onChange={(e) => setTexte(e.target.value)} enterKeyHint="search" autoCorrect="off" spellCheck={false} />
        </label>
        <div className="villes" role="radiogroup" aria-label="Ville">
          {['', ...VILLES].map((v) => (
            <button key={v} role="radio" aria-checked={ville === v} className={ville === v ? 'actif' : ''} onClick={() => setVille(v)}>
              {v || 'Toutes les villes'}{v && <small>{dabs.filter((d) => d.ville === v).length}</small>}
            </button>
          ))}
        </div>
        {(texte || ville) && <p className="discret">{lignes.length} DAB trouvé{lignes.length > 1 ? 's' : ''}</p>}
        {lignes.length > 0 && (
          <ul className="liste">
            {lignes.map(({ d, agence, banque, statut }) => (
              <li key={d.id}>
                <button className="ligne-dab" onClick={() => ouvrir(d.id)}>
                  <span className={`badge-banque ${statut}`} aria-hidden="true">
                    {statut === 'terminee' || statut === 'validee' ? <Icone nom="coche" /> : banque || '?'}
                  </span>
                  <span className="ligne-texte">
                    <strong>{d.code}</strong>
                    <span>{[agence || 'Agence non renseignée', d.ville].filter(Boolean).join(', ')}. {d.modele ?? ''}{d.origine === 'nouveau_a_verifier' ? ' (nouveau, à vérifier)' : ''}</span>
                  </span>
                  {statut === 'a_visiter' ? <Icone nom="chevron" /> : <span className={`statut ${statut}`}>{LIBELLE[statut]}</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
        {lignes.length === 0 && <p className="bandeau-info">Aucun DAB ne correspond. Vérifiez l'orthographe ou ajoutez-le ci-dessous.</p>}
        <button className="ajout-dab" onClick={nouveau}><Icone nom="plus" />Ajouter un DAB absent de la liste</button>
      </div>
    </>
  );
}
