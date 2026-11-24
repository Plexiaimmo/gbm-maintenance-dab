begin;
\i 00_jeu.sql
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
do $$
declare n int;
begin
  select count(*) into n from fiches where id='40000000-0000-0000-0000-0000000000b1';
  if n <> 0 then raise exception 'ECHEC: A voit la fiche de B'; end if;
  select count(*) into n from fiches; if n <> 1 then raise exception 'ECHEC: A voit % fiches', n; end if;
  select count(*) into n from profils; if n <> 1 then raise exception 'ECHEC: A voit % profils', n; end if;
  select count(*) into n from dab; if n < 1 then raise exception 'ECHEC: A ne voit pas les DAB'; end if;
  begin
    insert into fiches (id,dab_id,consultant_id,statut,arrivee_at) values (gen_random_uuid(),'30000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000b1','brouillon',now());
    raise exception 'ECHEC: A crée une fiche pour B';
  exception when insufficient_privilege then null; end;
  insert into fiches (id,dab_id,consultant_id,statut,arrivee_at) values (gen_random_uuid(),'30000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000a1','brouillon',now());
  begin
    update fiches set statut='validee' where id='40000000-0000-0000-0000-0000000000a1';
  exception when insufficient_privilege then null; end;
  -- le consultant ne peut pas valider
  select count(*) into n from fiches where statut='validee';
  if n <> 0 then raise exception 'ECHEC: consultant a validé sa fiche'; end if;
  raise notice 'OK consultant';
end $$;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}';
do $$
declare n int;
begin
  select count(*) into n from fiches; if n < 2 then raise exception 'ECHEC: superviseur voit % fiches', n; end if;
  update fiches set motif_renvoi='x';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'ECHEC: superviseur a modifié % fiches', n; end if;
  raise notice 'OK superviseur';
end $$;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated"}';
do $$
declare n int;
begin
  update fiches set statut='validee' where id='40000000-0000-0000-0000-0000000000b1';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'ECHEC: admin ne peut pas valider'; end if;
  select count(*) into n from profils; if n < 4 then raise exception 'ECHEC: admin voit % profils', n; end if;
  raise notice 'OK admin';
end $$;
rollback;
