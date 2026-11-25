import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { MODULES, type Article, type Etat, type EtatModule, type Piece } from '../../domaine/types';
import { chercherArticles } from '../../domaine/articles';
import { vibrer } from '../../lib/tactile';
import { db } from '../../local/db';
import { ajouterPiece, definirEtat, supprimerPiece } from '../../local/fiches';
import { BoutonPhoto } from '../../composants/BoutonPhoto';
import { classeCarte, tonEtat } from '../../domaine/etatPiece';
import { ChoixMultiple, Choix } from './Commun';

const ETATS: [Etat, string][] = [['Bon', 'Bon'], ['Use', 'Usé'], ['A_remplacer', 'À remplacer'], ['Absent', 'Absent']];

function AjoutPiece({ ficheId, module }: { ficheId: string; module: string }) {
  const articles = useLiveQuery(() => db.articles.toArray(), []) ?? [];
  const [recherche, setRecherche] = useState('');
  const [choisie, setChoisie] = useState<Article | null>(null);
  const [horsListe, setHorsListe] = useState(false);
  const [libre, setLibre] = useState('');
  const [qte, setQte] = useState('1');
  const propositions = chercherArticles(articles, recherche);
  const pret = !!choisie || (horsListe && !!libre.trim());
  async function ajouter() {
    const q = parseInt(qte, 10);
    if (!pret || !(q > 0)) return;
    await ajouterPiece({ fiche_id: ficheId, module, pn: choisie?.pn ?? null, pn_libre: choisie ? null : libre.trim(), quantite: q });
    setChoisie(null); setRecherche(''); setLibre(''); setHorsListe(false); setQte('1');
  }
  return (
    <div className="ajout-piece">
      {choisie ? (
        <p className="piece-choisie"><span><b>{choisie.designation ?? choisie.pn}</b><small>{choisie.pn}</small></span>
          <button type="button" className="petit" onClick={() => setChoisie(null)}>Changer</button></p>
      ) : horsListe ? (
        <>
          <input placeholder="Nom de la pièce" aria-label="Nom de la pièce" value={libre} onChange={(e) => setLibre(e.target.value)} />
          <button type="button" className="petit" onClick={() => { setHorsListe(false); setLibre(''); }}>Chercher dans la liste</button>
        </>
      ) : (
        <>
          <input type="search" placeholder="Chercher : PN ou nom de la pièce" aria-label="Chercher une pièce" value={recherche}
            onChange={(e) => setRecherche(e.target.value)} autoCapitalize="characters" />
          {propositions.length > 0 && (
            <ul className="propositions">{propositions.map((a) => (
              <li key={a.pn}><button type="button" onClick={() => { vibrer(); setChoisie(a); }}><b>{a.designation ?? a.pn}</b><small>{a.pn}</small></button></li>
            ))}</ul>
          )}
          {recherche.trim().length >= 2 && propositions.length === 0 && <p className="champ-aide">Aucune pièce de la liste ne correspond.</p>}
          <button type="button" className="petit" onClick={() => setHorsListe(true)}>La pièce n'est pas dans la liste</button>
        </>
      )}
      <div className="quantite">
        <button type="button" aria-label="Moins" onClick={() => setQte(String(Math.max(1, (parseInt(qte, 10) || 1) - 1)))}>−</button>
        <output aria-label="Quantité">{qte}</output>
        <button type="button" aria-label="Plus" onClick={() => setQte(String((parseInt(qte, 10) || 0) + 1))}>+</button>
      </div>
      <button type="button" className="ajouter" disabled={!pret} onClick={ajouter}>Ajouter la pièce</button>
    </div>
  );
}

export function Mecanique({ ficheId, etats, pieces }: { ficheId: string; etats: EtatModule[]; pieces: Piece[] }) {
  const articles = useLiveQuery(() => db.articles.toArray(), []) ?? [];
  const nomPiece = (p: Piece) => { const a = p.pn ? articles.find((x) => x.pn === p.pn) : undefined; return a?.designation ? `${a.designation} (${a.pn})` : p.pn ?? p.pn_libre; };
  return (
    <section>
      {MODULES.map((m) => {
        const e = etats.find((x) => x.module === m);
        const abime = e?.etat === 'Use' || e?.etat === 'A_remplacer';
        return (
          <article key={m} id={`module-${m}`} className={`point ${classeCarte(e?.etat)}`}>
            <h3>{m}</h3>
            <Choix<Etat> options={ETATS} valeur={e?.etat} choisir={(v) => definirEtat(ficheId, m, v)}
              ton={tonEtat} />
            {abime && <>
              <ChoixMultiple libelle="Ce qui est usé ou à remplacer" valeur={e?.commentaire} enregistrer={(v) => definirEtat(ficheId, m, e!.etat, v)}
                options={['Courroie', 'Rouleaux', 'Capteur', 'Tête', 'Câble', 'Carte électronique']} />
              <BoutonPhoto ficheId={ficheId} cible={`module:${m}`} />
              <p className="champ-libelle">Pièces à prévoir</p>
              <ul className="pieces">{pieces.filter((p) => p.module === m && !p.supprimee).map((p) => (
                <li key={p.id}><span><b>{p.quantite} ×</b> {nomPiece(p)}</span><button type="button" className="retirer" onClick={() => supprimerPiece(p.id)}>Retirer</button></li>
              ))}</ul>
              <AjoutPiece ficheId={ficheId} module={m} />
            </>}
          </article>
        );
      })}
    </section>
  );
}
