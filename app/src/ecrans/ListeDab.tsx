import { useMemo, useState, type ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../local/db';
import { avancementTournee, rangerTournee, statutDab, type StatutDab } from '../domaine/tournee';
import { Icone } from '../composants/Icone';

const LIBELLE: Record<StatutDab, string> = { brouillon: 'En cours', terminee: 'Terminée', validee: 'Validée', renvoyee: 'À reprendre', a_visiter: '' };
const VILLES = ['Brazzaville', 'Pointe-Noire'];

const initiales = (nom: string) => nom.split(/\s+/).filter(Boolean).slice(0, 2).map((m) => m[0]!.toUpperCase()).join('');
const aujourdhui = () => new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

export function ListeDab({ ouvrir, nouveau, nom, actions }: { ouvrir: (dabId: string) => void; nouveau: (code?: string) => void; nom?: string; actions: ReactNode }) {
  const [texte, setTexte] = useState('');
  const [ville, setVille] = useState('');
  const [banque, setBanque] = useState('');
  const [voirReleves, setVoirReleves] = useState(false);
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
    }).filter((l) => (!ville || l.d.ville === ville) && (!banque || l.banque === banque)
      && (!t || [l.d.code, l.agence, l.banque, l.d.numero_serie ?? '', l.d.code_banque ?? ''].some((v) => v.toLowerCase().includes(t))))
      .map((l) => ({ ...l, code: l.d.code }));
  }, [dabs, sites, banques, fiches, texte, ville, banque]);
  const { aTraiter, releves } = rangerTournee(lignes);
  const codesBanques = [...new Set(dabs.map((d) => banques.find((b) => b.id === sites.find((x) => x.id === d.site_id)?.banque_id)?.code).filter(Boolean) as string[])].sort();
  const parBanque = (c: string) => dabs.filter((d) => banques.find((b) => b.id === sites.find((x) => x.id === d.site_id)?.banque_id)?.code === c).length;
  const ligne = ({ d, agence, banque: bq, statut }: (typeof lignes)[number]) => (
    <li key={d.id}>
      <button className={`ligne-dab ${statut}`} onClick={() => ouvrir(d.id)}>
        <span className={`badge-banque ${statut}`} aria-hidden="true">
          {statut === 'terminee' || statut === 'validee' ? <Icone nom="coche" /> : bq || '?'}
        </span>
        <span className="ligne-texte">
          <strong>{d.code}</strong>
          <span>{[agence || 'Agence non renseignée', d.ville].filter(Boolean).join(', ')}. {d.modele ?? ''}{d.origine === 'nouveau_a_verifier' ? ' (nouveau, à vérifier)' : ''}</span>
        </span>
        {statut === 'a_visiter' ? <Icone nom="chevron" /> : <span className={`statut ${statut}`}>{LIBELLE[statut]}</span>}
      </button>
    </li>
  );

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
        <div className="recherche-ligne">
          <label className="recherche-zone">
            <Icone nom="recherche" />
            <input className="recherche" type="search" placeholder="Code, agence, banque ou n° de série" aria-label="Chercher un DAB" value={texte}
              onChange={(e) => setTexte(e.target.value)} enterKeyHint="search" autoCorrect="off" spellCheck={false} />
          </label>
          <button className="bouton-nouveau" onClick={() => nouveau(texte.trim() || undefined)}><Icone nom="plus" />Nouveau DAB</button>
        </div>
        <div className="villes" role="radiogroup" aria-label="Ville">
          {['', ...VILLES].map((v) => (
            <button key={v} role="radio" aria-checked={ville === v} className={ville === v ? 'actif' : ''} onClick={() => setVille(v)}>
              {v || 'Toutes les villes'}{v && <small>{dabs.filter((d) => d.ville === v).length}</small>}
            </button>
          ))}
        </div>
        {codesBanques.length > 1 && (
          <div className="villes banques" role="radiogroup" aria-label="Banque">
            {['', ...codesBanques].map((b) => (
              <button key={b} role="radio" aria-checked={banque === b} className={banque === b ? 'actif' : ''} onClick={() => setBanque(b)}>
                {b || 'Toutes les banques'}{b && <small>{parBanque(b)}</small>}
              </button>
            ))}
          </div>
        )}
        {(texte || ville || banque) && <p className="discret">{lignes.length} DAB trouvé{lignes.length > 1 ? 's' : ''}</p>}
        {aTraiter.length > 0 && <ul className="liste">{aTraiter.map(ligne)}</ul>}
        {lignes.length === 0 && (
          <div className="aucun">
            <p>Aucun DAB ne correspond{texte ? ` à « ${texte.trim()} »` : ''}. Vérifiez l'orthographe, ou ajoutez-le s'il n'est pas dans la liste.</p>
            <button className="principal" onClick={() => nouveau(texte.trim() || undefined)}><Icone nom="plus" />
              {texte.trim() ? `Ajouter « ${texte.trim()} » comme nouveau DAB` : 'Ajouter un nouveau DAB'}</button>
          </div>
        )}
        {releves.length > 0 && (
          <>
            <button className="voir-releves" aria-expanded={voirReleves} onClick={() => setVoirReleves(!voirReleves)}>
              <Icone nom={voirReleves ? 'chevronHaut' : 'chevronBas'} />Déjà relevés ({releves.length})
            </button>
            {voirReleves && <ul className="liste">{releves.map(ligne)}</ul>}
          </>
        )}
      </div>
    </>
  );
}
