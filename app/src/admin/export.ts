import * as XLSX from 'xlsx';

type Obj = Record<string, unknown>;
export interface ExportDonnees {
  fiches: (Obj & { id: string; dab_code: string; banque: string; agence: string; ville: string | null; statut: string;
    arrivee_at: string; depart_at?: string | null; douteux: boolean; raisons: string[]; sans_signature: boolean;
    identification: Obj; systeme: Obj; cloture: Obj })[];
  reponses: { fiche_id: string; item_id: string; libelle: string; valeur: string; commentaire?: string | null }[];
  etats: { fiche_id: string; module: string; etat: string; commentaire?: string | null }[];
  pieces: { fiche_id: string; module: string; pn: string | null; pn_libre: string | null; quantite: number }[];
  articles: { pn: string; designation: string | null }[];
}

const date = (s?: string | null) => (s ? new Date(s) : null);

export function construireClasseur(d: ExportDonnees): XLSX.WorkBook {
  const code = (id: string) => d.fiches.find((f) => f.id === id)?.dab_code ?? id;
  const feuille = (lignes: Obj[]) => XLSX.utils.json_to_sheet(lignes, { cellDates: true });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, feuille(d.fiches.map((f) => ({
    DAB: f.dab_code, Banque: f.banque, Agence: f.agence, Ville: f.ville, Statut: f.statut,
    Douteux: f.douteux ? 'OUI' : '', Raisons: f.raisons.join(' · '), 'Sans signature': f.sans_signature ? 'OUI' : '',
    'Arrivée': date(f.arrivee_at), 'Départ': date(f.depart_at),
    'Durée (min)': f.depart_at ? Math.round((Date.parse(f.depart_at) - Date.parse(f.arrivee_at)) / 60000) : null,
    'SN relevé': f.identification.numero_serie ?? '', 'Modèle relevé': f.identification.modele ?? '',
  }))), 'Fiches');
  XLSX.utils.book_append_sheet(wb, feuille(d.reponses.map((r) => ({ DAB: code(r.fiche_id), Point: r.item_id, 'Libellé': r.libelle,
    'Réponse': r.valeur, Commentaire: r.commentaire ?? '' }))), 'Preventif');
  XLSX.utils.book_append_sheet(wb, feuille(d.etats.map((e) => ({ DAB: code(e.fiche_id), Module: e.module, 'État': e.etat,
    Commentaire: e.commentaire ?? '' }))), 'Mecanique');
  XLSX.utils.book_append_sheet(wb, feuille(d.fiches.map((f) => ({ DAB: f.dab_code, ...f.systeme }))), 'Systeme');
  XLSX.utils.book_append_sheet(wb, feuille(d.fiches.map((f) => ({ DAB: f.dab_code, ...f.cloture }))), 'Cloture');
  const parPn = new Map<string, { q: number; dabs: Set<string> }>();
  for (const p of d.pieces) {
    const k = p.pn ?? p.pn_libre ?? '?';
    const e = parPn.get(k) ?? { q: 0, dabs: new Set() };
    e.q += p.quantite; e.dabs.add(code(p.fiche_id)); parPn.set(k, e);
  }
  XLSX.utils.book_append_sheet(wb, feuille([...parPn].map(([pn, e]) => ({ PN: pn,
    'Désignation': d.articles.find((a) => a.pn === pn)?.designation ?? '(saisie libre)', 'Quantité totale': e.q,
    'Nombre de DAB': e.dabs.size }))), 'Pieces_a_prevoir');
  return wb;
}
