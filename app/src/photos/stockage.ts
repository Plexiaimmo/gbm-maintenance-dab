import { db } from '../local/db';
import { preparerPhoto } from './capture';

/** Une seule photo par cible : reprendre une photo remplace la précédente (même identifiant). */
export async function enregistrerPhoto(ficheId: string, cible: string, fichier: Blob, outils?: Parameters<typeof preparerPhoto>[2]) {
  const p = await preparerPhoto(fichier, new Date(), outils);
  const existante = await db.photos.where({ fiche_id: ficheId, cible }).first();
  const id = existante?.id ?? crypto.randomUUID();
  await db.photos.put({
    id, fiche_id: ficheId, cible, blob: p.blob, prise_at: p.prise_at?.toISOString() ?? null,
    prise_tablette_at: p.prise_tablette_at.toISOString(), sync: 'a_envoyer', televersee: false,
  });
  return id;
}
