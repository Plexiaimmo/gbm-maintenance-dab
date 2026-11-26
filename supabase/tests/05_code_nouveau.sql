-- Autonome. Résultat attendu : TESTS T12 OK
begin;
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000a1','a@test.local');
insert into profils (id, nom, role) values ('00000000-0000-0000-0000-0000000000a1','Consultant A','consultant');
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
do $$ begin
  begin
    insert into dab (id, code, ville, origine, cree_par) values (gen_random_uuid(), 'dab poto 2', 'Brazzaville', 'nouveau_a_verifier', '00000000-0000-0000-0000-0000000000a1');
    raise exception 'ECHEC code libre accepté';
  exception when check_violation then null; end;
  insert into dab (id, code, ville, origine, cree_par, code_banque) values (gen_random_uuid(), 'BGFI-BZV-POTO-POTO-9', 'Brazzaville', 'nouveau_a_verifier', '00000000-0000-0000-0000-0000000000a1', 'DAB_POTO_02');
  -- Une ville hors Brazzaville / Pointe-Noire ne doit jamais bloquer l'envoi.
  insert into dab (id, code, ville, origine, cree_par) values (gen_random_uuid(), 'LCB-MOS-MARCHE-1', 'Mossaka', 'nouveau_a_verifier', '00000000-0000-0000-0000-0000000000a1');
end $$;
rollback;
select 'TESTS T12 OK' as resultat;
