-- Création directe d'un compte (amorçage, sans passer par l'application).
-- Remplacer les 4 valeurs, exécuter, puis transmettre le mot de passe à la personne.
-- Après l'amorçage, préférer la fonction serveur gerer-utilisateurs (appelée par un admin connecté).
create or replace function pg_temp.creer(p_email text, p_mdp text, p_nom text, p_role text) returns uuid language plpgsql as $$
declare uid uuid := gen_random_uuid();
begin
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token)
  values ('00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated', p_email,
    extensions.crypt(p_mdp, extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '');
  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), uid, uid::text, jsonb_build_object('sub', uid::text, 'email', p_email, 'email_verified', true), 'email', now(), now(), now());
  insert into public.profils (id, nom, role) values (uid, p_nom, p_role);
  return uid;
end $$;
select pg_temp.creer('EMAIL', 'MOT_DE_PASSE', 'NOM', 'consultant');
