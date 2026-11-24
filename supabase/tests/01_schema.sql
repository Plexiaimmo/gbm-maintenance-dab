begin;
\i 00_jeu.sql
do $$
declare n int; r timestamptz;
begin
  -- valeur de réponse invalide
  begin
    insert into reponses_checklist (fiche_id,item_id,valeur) values ('40000000-0000-0000-0000-0000000000a1','CHK-T1','KO');
    raise exception 'ECHEC: valeur KO acceptée';
  exception when check_violation then null; end;
  -- quantité nulle
  begin
    insert into pieces_a_prevoir (id,fiche_id,module,pn_libre,quantite) values (gen_random_uuid(),'40000000-0000-0000-0000-0000000000a1','PC','X',0);
    raise exception 'ECHEC: quantité 0 acceptée';
  exception when check_violation then null; end;
  -- historique sur changement de statut
  update fiches set statut='terminee' where id='40000000-0000-0000-0000-0000000000a1';
  select count(*) into n from historique_fiches where fiche_id='40000000-0000-0000-0000-0000000000a1';
  if n <> 1 then raise exception 'ECHEC: historique attendu 1, obtenu %', n; end if;
  -- recu_at forcé par le serveur
  insert into photos (id,fiche_id,cible,storage_path,prise_tablette_at,recu_at) values (gen_random_uuid(),'40000000-0000-0000-0000-0000000000a1','plaque','x', now(), '2000-01-01');
  select recu_at into r from photos where fiche_id='40000000-0000-0000-0000-0000000000a1';
  if r < now() - interval '1 minute' then raise exception 'ECHEC: recu_at client accepté (%)', r; end if;
  raise notice 'OK 01_schema';
end $$;
rollback;
