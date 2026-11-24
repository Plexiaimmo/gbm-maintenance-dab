import type { ChecklistItem, Reponse, Valeur } from '../../domaine/types';
import { commenter, repondre } from '../../local/fiches';
import { BoutonPhoto } from '../../composants/BoutonPhoto';
import { Champ } from './Commun';

export function Preventif({ ficheId, items, reponses }: { ficheId: string; items: ChecklistItem[]; reponses: Reponse[] }) {
  const modules = [...new Set(items.map((i) => i.module ?? 'Autres'))];
  return (
    <section>
      {modules.map((m) => (
        <div key={m}>
          <h3>{m}</h3>
          {items.filter((i) => (i.module ?? 'Autres') === m).map((it) => {
            const r = reponses.find((x) => x.item_id === it.id);
            const choix: Valeur[] = it.obligatoire ? ['OK', 'NOK'] : ['OK', 'NOK', 'NA'];
            return (
              <div key={it.id} id={`item-${it.id}`} className={`point ${r ? 'repondu' : ''}`}>
                <strong>{it.libelle}</strong>
                {it.consigne && <p className="consigne">{it.consigne}</p>}
                <div className="ligne choix">
                  {choix.map((c) => (
                    <button key={c} type="button" className={`${r?.valeur === c ? 'actif' : ''} ${c.toLowerCase()}`}
                      onClick={() => repondre(ficheId, it.id, c)}>{c === 'NA' ? 'N/A' : c}</button>
                  ))}
                </div>
                {r && r.valeur !== 'NA' && (r.valeur === 'NOK' || it.commentaire_requis) && (
                  <Champ libelle={r.valeur === 'NOK' ? 'Quel problème ?' : 'Commentaire'} multi valeur={r.commentaire}
                    enregistrer={(v) => commenter(ficheId, it.id, v)} />
                )}
                {r && r.valeur !== 'NA' && (r.valeur === 'NOK' || it.photo_requise) && <BoutonPhoto ficheId={ficheId} cible={`item:${it.id}`} />}
              </div>
            );
          })}
        </div>
      ))}
    </section>
  );
}
