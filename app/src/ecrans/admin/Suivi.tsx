import { useEffect, useMemo, useState } from 'react';
import { chargerSuivi } from '../../admin/donnees';
import { resumerSuivi, type LigneSuivi } from '../../admin/suivi';

const STATUTS: Record<string, string> = { brouillon: 'En cours', terminee: 'À valider', validee: 'Validée', renvoyee: 'Renvoyée' };

export function Suivi({ ouvrir, exporter }: { ouvrir: (ficheId: string) => void; exporter?: () => void }) {
  const [donnees, setDonnees] = useState<Awaited<ReturnType<typeof chargerSuivi>>>();
  const [erreur, setErreur] = useState('');
  const [filtres, setFiltres] = useState({ banque: '', ville: '', statut: '' });

  const charger = () => chargerSuivi().then(setDonnees).catch((e) => setErreur(e.message));
  useEffect(() => { void charger(); }, []);
  const r = useMemo(() => donnees && resumerSuivi(donnees.dabs, donnees.fiches, donnees.signaux), [donnees]);
  if (erreur) return <p className="page erreur">{erreur}</p>;
  if (!r) return <p className="page">Chargement…</p>;

  const statutDe = (l: LigneSuivi) => (l.fiche ? l.fiche.statut : 'non_visite');
  const lignes = r.lignes.filter((l) => (!filtres.banque || l.dab.banque === filtres.banque)
    && (!filtres.ville || l.dab.ville === filtres.ville)
    && (!filtres.statut || (filtres.statut === 'douteux' ? l.signal?.douteux : statutDe(l) === filtres.statut)))
    .sort((a, b) => a.dab.code.localeCompare(b.dab.code));
  const banques = [...new Set(r.lignes.map((l) => l.dab.banque))].filter(Boolean).sort();
  const c = r.compteurs;

  return (
    <div className="page large">
      <div className="entete"><h1>Suivi du relevé Wincor</h1><button className="petit" onClick={charger}>Actualiser</button>
        {exporter && <button className="petit" onClick={exporter}>Exporter Excel</button>}</div>
      <div className="compteurs">
        <div><b>{c.visites}<small> / {c.total}</small></b><span>visités</span></div><div><b>{c.restants}</b><span>restants</span></div>
        <div className="alerte"><b>{c.douteux}</b><span>douteux</span></div><div><b>{c.sans_signature}</b><span>sans signature</span></div>
        <div><b>{c.a_valider}</b><span>à valider</span></div>
      </div>
      <div className="ligne filtres">
        <select value={filtres.banque} onChange={(e) => setFiltres({ ...filtres, banque: e.target.value })}><option value="">Toutes les banques</option>{banques.map((b) => <option key={b}>{b}</option>)}</select>
        <select value={filtres.ville} onChange={(e) => setFiltres({ ...filtres, ville: e.target.value })}><option value="">Toutes les villes</option><option>Brazzaville</option><option>Pointe-Noire</option></select>
        <select value={filtres.statut} onChange={(e) => setFiltres({ ...filtres, statut: e.target.value })}>
          <option value="">Tous les statuts</option><option value="non_visite">Non visité</option><option value="brouillon">En cours</option>
          <option value="terminee">À valider</option><option value="validee">Validée</option><option value="renvoyee">Renvoyée</option><option value="douteux">⚠ Douteux</option>
        </select>
      </div>
      <table className="tableau">
        <thead><tr><th>DAB</th><th>Banque · agence</th><th>Ville</th><th>Statut</th><th>Visite</th><th>Signaux</th></tr></thead>
        <tbody>{lignes.map((l) => (
          <tr key={l.dab.id} className={l.fiche ? 'cliquable' : ''} onClick={() => l.fiche && ouvrir(l.fiche.id)}>
            <td><b>{l.dab.code}</b>{l.dab.nouveau && <> <span className="statut brouillon">Nouveau DAB</span></>}</td><td>{l.dab.banque} · {l.dab.agence}</td><td>{l.dab.ville}</td>
            <td>{l.fiche ? STATUTS[l.fiche.statut] : 'Non visité'}{l.nbFiches > 1 ? ` (${l.nbFiches} visites)` : ''}</td>
            <td>{l.fiche ? new Date(l.fiche.arrivee_at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : ''}</td>
            <td>{l.signal?.douteux && <span className="alerte">⚠ {l.signal.raisons.filter((x) => !x.startsWith('GPS non comparable')).join(' · ')}</span>}
              {l.signal?.sans_signature && <span className="discret"> · sans signature</span>}</td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}
