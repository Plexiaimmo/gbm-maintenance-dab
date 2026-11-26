import type { ExportDonnees } from './export';

export interface DabRef { code: string; ficheId: string }
export interface Synthese {
  nbFiches: number;
  pieces: { cle: string; pn: string | null; designation: string; quantite: number; dabs: DabRef[] }[];
  pasOk: { itemId: string; libelle: string; dabs: DabRef[] }[];
  modules: { module: string; use: DabRef[]; aRemplacer: DabRef[]; absent: DabRef[] }[];
}

const RENDUES = ['terminee', 'validee'];
const parCode = (a: DabRef, b: DabRef) => a.code.localeCompare(b.code, 'fr');

/** Tout ce qu'il y a à signaler sur l'ensemble des DAB : pièces à prévoir, points pas OK, modules abîmés.
 *  Seule la dernière fiche rendue (à valider ou validée) de chaque DAB compte. */
export function synthese(d: ExportDonnees): Synthese {
  const derniere = new Map<string, ExportDonnees['fiches'][number]>();
  for (const f of d.fiches.filter((x) => RENDUES.includes(x.statut))) {
    const actuelle = derniere.get(f.dab_code);
    if (!actuelle || f.arrivee_at > actuelle.arrivee_at) derniere.set(f.dab_code, f);
  }
  const fiches = new Map([...derniere.values()].map((f) => [f.id, f]));
  const ref = (ficheId: string): DabRef => ({ code: fiches.get(ficheId)!.dab_code, ficheId });
  const retenue = (ficheId: string) => fiches.has(ficheId);

  const pieces = new Map<string, Synthese['pieces'][number]>();
  for (const p of d.pieces.filter((x) => retenue(x.fiche_id))) {
    const libre = p.pn ? null : (p.pn_libre ?? '').trim();
    const cle = p.pn ?? `libre:${libre!.toLowerCase()}`;
    const e = pieces.get(cle) ?? { cle, pn: p.pn, quantite: 0, dabs: [],
      designation: p.pn ? (d.articles.find((a) => a.pn === p.pn)?.designation ?? p.pn) : libre! };
    e.quantite += p.quantite;
    if (!e.dabs.some((x) => x.ficheId === p.fiche_id)) e.dabs.push(ref(p.fiche_id));
    pieces.set(cle, e);
  }

  const pasOk = new Map<string, Synthese['pasOk'][number]>();
  for (const r of d.reponses.filter((x) => x.valeur === 'NOK' && retenue(x.fiche_id))) {
    const e = pasOk.get(r.item_id) ?? { itemId: r.item_id, libelle: r.libelle, dabs: [] };
    e.dabs.push(ref(r.fiche_id)); pasOk.set(r.item_id, e);
  }

  const modules = new Map<string, Synthese['modules'][number]>();
  for (const e of d.etats.filter((x) => x.etat !== 'Bon' && retenue(x.fiche_id))) {
    const m = modules.get(e.module) ?? { module: e.module, use: [], aRemplacer: [], absent: [] };
    (e.etat === 'Use' ? m.use : e.etat === 'A_remplacer' ? m.aRemplacer : m.absent).push(ref(e.fiche_id));
    modules.set(e.module, m);
  }

  const trierDabs = <T extends { dabs: DabRef[] }>(l: T[]) => { l.forEach((x) => x.dabs.sort(parCode)); return l; };
  const abime = (m: Synthese['modules'][number]) => m.use.length + m.aRemplacer.length;
  return {
    nbFiches: fiches.size,
    pieces: trierDabs([...pieces.values()]).sort((a, b) => b.quantite - a.quantite || a.designation.localeCompare(b.designation, 'fr')),
    pasOk: trierDabs([...pasOk.values()]).sort((a, b) => b.dabs.length - a.dabs.length || a.libelle.localeCompare(b.libelle, 'fr')),
    modules: [...modules.values()].map((m) => ({ ...m, use: m.use.sort(parCode), aRemplacer: m.aRemplacer.sort(parCode), absent: m.absent.sort(parCode) }))
      .sort((a, b) => abime(b) - abime(a) || a.module.localeCompare(b.module, 'fr')),
  };
}
