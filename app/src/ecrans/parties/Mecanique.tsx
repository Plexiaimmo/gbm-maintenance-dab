import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { MODULES, type Etat, type EtatModule, type Piece } from '../../domaine/types';
import { db } from '../../local/db';
import { ajouterPiece, definirEtat, supprimerPiece } from '../../local/fiches';
import { BoutonPhoto } from '../../composants/BoutonPhoto';
import { Champ } from './Commun';

const ETATS: [Etat, string][] = [['Bon', 'Bon'], ['Use', 'Usé'], ['A_remplacer', 'À remplacer'], ['Absent', 'Absent']];

function AjoutPiece({ ficheId, module }: { ficheId: string; module: string }) {
  const articles = useLiveQuery(() => db.articles.toArray(), []) ?? [];
  const [texte, setTexte] = useState('');
  const [qte, setQte] = useState('1');
  async function ajouter() {
    const t = texte.trim();
    const a = articles.find((x) => x.pn === t || `${x.pn} — ${x.designation}` === t);
    const q = parseInt(qte, 10);
    if (!t || !(q > 0)) return;
    await ajouterPiece({ fiche_id: ficheId, module, pn: a?.pn ?? null, pn_libre: a ? null : t, quantite: q });
    setTexte(''); setQte('1');
  }
  return (
    <div className="ligne ajout-piece">
      <input list="liste-articles" placeholder="PN ou désignation" value={texte} onChange={(e) => setTexte(e.target.value)} />
      <input type="number" min={1} value={qte} onChange={(e) => setQte(e.target.value)} className="qte" />
      <button type="button" onClick={ajouter}>Ajouter</button>
      <datalist id="liste-articles">{articles.map((a) => <option key={a.pn} value={`${a.pn} — ${a.designation ?? ''}`} />)}</datalist>
    </div>
  );
}

export function Mecanique({ ficheId, etats, pieces }: { ficheId: string; etats: EtatModule[]; pieces: Piece[] }) {
  return (
    <section>
      {MODULES.map((m) => {
        const e = etats.find((x) => x.module === m);
        const abime = e?.etat === 'Use' || e?.etat === 'A_remplacer';
        return (
          <div key={m} id={`module-${m}`} className={`point ${e ? 'repondu' : ''}`}>
            <strong>{m}</strong>
            <div className="ligne choix">
              {ETATS.map(([v, l]) => (
                <button key={v} type="button" className={e?.etat === v ? 'actif' : ''} onClick={() => definirEtat(ficheId, m, v)}>{l}</button>
              ))}
            </div>
            {abime && <>
              <Champ libelle="Ce qui est usé ou à remplacer" multi valeur={e?.commentaire} enregistrer={(v) => definirEtat(ficheId, m, e!.etat, v)} />
              <BoutonPhoto ficheId={ficheId} cible={`module:${m}`} />
              <p><strong>Pièces à prévoir</strong></p>
              <ul>{pieces.filter((p) => p.module === m && !p.supprimee).map((p) => (
                <li key={p.id}>{p.quantite} × {p.pn ?? p.pn_libre} <button type="button" className="petit" onClick={() => supprimerPiece(p.id)}>Retirer</button></li>
              ))}</ul>
              <AjoutPiece ficheId={ficheId} module={m} />
            </>}
          </div>
        );
      })}
    </section>
  );
}
