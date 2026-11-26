import type { SupabaseClient } from '@supabase/supabase-js';
import { db } from '../local/db';
import type { Dab, Fiche, Photo } from '../domaine/types';

export type Bilan = { envoyes: number; restants: number; rejetes: number; erreur?: 'session' | 'reseau' };
type Res = { error: { message: string; code?: string } | null; status?: number };

class ErreurSession extends Error {}
class ErreurReseau extends Error {}
/** Refus définitif du serveur (droits, contrainte) : réessayer ne servira à rien. */
class ErreurRejet extends Error {}

const sansSync = <T extends object>(o: T) => {
  const { sync: _s, supprimee: _x, donnees: _d, type: _t, televersee: _v, rejet: _r, ...reste } = o as Record<string, unknown>;
  return reste;
};
const empreinte = (o: unknown) => JSON.stringify(o, (_k, v) => (v instanceof ArrayBuffer ? `octets:${v.byteLength}` : v));
const statutHttp = (r: Res) => Number(r.status ?? (r.error as { status?: number; statusCode?: string } | null)?.status
  ?? (r.error as { statusCode?: string } | null)?.statusCode ?? 0);
const estPermanent = (r: Res) => {
  const st = statutHttp(r);
  return (st >= 400 && st < 500 && ![401, 408, 429].includes(st)) || /^(22|23|42|P0)/.test(r.error?.code ?? '');
};
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
      if (estPermanent(r)) throw new ErreurRejet(r.error.message);
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

  /** Exécute l'envoi d'un enregistrement ; un refus définitif le met de côté au lieu de bloquer la file. */
  async function chaque(table: string, cle: unknown, envoi: () => Promise<void>) {
    try { await envoi(); } catch (e) {
      if (!(e instanceof ErreurRejet)) throw e;
      await mettreDeCote(db.table(table), cle, e.message);
    }
  }

  try {
    await recupererStatuts(client);
    await reessayerRefus();

    for (const d of await db.dab.where('sync').equals('a_envoyer').toArray() as Dab[]) await chaque('dab', d.id, async () => {
      let r: Res = await client.from('dab').insert([sansSync(d)]);
      let code = d.code;
      // Code déjà pris par un AUTRE DAB du serveur : on prend le numéro suivant plutôt que de fusionner deux machines.
      for (let essai = 0; r.error?.code === '23505' && essai < 20; essai++) {
        const { data } = await client.from('dab').select('id').eq('code', code);
        const idServeur = (data as { id: string }[] | null)?.[0]?.id;
        if (!idServeur || idServeur === d.id) { r = { error: null }; break; } // déjà envoyé lors d'un essai précédent
        code = codeSuivant(code);
        r = await client.from('dab').insert([{ ...sansSync(d), code }]);
      }
      if (code !== d.code && !r.error) {
        await db.dab.update(d.id, { code, sync: 'envoye' });
        envoyes++;
        return;
      } else if (r.error) await appel(async () => r);
      await marquer('dab', d.id, d);
    });
    for (const f of await db.fiches.where('sync').equals('a_envoyer').toArray() as Fiche[]) await chaque('fiches', f.id, async () => {
      // une fiche renvoyée non retouchée : le serveur a déjà la bonne version, on n'écrase pas le renvoi
      if (f.statut !== 'renvoyee') await appel(() => client.from('fiches').upsert([sansSync(f)], { onConflict: 'id' }));
      await marquer('fiches', f.id, f);
    });
    for (const r of await db.reponses.where('sync').equals('a_envoyer').toArray()) await chaque('reponses', [r.fiche_id, r.item_id], async () => {
      await appel(() => client.from('reponses_checklist').upsert([sansSync(r)], { onConflict: 'fiche_id,item_id' }));
      await marquer('reponses', [r.fiche_id, r.item_id], r);
    });
    for (const e of await db.etats.where('sync').equals('a_envoyer').toArray()) await chaque('etats', [e.fiche_id, e.module], async () => {
      await appel(() => client.from('etats_modules').upsert([sansSync(e)], { onConflict: 'fiche_id,module' }));
      await marquer('etats', [e.fiche_id, e.module], e);
    });
    for (const p of await db.pieces.where('sync').equals('a_envoyer').toArray()) await chaque('pieces', p.id, async () => {
      if (p.supprimee) {
        await appel(() => client.from('pieces_a_prevoir').delete().in('id', [p.id]));
        await db.pieces.delete(p.id); envoyes++;
      } else {
        await appel(() => client.from('pieces_a_prevoir').upsert([sansSync(p)], { onConflict: 'id' }));
        await marquer('pieces', p.id, p);
      }
    });
    for (const p of await db.photos.where('sync').equals('a_envoyer').toArray() as Photo[]) await chaque('photos', p.id, async () => {
      const chemin = `fiches/${p.fiche_id}/${p.id}.${p.type === 'image/png' ? 'png' : 'jpg'}`;
      if (p.donnees) {
        const corps = new Blob([p.donnees], { type: p.type ?? 'image/jpeg' });
        await appel(() => client.storage.from('photos').upload(chemin, corps, { upsert: true, contentType: corps.type }));
      }
      await appel(() => client.from('photos').upsert([{ id: p.id, fiche_id: p.fiche_id, cible: p.cible, storage_path: chemin,
        prise_at: p.prise_at, prise_tablette_at: p.prise_tablette_at }], { onConflict: 'id' }));
      await marquer('photos', p.id, p, { donnees: undefined, televersee: true });
    });
    return { envoyes, restants: await restants(), rejetes: await compter('rejete') };
  } catch (e) {
    return { envoyes, restants: await restants(), rejetes: await compter('rejete'), erreur: e instanceof ErreurSession ? 'session' : 'reseau' };
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
    if (s.statut === 'validee') {
      await db.fiches.update(s.id, { statut: 'validee', sync: 'envoye' });
      // une fiche validée n'accepte plus de modifications : ce qui restait à envoyer est mis de côté
      for (const t of [db.reponses, db.etats, db.pieces, db.photos] as unknown as (typeof db.photos)[])
        for (const cle of await t.where('fiche_id').equals(s.id).filter((x) => x.sync === 'a_envoyer').primaryKeys())
          await mettreDeCote(t, cle, 'Fiche déjà validée');
    }
    // le renvoi l'emporte sur une fiche « terminée » de la tablette, même modifiée depuis : sinon l'envoi l'écraserait
    else if (s.statut === 'renvoyee' && f.statut === 'terminee') await db.fiches.update(s.id, { statut: 'renvoyee', motif_renvoi: s.motif_renvoi });
  }
}

/** Réécrit l'enregistrement entier (une mise à jour partielle de Dexie perd les octets des photos). */
async function mettreDeCote(t: { get: (k: never) => Promise<unknown>; put: (o: never) => Promise<unknown> }, cle: unknown, motif: string) {
  const rec = await t.get(cle as never) as Record<string, unknown> | undefined;
  if (rec) await t.put({ ...rec, sync: 'rejete', rejet: motif } as never);
}

async function compter(etat: 'a_envoyer' | 'rejete'): Promise<number> {
  const n = await Promise.all([db.dab, db.fiches, db.reponses, db.etats, db.pieces, db.photos]
    .map((t) => (t as typeof db.photos).where('sync').equals(etat).count()));
  return n.reduce((a, b) => a + b, 0);
}
export const restants = () => compter('a_envoyer');
export const rejetes = () => compter('rejete');

/** BANQUE-VILLE-AGENCE-3 → BANQUE-VILLE-AGENCE-4 ; un code sans numéro final reçoit « -2 ». */
export function codeSuivant(code: string): string {
  const m = code.match(/^(.*)-(\d+)$/);
  return m ? `${m[1]}-${Number(m[2]) + 1}` : `${code}-2`;
}

/** Les refus sont retentés à chaque envoi (une correction côté serveur ou tablette peut les débloquer), sauf ceux d'une fiche validée. */
async function reessayerRefus() {
  for (const t of [db.dab, db.fiches, db.reponses, db.etats, db.pieces, db.photos] as unknown as (typeof db.photos)[])
    await t.where('sync').equals('rejete').filter((x) => (x as { rejet?: string }).rejet !== 'Fiche déjà validée')
      .modify({ sync: 'a_envoyer' });
}
