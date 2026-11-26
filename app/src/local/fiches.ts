import { db } from './db';
import { elementsManquants, sansSignature, type Manque } from '../domaine/completude';
import type { Arrivee } from '../domaine/arrivee';
import type { ChecklistItem, Etat, Fiche, FicheComplete, Piece, Valeur } from '../domaine/types';

/** Toute modification remet la fiche « à envoyer » ; une fiche renvoyée repasse en brouillon. */
async function toucher(id: string, patch: Partial<Fiche> = {}) {
  const f = await db.fiches.get(id);
  if (!f) throw new Error('Fiche introuvable');
  if (f.statut === 'validee') throw new Error('Fiche validée : elle ne peut plus être modifiée');
  await db.fiches.update(id, { ...patch, sync: 'a_envoyer', ...(f.statut === 'renvoyee' ? { statut: 'brouillon' } : {}) });
}

export async function creerFiche(dabId: string, consultantId: string, a: Arrivee): Promise<string> {
  const dab = await db.dab.get(dabId);
  const id = crypto.randomUUID();
  await db.fiches.put({
    id, dab_id: dabId, consultant_id: consultantId, statut: 'brouillon',
    arrivee_at: a.at, arrivee_lat: a.lat ?? null, arrivee_lng: a.lng ?? null, arrivee_precision: a.precision ?? null,
    arrivee_gps_at: a.gps_at ?? null, gps_motif: a.gps_motif ?? null,
    identification: { modele: /vérifier/i.test(dab?.modele ?? '') ? '' : (dab?.modele ?? ''), numero_serie: dab?.numero_serie ?? '' },
    systeme: {}, cloture: {}, sans_signature: false, sync: 'a_envoyer',
  });
  return id;
}

export const majFiche = (id: string, patch: Partial<Fiche>) => toucher(id, patch);

type Partie = 'identification' | 'systeme' | 'cloture';
/** Modifie quelques champs d'une partie en fusionnant avec ce qui est en base, dans une transaction :
 *  deux saisies rapprochées (avant que l'écran ait relu la base) ne s'écrasent pas. */
export const majPartie = <K extends Partie>(id: string, partie: K, patch: Partial<Fiche[K]>) =>
  db.transaction('rw', db.fiches, async () => {
    const f = await db.fiches.get(id);
    await toucher(id, { [partie]: { ...(f?.[partie] ?? {}), ...patch } } as Partial<Fiche>);
  });

export async function repondre(ficheId: string, itemId: string, valeur: Valeur, commentaire?: string) {
  const avant = await db.reponses.get([ficheId, itemId]);
  await db.reponses.put({ fiche_id: ficheId, item_id: itemId, valeur, commentaire: commentaire ?? avant?.commentaire, sync: 'a_envoyer' });
  await toucher(ficheId);
}

export async function commenter(ficheId: string, itemId: string, commentaire: string) {
  await db.reponses.update([ficheId, itemId], { commentaire, sync: 'a_envoyer' });
  await toucher(ficheId);
}

export async function definirEtat(ficheId: string, module: string, etat: Etat, commentaire?: string) {
  const avant = await db.etats.get([ficheId, module]);
  await db.etats.put({ fiche_id: ficheId, module, etat, commentaire: commentaire ?? avant?.commentaire, sync: 'a_envoyer' });
  await toucher(ficheId);
}

export async function ajouterPiece(p: Omit<Piece, 'id' | 'sync'>) {
  await db.pieces.put({ ...p, id: crypto.randomUUID(), sync: 'a_envoyer' });
  await toucher(p.fiche_id);
}

export async function supprimerPiece(id: string) {
  const p = await db.pieces.get(id);
  if (!p) return;
  await db.pieces.update(id, { supprimee: true, sync: 'a_envoyer' });
  await toucher(p.fiche_id);
}

export async function chargerFicheComplete(id: string): Promise<FicheComplete> {
  const [fiche, reponses, etats, pieces, photos] = await Promise.all([
    db.fiches.get(id), db.reponses.where('fiche_id').equals(id).toArray(), db.etats.where('fiche_id').equals(id).toArray(),
    db.pieces.where('fiche_id').equals(id).toArray(), db.photos.where('fiche_id').equals(id).toArray(),
  ]);
  if (!fiche) throw new Error('Fiche introuvable');
  return { fiche, reponses, etats, pieces, photos: photos.map((p) => ({ cible: p.cible })),
    signature: photos.some((p) => p.cible === 'signature') };
}

export async function terminerFiche(id: string, items: ChecklistItem[], depart: () => Promise<Arrivee>): Promise<Manque[]> {
  const fc = await chargerFicheComplete(id);
  const manques = elementsManquants(fc, items);
  if (manques.length) return manques;
  const d = await depart();
  await toucher(id, { statut: 'terminee', depart_at: d.at, depart_lat: d.lat ?? null, depart_lng: d.lng ?? null,
    sans_signature: sansSignature(fc) });
  return [];
}
