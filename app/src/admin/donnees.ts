import { supabase } from '../supabase';
import { toutLire } from '../lib/pagination';
import type { DabSuivi, FicheSuivi, Signal } from './suivi';

const verifier = <T,>(r: { data: T | null; error: { message: string } | null }): T => {
  if (r.error) throw new Error(r.error.message);
  return r.data as T;
};

export async function chargerSuivi() {
  const [dabs, sites, banques, fiches, signaux] = await Promise.all([
    toutLire((de, a) => supabase.from('dab').select('id, code, ville, site_id, agence_saisie, origine').range(de, a)),
    toutLire((de, a) => supabase.from('sites').select('id, nom, banque_id').range(de, a)),
    toutLire((de, a) => supabase.from('banques').select('id, code').range(de, a)),
    toutLire((de, a) => supabase.from('fiches').select('id, dab_id, statut, arrivee_at, depart_at, consultant_id').range(de, a)),
    toutLire((de, a) => supabase.from('v_fiches_signaux').select('*').range(de, a)),
  ]) as [Record<string, string | null>[], Record<string, string>[], Record<string, string>[], FicheSuivi[], Signal[]];
  const d: DabSuivi[] = dabs.map((x) => {
    const s = sites.find((y) => y.id === x.site_id);
    return { id: x.id!, code: x.code!, ville: x.ville, site_id: x.site_id,
      banque: banques.find((b) => b.id === s?.banque_id)?.code ?? x.agence_saisie?.split(' — ')[0] ?? '',
      agence: s?.nom ?? x.agence_saisie?.split(' — ')[1] ?? '' };
  });
  return { dabs: d, fiches, signaux };
}

export async function chargerDetail(id: string) {
  const fiche = verifier(await supabase.from('fiches').select('*').eq('id', id).single()) as Record<string, any>;
  const [reponses, etats, pieces, photos, historique, signal, dab, items] = await Promise.all([
    supabase.from('reponses_checklist').select('*').eq('fiche_id', id).then(verifier),
    supabase.from('etats_modules').select('*').eq('fiche_id', id).then(verifier),
    supabase.from('pieces_a_prevoir').select('*').eq('fiche_id', id).then(verifier),
    supabase.from('photos').select('*').eq('fiche_id', id).then(verifier),
    supabase.from('historique_fiches').select('*').eq('fiche_id', id).order('at').then(verifier),
    supabase.from('v_fiches_signaux').select('*').eq('fiche_id', id).maybeSingle().then(verifier),
    supabase.from('dab').select('*, sites(nom, lat, lng)').eq('id', fiche.dab_id).single().then(verifier),
    supabase.from('checklist_items').select('id, libelle, module, ordre').order('ordre').then(verifier),
  ]) as any[];
  const chemins = (photos as { storage_path: string }[]).map((p) => p.storage_path);
  const urls = chemins.length ? verifier(await supabase.storage.from('photos').createSignedUrls(chemins, 3600)) as { path: string; signedUrl: string }[] : [];
  return { fiche, reponses, etats, pieces, historique, signal, dab, items,
    photos: (photos as any[]).map((p) => ({ ...p, url: urls.find((u) => u.path === p.storage_path)?.signedUrl })) };
}

export async function valider(id: string, appliquer: boolean) {
  const { error } = await supabase.rpc('valider_fiche', { p_id: id, appliquer_corrections: appliquer });
  if (error) throw new Error(error.message);
}

export async function renvoyer(id: string, motif: string) {
  const { error } = await supabase.rpc('renvoyer_fiche', { p_id: id, motif });
  if (error) throw new Error(error.message);
}

/** Rassemble toutes les fiches pour l'export Excel. */
export async function chargerExport() {
  const { dabs, fiches, signaux } = await chargerSuivi();
  const [completes, reponses, etats, pieces, articles, items] = await Promise.all([
    toutLire((de, a) => supabase.from('fiches').select('*').range(de, a)),
    toutLire((de, a) => supabase.from('reponses_checklist').select('*').range(de, a)),
    toutLire((de, a) => supabase.from('etats_modules').select('*').range(de, a)),
    toutLire((de, a) => supabase.from('pieces_a_prevoir').select('*').range(de, a)),
    toutLire((de, a) => supabase.from('articles').select('pn, designation').range(de, a)),
    toutLire((de, a) => supabase.from('checklist_items').select('id, libelle').range(de, a)),
  ]) as any[];
  return {
    fiches: (completes as any[]).map((f) => {
      const d = dabs.find((x) => x.id === f.dab_id); const s = signaux.find((x) => x.fiche_id === f.id);
      return { ...f, dab_code: d?.code ?? '', banque: d?.banque ?? '', agence: d?.agence ?? '', ville: d?.ville ?? null,
        douteux: !!s?.douteux, raisons: s?.raisons ?? [], sans_signature: !!f.sans_signature };
    }),
    reponses: (reponses as any[]).map((r) => ({ ...r, libelle: (items as any[]).find((i) => i.id === r.item_id)?.libelle ?? r.item_id })),
    etats, pieces, articles, _nb: fiches.length,
  };
}
