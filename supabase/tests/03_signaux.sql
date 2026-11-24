begin;
\i 00_jeu.sql
-- site test : -4.27, 15.28 ; fiche A1 (consultant A)
update fiches set arrivee_at='2026-12-01 08:00+00', depart_at='2026-12-01 08:45+00', arrivee_lat=-4.27, arrivee_lng=15.28
 where id='40000000-0000-0000-0000-0000000000a1';
do $$
declare v record;
begin
  select * into v from v_fiches_signaux where fiche_id='40000000-0000-0000-0000-0000000000a1';
  if not v.douteux or not ('Visite de moins de 60 min' = any(v.raisons)) then raise exception 'ECHEC 45 min: %', v.raisons; end if;
  update fiches set depart_at='2026-12-01 08:59+00' where id='40000000-0000-0000-0000-0000000000a1';
  select * into v from v_fiches_signaux where fiche_id='40000000-0000-0000-0000-0000000000a1';
  if not ('Visite de moins de 60 min' = any(v.raisons)) then raise exception 'ECHEC 59 min'; end if;
  update fiches set depart_at='2026-12-01 09:01+00' where id='40000000-0000-0000-0000-0000000000a1';
  select * into v from v_fiches_signaux where fiche_id='40000000-0000-0000-0000-0000000000a1';
  if v.douteux then raise exception 'ECHEC 61 min douteux: %', v.raisons; end if;
  -- seuil modifié
  update parametres set valeur='90' where cle='duree_min_minutes';
  select * into v from v_fiches_signaux where fiche_id='40000000-0000-0000-0000-0000000000a1';
  if not ('Visite de moins de 90 min' = any(v.raisons)) then raise exception 'ECHEC seuil 90: %', v.raisons; end if;
  update parametres set valeur='60' where cle='duree_min_minutes';
  -- GPS à ~500 m
  update fiches set arrivee_lat=-4.2655 where id='40000000-0000-0000-0000-0000000000a1';
  select * into v from v_fiches_signaux where fiche_id='40000000-0000-0000-0000-0000000000a1';
  if not exists (select 1 from unnest(v.raisons) x where x like 'GPS à % m du site') then raise exception 'ECHEC GPS 500 m: %', v.raisons; end if;
  -- GPS refusé
  update fiches set arrivee_lat=null, arrivee_lng=null, gps_motif='refuse' where id='40000000-0000-0000-0000-0000000000a1';
  select * into v from v_fiches_signaux where fiche_id='40000000-0000-0000-0000-0000000000a1';
  if not ('GPS absent' = any(v.raisons)) then raise exception 'ECHEC GPS absent: %', v.raisons; end if;
  -- site sans coordonnées : non comparable, pas douteux pour cette seule raison
  update fiches set arrivee_lat=-4.27, arrivee_lng=15.28, gps_motif=null where id='40000000-0000-0000-0000-0000000000a1';
  update sites set lat=null, lng=null where id='20000000-0000-0000-0000-000000000001';
  select * into v from v_fiches_signaux where fiche_id='40000000-0000-0000-0000-0000000000a1';
  if v.douteux or not ('GPS non comparable (site sans coordonnées)' = any(v.raisons)) then raise exception 'ECHEC non comparable: % %', v.douteux, v.raisons; end if;
  -- chevauchement : 2e fiche du même consultant pendant la visite
  insert into dab (id, code, site_id, marque, origine) values ('30000000-0000-0000-0000-000000000002','TST-002','20000000-0000-0000-0000-000000000001','Wincor','reference');
  insert into fiches (id, dab_id, consultant_id, statut, arrivee_at, depart_at) values
   ('40000000-0000-0000-0000-0000000000a2','30000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-0000000000a1','terminee','2026-12-01 08:30+00','2026-12-01 10:00+00');
  select * into v from v_fiches_signaux where fiche_id='40000000-0000-0000-0000-0000000000a1';
  if not ('Chevauche la visite du DAB TST-002' = any(v.raisons)) then raise exception 'ECHEC chevauchement A1: %', v.raisons; end if;
  select * into v from v_fiches_signaux where fiche_id='40000000-0000-0000-0000-0000000000a2';
  if not ('Chevauche la visite du DAB TST-001' = any(v.raisons)) then raise exception 'ECHEC chevauchement A2: %', v.raisons; end if;
  delete from fiches where id='40000000-0000-0000-0000-0000000000a2';
  -- photo prise 3 h avant l'arrivée
  insert into photos (id, fiche_id, cible, storage_path, prise_at, prise_tablette_at) values
   (gen_random_uuid(),'40000000-0000-0000-0000-0000000000a1','plaque','x','2026-12-01 05:00+00','2026-12-01 08:05+00');
  select * into v from v_fiches_signaux where fiche_id='40000000-0000-0000-0000-0000000000a1';
  if not ('Photo prise hors de la visite' = any(v.raisons)) then raise exception 'ECHEC photo: %', v.raisons; end if;
end $$;
rollback;
select 'TESTS T10 OK' as resultat;
