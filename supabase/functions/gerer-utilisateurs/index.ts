// Création d'un compte utilisateur + profil. Réservé à un admin connecté.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { valider, type Corps } from './valider.ts';

const URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const entetes = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const rep = (statut: number, corps: unknown) => new Response(JSON.stringify(corps), { status: statut, headers: entetes });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: entetes });
  if (req.method !== 'POST') return rep(405, { erreur: 'Méthode non autorisée' });
  const admin = createClient(URL, SERVICE, { auth: { persistSession: false } });

  let autorise = false;
  const jwt = (req.headers.get('authorization') ?? '').replace('Bearer ', '');
  const { data: u } = await admin.auth.getUser(jwt);
  if (u.user) {
    const { data: p } = await admin.from('profils').select('role, actif').eq('id', u.user.id).single();
    autorise = p?.role === 'admin' && p?.actif === true;
  }
  if (!autorise) return rep(403, { erreur: 'Non autorisé' });

  const corps = (await req.json().catch(() => ({}))) as Corps;
  const erreur = valider(corps);
  if (erreur) return rep(400, { erreur });

  const { data, error } = await admin.auth.admin.createUser({
    email: corps.email!.toLowerCase(), password: corps.mot_de_passe!, email_confirm: true,
  });
  if (error) return rep(/already/i.test(error.message) ? 409 : 400, { erreur: error.message });
  const { error: e2 } = await admin.from('profils').insert({ id: data.user!.id, nom: corps.nom!.trim(), role: corps.role });
  if (e2) {
    await admin.auth.admin.deleteUser(data.user!.id);
    return rep(400, { erreur: e2.message });
  }
  return rep(200, { id: data.user!.id });
});
