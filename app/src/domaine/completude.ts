import { MODULES, type ChecklistItem, type FicheComplete } from './types';

export type Manque = { partie: 1 | 2 | 3 | 4 | 5; cle: string; message: string };

/** Motif qui annule une fiche ouverte sur le mauvais DAB : elle ne compte pas dans la tournée. */
export const MOTIF_ERREUR = 'Fiche ouverte par erreur (mauvais DAB)';
export const estAbandonnee = (f: { statut: string; identification?: { visite_impossible?: string } }) =>
  f.identification?.visite_impossible === MOTIF_ERREUR && f.statut !== 'brouillon';

const vide = (s: unknown) => s === undefined || s === null || String(s).trim() === '';

/** Liste de ce qui empêche de terminer la fiche. Vide ⇔ « Terminer » autorisé. */
export function elementsManquants(f: FicheComplete, items: ChecklistItem[]): Manque[] {
  const m: Manque[] = [];
  const photo = (cible: string) => f.photos.some((p) => p.cible === cible);
  const ajoute = (partie: Manque['partie'], cle: string, message: string) => m.push({ partie, cle, message });
  const { identification: id, systeme: sy, cloture: cl } = f.fiche;

  // Relevé impossible (DAB retiré, accès refusé…) : le motif et une photo du site suffisent.
  if (!vide(id.visite_impossible)) {
    if (id.visite_impossible !== MOTIF_ERREUR && !photo('visite_impossible')) ajoute(1, 'photo_visite_impossible', 'Photo du site (relevé impossible)');
    return m;
  }

  // 1. Identification
  if (vide(id.modele)) ajoute(1, 'modele', 'Modèle exact du DAB');
  if (!photo('plaque')) ajoute(1, 'plaque', 'Photo de la plaque du numéro de série');
  if (vide(id.numero_serie) && !id.plaque_illisible) ajoute(1, 'numero_serie', 'Numéro de série');

  // 2. Préventif
  for (const it of items.filter((i) => i.actif && (i.modele === 'Tous' || i.modele === 'Wincor'))) {
    const r = f.reponses.find((x) => x.item_id === it.id);
    if (!r) { ajoute(2, `item:${it.id}`, `${it.libelle} : réponse manquante`); continue; }
    if (r.valeur === 'NA') {
      if (it.obligatoire && vide(r.commentaire)) ajoute(2, `na:${it.id}`, `${it.libelle} : N/A, expliquez pourquoi`);
      continue;
    }
    const besoinCommentaire = r.valeur === 'NOK' || it.commentaire_requis;
    const besoinPhoto = r.valeur === 'NOK' || it.photo_requise;
    if (besoinCommentaire && vide(r.commentaire)) ajoute(2, `commentaire:${it.id}`, `${it.libelle} : commentaire obligatoire`);
    if (besoinPhoto && !photo(`item:${it.id}`)) ajoute(2, `photo:${it.id}`, `${it.libelle} : photo obligatoire`);
  }

  // 3. État mécanique
  for (const mod of MODULES) {
    const e = f.etats.find((x) => x.module === mod);
    if (!e) { ajoute(3, `etat:${mod}`, `${mod} : état à choisir`); continue; }
    if (e.etat === 'Use' || e.etat === 'A_remplacer') {
      if (vide(e.commentaire)) ajoute(3, `commentaire:${mod}`, `${mod} : commentaire obligatoire`);
      if (!photo(`module:${mod}`)) ajoute(3, `photo:${mod}`, `${mod} : photo obligatoire`);
      if (!f.pieces.some((p) => p.module === mod && !p.supprimee && p.quantite > 0 && (!vide(p.pn) || !vide(p.pn_libre))))
        ajoute(3, `pieces:${mod}`, `${mod} : indiquer au moins une pièce à prévoir`);
    }
  }

  // 4. État système (si le PC est inaccessible, seul le motif est exigé ; l'anti-skimming se voit de l'extérieur)
  if (sy.acces_impossible) {
    if (vide(sy.motif_acces)) ajoute(4, 'motif_systeme', 'Pourquoi le système est inaccessible');
  } else {
  if (vide(sy.version_windows)) ajoute(4, 'version_windows', 'Version de Windows');
  if (vide(sy.logiciel)) ajoute(4, 'logiciel', 'Logiciel applicatif');
  if (vide(sy.logiciel_version)) ajoute(4, 'logiciel_version', 'Version du logiciel applicatif');
  if (sy.heure_correcte === undefined) ajoute(4, 'heure_correcte', 'Date et heure système correctes ?');
  if (vide(sy.espace_disque_go)) ajoute(4, 'espace_disque_go', 'Espace disque libre');
  if (!photo('journal')) ajoute(4, 'journal', "Photo de l'écran du journal d'erreurs");
  if (vide(sy.test_interne)) ajoute(4, 'test_interne', 'Résultat du test interne des modules');
  }
  if (sy.antiskimming === undefined) ajoute(4, 'antiskimming', 'Dispositif anti-skimming présent ?');
  else if (sy.antiskimming && !photo('antiskimming')) ajoute(4, 'photo_antiskimming', 'Photo du dispositif anti-skimming');

  // 5. Clôture
  if (cl.ticket_impossible) { if (vide(cl.motif_ticket)) ajoute(5, 'motif_ticket', 'Pourquoi pas de ticket test'); }
  else if (!photo('ticket')) ajoute(5, 'ticket', 'Photo du ticket test');
  if (cl.gestionnaire_absent) {
    if (vide(cl.motif_absence)) ajoute(5, 'motif_absence', "Motif de l'absence du gestionnaire");
    if (!photo('site_absent')) ajoute(5, 'photo_site_absent', 'Photo du site (gestionnaire absent)');
  } else {
    if (!f.signature) ajoute(5, 'signature', 'Signature du gestionnaire');
    if (vide(cl.gestionnaire_nom)) ajoute(5, 'gestionnaire_nom', 'Nom du gestionnaire');
  }
  return m;
}

export const sansSignature = (f: FicheComplete) => !!f.fiche.cloture.gestionnaire_absent && !f.signature;

/** Les exceptions acceptées sur cette fiche, en clair, pour l'administrateur. */
export function derogations(f: FicheComplete, items: ChecklistItem[]): string[] {
  const { identification: id, systeme: sy, cloture: cl } = f.fiche;
  if (!vide(id.visite_impossible)) return [`Visite impossible : ${id.visite_impossible!.trim()}`];
  const d: string[] = [];
  if (id.plaque_illisible) d.push('Plaque illisible');
  if (sy.acces_impossible) d.push(`Système inaccessible : ${(sy.motif_acces ?? '').trim()}`);
  if (cl.ticket_impossible) d.push(`Pas de ticket test : ${(cl.motif_ticket ?? '').trim()}`);
  for (const r of f.reponses) {
    const it = items.find((i) => i.id === r.item_id);
    if (r.valeur === 'NA' && it?.obligatoire) d.push(`N/A sur point obligatoire : ${it.libelle} (${(r.commentaire ?? '').trim()})`);
  }
  return d;
}
