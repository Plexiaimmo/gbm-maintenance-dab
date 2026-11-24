import { supabase } from '../supabase';
import type { DabSuivi, FicheSuivi, Signal } from './suivi';

const verifier = <T,>(r: { data: T | null; error: { message: string } | null }): T => {
  if (r.error) throw new Error(r.error.message);
  return r.data as T;
};

export async function chargerSuivi() {
  const [dabs, sites, banques, fiches, signaux] = await Promise.all([
    supabase.from('dab').select('id, code, ville, site_id, agence_saisie, origine').then(verifier),
    supabase.from('sites').select('id, nom, banque_id').then(verifier),
    supabase.from('banques').select('id, code').then(verifier),
    supabase.from('fiches').select('id, dab_id, statut, arrivee_at, depart_at, consultant_id').then(verifier),
    supabase.from('v_fiches_signaux').select('*').then(verifier),
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
