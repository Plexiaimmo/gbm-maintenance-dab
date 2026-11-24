-- Autonome (ne dépend pas de 00_jeu.sql). Résultat attendu : TESTS T11 OK
begin;
insert into auth.users (id, email) values
 ('00000000-0000-0000-0000-0000000000a1','a@test.local'), ('00000000-0000-0000-0000-0000000000d1','adm@test.local');
insert into profils (id, nom, role) values
 ('00000000-0000-0000-0000-0000000000a1','Consultant A','consultant'), ('00000000-0000-0000-0000-0000000000d1','Admin','admin');
insert into banques (id, code, nom) values ('10000000-0000-0000-0000-000000000001','TST','Banque test');
insert into sites (id, banque_id, nom, ville, lat, lng) values ('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','Agence test','Brazzaville',null,null);
insert into dab (id, code, site_id, marque, modele, numero_serie, ville, origine) values ('30000000-0000-0000-0000-000000000001','TST-001','20000000-0000-0000-0000-000000000001','Wincor','ProCash','ANCIEN','Brazzaville','reference');
insert into fiches (id, dab_id, consultant_id, statut, arrivee_at, arrivee_lat, arrivee_lng, identification) values
 ('40000000-0000-0000-0000-0000000000a1','30000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000a1','terminee', now(), -4.26, 15.24, '{"numero_serie":" ab 12 ","modele":"ProCash 2050xe"}'),
 ('40000000-0000-0000-0000-0000000000a2','30000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000a1','terminee', now(), -4.0, 15.0, '{"numero_serie":"AUTRE","modele":"X"}'),
 ('40000000-0000-0000-0000-0000000000a3','30000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000a1','terminee', now(), null, null, '{}');
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
do $$ begin
  begin perform valider_fiche('40000000-0000-0000-0000-0000000000a1', true); raise exception 'ECHEC consultant a validé';
  exception when insufficient_privilege then null; end;
end $$;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated"}';
do $$
declare d dab; s sites; n int; st text;
begin
  perform valider_fiche('40000000-0000-0000-0000-0000000000a1', true);
  select * into d from dab where id='30000000-0000-0000-0000-000000000001';
  if d.numero_serie <> 'AB12' or d.modele <> 'ProCash 2050xe' then raise exception 'ECHEC corrections DAB: % %', d.numero_serie, d.modele; end if;
  select * into s from sites where id='20000000-0000-0000-0000-000000000001';
  if s.lat <> -4.26 then raise exception 'ECHEC GPS site: %', s.lat; end if;
  select statut into st from fiches where id='40000000-0000-0000-0000-0000000000a1';
  if st <> 'validee' then raise exception 'ECHEC statut %', st; end if;
  select count(*) into n from historique_fiches where fiche_id='40000000-0000-0000-0000-0000000000a1';
  if n <> 2 then raise exception 'ECHEC historique % (attendu 2)', n; end if;
  perform valider_fiche('40000000-0000-0000-0000-0000000000a2', false);
  select * into d from dab where id='30000000-0000-0000-0000-000000000001';
  if d.numero_serie <> 'AB12' then raise exception 'ECHEC sans corrections le DAB a changé'; end if;
  begin perform renvoyer_fiche('40000000-0000-0000-0000-0000000000a3', '  '); raise exception 'ECHEC renvoi sans motif';
  exception when raise_exception then if sqlerrm not like '%motif%' then raise; end if; end;
  perform renvoyer_fiche('40000000-0000-0000-0000-0000000000a3', 'Photo du ticket floue');
  select statut into st from fiches where id='40000000-0000-0000-0000-0000000000a3';
  if st <> 'renvoyee' then raise exception 'ECHEC renvoi statut %', st; end if;
  select count(*) into n from historique_fiches where fiche_id='40000000-0000-0000-0000-0000000000a3' and details->>'motif' = 'Photo du ticket floue';
  if n <> 1 then raise exception 'ECHEC historique renvoi'; end if;
end $$;
rollback;
select 'TESTS T11 OK' as resultat;
