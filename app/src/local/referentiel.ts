import type { SupabaseClient } from '@supabase/supabase-js';
import { db } from './db';
import { toutLire } from '../lib/pagination';

const TABLES = [
  ['dab', 'dab'], ['sites', 'sites'], ['banques', 'banques'], ['checklist_items', 'checklist'],
  ['articles', 'articles'], ['parametres', 'parametres'],
] as const;

/** Remplace le référentiel local par celui du serveur. Ne touche jamais aux saisies. */
export async function chargerReferentiel(client: SupabaseClient): Promise<{ dab: number }> {
  const lus: Record<string, unknown[]> = {};
  for (const [distante] of TABLES) {
    try {
      lus[distante] = await toutLire((de, a) => client.from(distante).select('*').range(de, a));
    } catch (e) {
      throw new Error(`Chargement de ${distante} impossible : ${(e as Error).message}`);
    }
  }
  await db.transaction('rw', TABLES.map(([, locale]) => db.table(locale)), async () => {
    for (const [distante, locale] of TABLES) {
      const t = db.table(locale);
      if (locale === 'dab') {
        // garder les DAB ajoutés sur la tablette et pas encore envoyés
        const enAttente = await t.where('sync').equals('a_envoyer').toArray();
        await t.clear();
        await t.bulkPut([...lus[distante], ...enAttente]);
      } else {
        await t.clear();
        await t.bulkPut(lus[distante]);
      }
    }
  });
  return { dab: lus.dab.length };
}
