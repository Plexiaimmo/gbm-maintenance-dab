import { useState } from 'react';
import type { ChecklistItem, Reponse, Valeur } from '../../domaine/types';
import { Icone } from '../../composants/Icone';
import { commenter, repondre } from '../../local/fiches';
import { BoutonPhoto } from '../../composants/BoutonPhoto';
import { allerVers, vibrer } from '../../lib/tactile';
import { Champ, ChoixMultiple } from './Commun';

const DEFAUTS = ['Sale', 'Usé', 'Cassé', 'Mal fixé', 'Ne fonctionne pas', 'Absent'];

export function Preventif({ ficheId, items, reponses }: { ficheId: string; items: ChecklistItem[]; reponses: Reponse[] }) {
  const modules = [...new Set(items.map((i) => i.module ?? 'Autres'))];
  const [ouverts, setOuverts] = useState<Set<string>>(new Set());
  const ouvrir = (id: string, oui: boolean) => setOuverts((o) => { const n = new Set(o); if (oui) n.add(id); else n.delete(id); return n; });

  async function choisir(it: ChecklistItem, v: Valeur) {
    vibrer();
    ouvrir(it.id, false);
    await repondre(ficheId, it.id, v);
    if (v === 'NOK') return; // il faut décrire et photographier : on reste sur le point
    const suivant = items.find((x) => x.ordre > it.ordre && !reponses.some((r) => r.item_id === x.id));
    if (suivant) setTimeout(() => allerVers(`item-${suivant.id}`), 120);
  }

  return (
    <section>
      {modules.map((m) => {
        const siens = items.filter((i) => (i.module ?? 'Autres') === m);
        const faits = siens.filter((i) => reponses.some((r) => r.item_id === i.id)).length;
        return (
          <div key={m} className="groupe">
            <h2 className="groupe-titre">{m}<span className={faits === siens.length ? 'compte fini' : 'compte'}>{faits}/{siens.length}</span></h2>
            {siens.map((it) => {
              const r = reponses.find((x) => x.item_id === it.id);
              if (r && r.valeur !== 'NOK' && !ouverts.has(it.id)) return (
                <article key={it.id} id={`item-${it.id}`} className={`point replie repondu ${r.valeur.toLowerCase()}`}>
                  <span className={`rond-etat ${r.valeur === 'NA' ? 'na' : ''}`} aria-hidden="true"><Icone nom={r.valeur === 'NA' ? 'croix' : 'coche'} /></span>
                  <h3>{it.libelle}{r.valeur === 'NA' && <span className="valeur-repli"> (non applicable)</span>}</h3>
                  <button type="button" className="petit" onClick={() => ouvrir(it.id, true)}>Modifier</button>
                </article>
              );
              return (
                <article key={it.id} id={`item-${it.id}`} className={`point ${r ? `repondu ${r.valeur.toLowerCase()}` : ''}`}>
                  <h3>{it.libelle}</h3>
                  {it.consigne && <p className="consigne">{it.consigne}</p>}
                  <div className="reponse" role="radiogroup" aria-label={it.libelle}>
                    <button type="button" role="radio" aria-checked={r?.valeur === 'OK'} className={`rep ok ${r?.valeur === 'OK' ? 'actif' : ''}`} onClick={() => choisir(it, 'OK')}><Icone nom="coche" />OK</button>
                    <button type="button" role="radio" aria-checked={r?.valeur === 'NOK'} className={`rep nok ${r?.valeur === 'NOK' ? 'actif' : ''}`} onClick={() => choisir(it, 'NOK')}><Icone nom="croix" />Pas OK</button>
                  </div>
                  {!it.obligatoire && (
                    <button type="button" className={`rep-na ${r?.valeur === 'NA' ? 'actif' : ''}`} onClick={() => choisir(it, 'NA')}>Non applicable</button>
                  )}
                  {r && r.valeur !== 'NA' && (r.valeur === 'NOK' || it.commentaire_requis) && (
                    r.valeur === 'NOK'
                      ? <ChoixMultiple libelle="Quel problème ?" options={DEFAUTS} valeur={r.commentaire} enregistrer={(v) => commenter(ficheId, it.id, v)} />
                      : <Champ libelle="Commentaire" multi valeur={r.commentaire} enregistrer={(v) => commenter(ficheId, it.id, v)} />
                  )}
                  {r && r.valeur !== 'NA' && (r.valeur === 'NOK' || it.photo_requise) && <BoutonPhoto ficheId={ficheId} cible={`item:${it.id}`} />}
                </article>
              );
            })}
          </div>
        );
      })}
    </section>
  );
}
