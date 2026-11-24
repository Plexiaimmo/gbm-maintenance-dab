import type { SupabaseClient } from '@supabase/supabase-js';
import { db } from '../local/db';
import type { Dab, Fiche, Photo } from '../domaine/types';

export type Bilan = { envoyes: number; restants: number; erreur?: 'session' | 'reseau' };
type Res = { error: { message: string; code?: string } | null; status?: number };

class ErreurSession extends Error {}
class ErreurReseau extends Error {}

const sansSync = <T extends object>(o: T) => {
  const { sync: _s, supprimee: _x, donnees: _d, type: _t, televersee: _v, ...reste } = o as Record<string, unknown>;
  return reste;
};
const empreinte = (o: unknown) => JSON.stringify(o, (_k, v) => (v instanceof ArrayBuffer ? `octets:${v.byteLength}` : v));
const estSession = (r: Res) => r.status === 401 || r.error?.code === 'PGRST301' || /jwt|token/i.test(r.error?.message ?? '');

let enCours: Promise<Bilan> | null = null;

/** Envoie tout ce qui est « à envoyer ». Idempotent, reprend où il s'était arrêté, un seul envoi à la fois. */
export function synchroniser(client: SupabaseClient): Promise<Bilan> {
  enCours ??= executer(client).finally(() => { enCours = null; });
  return enCours;
}

async function executer(client: SupabaseClient): Promise<Bilan> {
  let envoyes = 0;
  let rafraichi = false;

  async function appel(f: () => PromiseLike<Res>): Promise<void> {
    let r = await f();
    if (r.error && estSession(r) && !rafraichi) {
      rafraichi = true;
      const { error } = await client.auth.refreshSession();
      if (error) throw new ErreurSession();
      r = await f();
    }
    if (r.error) {
      if (estSession(r)) throw new ErreurSession();
      throw new ErreurReseau(r.error.message);
    }
  }

  /** Marque envoyé seulement si l'enregistrement n'a pas changé pendant l'envoi. */
  async function marquer(table: string, cle: unknown, avant: object, patch: Record<string, unknown> = {}) {
    await db.transaction('rw', db.table(table), async () => {
      const t = db.table(table);
      const maintenant = await t.get(cle as never);
      if (maintenant && empreinte(maintenant) === empreinte(avant)) await t.update(cle as never, { sync: 'envoye', ...patch });
    });
    envoyes++;
  }

  try {
    await recupererStatuts(client);

    for (const d of await db.dab.where('sync').equals('a_envoyer').toArray() as Dab[]) {
      const r = await client.from('dab').insert([sansSync(d)]);
      if (r.error && r.error.code !== '23505') await appel(async () => r);
      await marquer('dab', d.id, d);
    }
    for (const f of await db.fiches.where('sync').equals('a_envoyer').toArray() as Fiche[]) {
      await appel(() => client.from('fiches').upsert([sansSync(f)], { onConflict: 'id' }));
      await marquer('fiches', f.id, f);
    }
    for (const r of await db.reponses.where('sync').equals('a_envoyer').toArray()) {
      await appel(() => client.from('reponses_checklist').upsert([sansSync(r)], { onConflict: 'fiche_id,item_id' }));
      await marquer('reponses', [r.fiche_id, r.item_id], r);
    }
    for (const e of await db.etats.where('sync').equals('a_envoyer').toArray()) {
      await appel(() => client.from('etats_modules').upsert([sansSync(e)], { onConflict: 'fiche_id,module' }));
      await marquer('etats', [e.fiche_id, e.module], e);
    }
    for (const p of await db.pieces.where('sync').equals('a_envoyer').toArray()) {
      if (p.supprimee) {
        await appel(() => client.from('pieces_a_prevoir').delete().in('id', [p.id]));
        await db.pieces.delete(p.id); envoyes++;
      } else {
        await appel(() => client.from('pieces_a_prevoir').upsert([sansSync(p)], { onConflict: 'id' }));
        await marquer('pieces', p.id, p);
      }
    }
    for (const p of await db.photos.where('sync').equals('a_envoyer').toArray() as Photo[]) {
      const chemin = `fiches/${p.fiche_id}/${p.id}.${p.type === 'image/png' ? 'png' : 'jpg'}`;
      if (p.donnees) {
        const corps = new Blob([p.donnees], { type: p.type ?? 'image/jpeg' });
        await appel(() => client.storage.from('photos').upload(chemin, corps, { upsert: true, contentType: corps.type }));
      }
      await appel(() => client.from('photos').upsert([{ id: p.id, fiche_id: p.fiche_id, cible: p.cible, storage_path: chemin,
        prise_at: p.prise_at, prise_tablette_at: p.prise_tablette_at }], { onConflict: 'id' }));
      await marquer('photos', p.id, p, { donnees: undefined, televersee: true });
    }
    return { envoyes, restants: await restants() };
  } catch (e) {
    return { envoyes, restants: await restants(), erreur: e instanceof ErreurSession ? 'session' : 'reseau' };
  }
}

/** Récupère les décisions de l'admin (renvoyée, validée) sur les fiches déjà envoyées. */
async function recupererStatuts(client: SupabaseClient) {
  const { data: u } = await client.auth.getUser();
  if (!u?.user) return;
  const { data } = await client.from('fiches').select('id, statut, motif_renvoi').eq('consultant_id', u.user.id);
  for (const s of (data ?? []) as Pick<Fiche, 'id' | 'statut' | 'motif_renvoi'>[]) {
    const f = await db.fiches.get(s.id);
    if (!f || f.statut === s.statut) continue;
    if (s.statut === 'validee') await db.fiches.update(s.id, { statut: 'validee', sync: 'envoye' });
    else if (s.statut === 'renvoyee' && f.sync === 'envoye') await db.fiches.update(s.id, { statut: 'renvoyee', motif_renvoi: s.motif_renvoi });
  }
}

export async function restants(): Promise<number> {
  const n = await Promise.all([db.dab, db.fiches, db.reponses, db.etats, db.pieces, db.photos]
    .map((t) => t.where('sync').equals('a_envoyer').count()));
  return n.reduce((a, b) => a + b, 0);
}
