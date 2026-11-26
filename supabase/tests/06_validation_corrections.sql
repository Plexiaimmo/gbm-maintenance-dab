-- Autonome. Résultat attendu : TESTS T13 OK
-- La validation applique aussi le code affiché, la banque et l'agence proposés par le consultant, et dit ce qu'elle n'a pas pu appliquer.
begin;
insert into auth.users (id, email) values
 ('00000000-0000-0000-0000-0000000000a1','a@test.local'), ('00000000-0000-0000-0000-0000000000d1','adm@test.local');
insert into profils (id, nom, role) values
 ('00000000-0000-0000-0000-0000000000a1','Consultant A','consultant'), ('00000000-0000-0000-0000-0000000000d1','Admin','admin');
insert into banques (id, code, nom) values
 ('10000000-0000-0000-0000-000000000001','TST','Banque test'), ('10000000-0000-0000-0000-000000000002','TS2','Banque test 2');
insert into sites (id, banque_id, nom, ville) values ('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','Agence test','Brazzaville');
insert into dab (id, code, site_id, marque, modele, ville, origine, agence_saisie) values
 ('30000000-0000-0000-0000-000000000001','TST-001','20000000-0000-0000-0000-000000000001','Wincor','ProCash','Brazzaville','reference',null),
 ('30000000-0000-0000-0000-000000000002','TST-BZV-VIEILLE-2',null,'Wincor','ProCash','Brazzaville','nouveau_a_verifier','TST — Vieille agence');
insert into fiches (id, dab_id, consultant_id, statut, arrivee_at, identification) values
 ('40000000-0000-0000-0000-0000000000f1','30000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000a1','terminee', now(), '{"code_affiche":" abc-12 ","banque":"TS2","agence":"Nouvelle agence"}'),
 ('40000000-0000-0000-0000-0000000000f2','30000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000a1','terminee', now(), '{"banque":"ZZZ","agence":"Ailleurs"}'),
 ('40000000-0000-0000-0000-0000000000f3','30000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000a1','terminee', now(), '{"agence":"nouvelle AGENCE"}'),
 ('40000000-0000-0000-0000-0000000000f4','30000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-0000000000a1','terminee', now(), '{"agence":"Autre lieu"}'),
 ('40000000-0000-0000-0000-0000000000f5','30000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000a1','terminee', now(), '{"code_affiche":"NOPE","banque":"TST","agence":"Agence test"}'),
 ('40000000-0000-0000-0000-0000000000f6','30000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-0000000000a1','terminee', now(), '{}');
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated"}';
do $$
declare d dab; s sites; r jsonb; n int;
begin
  -- 1. code affiché, banque et agence appliqués ; nouvelle agence créée sous la bonne banque
  r := valider_fiche('40000000-0000-0000-0000-0000000000f1', true);
  select * into d from dab where id = '30000000-0000-0000-0000-000000000001';
  if d.code_banque is distinct from 'ABC-12' then raise exception 'ECHEC code affiché: %', d.code_banque; end if;
  if d.code <> 'TST-001' then raise exception 'ECHEC le code interne ne doit jamais changer: %', d.code; end if;
  select * into s from sites where id = d.site_id;
  if s.nom <> 'Nouvelle agence' or s.banque_id <> '10000000-0000-0000-0000-000000000002' then raise exception 'ECHEC site: % %', s.nom, s.banque_id; end if;
  if not (r->'appliquees' ? 'code_banque' and r->'appliquees' ? 'banque' and r->'appliquees' ? 'agence') then raise exception 'ECHEC appliquees: %', r; end if;
  if jsonb_array_length(r->'non_appliquees') <> 0 then raise exception 'ECHEC non_appliquees: %', r; end if;

  -- 2. banque inconnue : rien ne change, et on le dit
  r := valider_fiche('40000000-0000-0000-0000-0000000000f2', true);
  select * into d from dab where id = '30000000-0000-0000-0000-000000000001';
  select * into s from sites where id = d.site_id;
  if s.nom <> 'Nouvelle agence' then raise exception 'ECHEC banque inconnue: le site a changé (%)', s.nom; end if;
  if jsonb_array_length(r->'non_appliquees') < 1 or r->>'non_appliquees' not like '%ZZZ%' then raise exception 'ECHEC non_appliquees doit citer ZZZ: %', r; end if;

  -- 3. même agence écrite autrement (casse) : pas de doublon
  select count(*) into n from sites;
  r := valider_fiche('40000000-0000-0000-0000-0000000000f3', true);
  if (select count(*) from sites) <> n then raise exception 'ECHEC doublon de site créé'; end if;
  if r->'appliquees' ? 'agence' then raise exception 'ECHEC agence déjà identique: %', r; end if;

  -- 4. DAB sans site (nouveau DAB) : la banque se lit dans agence_saisie, le site est créé
  r := valider_fiche('40000000-0000-0000-0000-0000000000f4', true);
  select * into d from dab where id = '30000000-0000-0000-0000-000000000002';
  select * into s from sites where id = d.site_id;
  if s.nom <> 'Autre lieu' or s.banque_id <> '10000000-0000-0000-0000-000000000001' then raise exception 'ECHEC nouveau DAB: % %', s.nom, s.banque_id; end if;

  -- 5. sans « appliquer » : le DAB ne bouge pas et rien n'est annoncé comme appliqué
  r := valider_fiche('40000000-0000-0000-0000-0000000000f5', false);
  select * into d from dab where id = '30000000-0000-0000-0000-000000000001';
  if d.code_banque is distinct from 'ABC-12' then raise exception 'ECHEC sans appliquer: code_banque a changé (%)', d.code_banque; end if;
  if jsonb_array_length(r->'appliquees') <> 0 then raise exception 'ECHEC sans appliquer: %', r; end if;

  -- 6. fiche sans correction : résultat vide
  r := valider_fiche('40000000-0000-0000-0000-0000000000f6', true);
  if jsonb_array_length(r->'non_appliquees') <> 0 then raise exception 'ECHEC fiche vide: %', r; end if;

  -- 7. l'historique garde la trace de ce qui a été appliqué
  select count(*) into n from historique_fiches where fiche_id = '40000000-0000-0000-0000-0000000000f1' and details ? 'appliquees';
  if n <> 1 then raise exception 'ECHEC historique sans le détail des corrections'; end if;
end $$;
rollback;
select 'TESTS T13 OK' as resultat;
