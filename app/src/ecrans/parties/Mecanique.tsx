import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { MODULES, type Etat, type EtatModule, type Piece } from '../../domaine/types';
import { db } from '../../local/db';
import { ajouterPiece, definirEtat, supprimerPiece } from '../../local/fiches';
import { BoutonPhoto } from '../../composants/BoutonPhoto';
import { Champ, Choix } from './Commun';

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
    <div className="ajout-piece">
      <input list="liste-articles" placeholder="PN ou nom de la pièce" value={texte} onChange={(e) => setTexte(e.target.value)} autoCapitalize="characters" />
      <div className="quantite">
        <button type="button" aria-label="Moins" onClick={() => setQte(String(Math.max(1, (parseInt(qte, 10) || 1) - 1)))}>−</button>
        <output aria-label="Quantité">{qte}</output>
        <button type="button" aria-label="Plus" onClick={() => setQte(String((parseInt(qte, 10) || 0) + 1))}>+</button>
      </div>
      <button type="button" className="ajouter" disabled={!texte.trim()} onClick={ajouter}>Ajouter la pièce</button>
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
          <article key={m} id={`module-${m}`} className={`point ${e ? `repondu ${abime ? 'nok' : 'ok'}` : ''}`}>
            <h3>{m}</h3>
            <Choix<Etat> options={ETATS} valeur={e?.etat} choisir={(v) => definirEtat(ficheId, m, v)}
              ton={(v) => (v === 'Bon' ? 'ok' : v === 'Absent' ? '' : 'nok')} />
            {abime && <>
              <Champ libelle="Ce qui est usé ou à remplacer" multi valeur={e?.commentaire} enregistrer={(v) => definirEtat(ficheId, m, e!.etat, v)}
                phrases={['Courroie', 'Rouleaux', 'Capteur', 'Tête', 'Câble', 'Carte électronique']} />
              <BoutonPhoto ficheId={ficheId} cible={`module:${m}`} />
              <p className="champ-libelle">Pièces à prévoir</p>
              <ul className="pieces">{pieces.filter((p) => p.module === m && !p.supprimee).map((p) => (
                <li key={p.id}><span><b>{p.quantite} ×</b> {p.pn ?? p.pn_libre}</span><button type="button" className="retirer" onClick={() => supprimerPiece(p.id)}>Retirer</button></li>
              ))}</ul>
              <AjoutPiece ficheId={ficheId} module={m} />
            </>}
          </article>
        );
      })}
    </section>
  );
}
