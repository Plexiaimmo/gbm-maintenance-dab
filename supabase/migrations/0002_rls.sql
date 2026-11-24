-- Règles d'accès
create function role_courant() returns text
language sql stable security definer set search_path = public as $$
  select role from profils where id = auth.uid() and actif
$$;

create function fiche_modifiable(f uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from fiches
    where id = f and consultant_id = auth.uid()
      and statut in ('brouillon','terminee','renvoyee')
  )
$$;

alter table profils enable row level security;
alter table banques enable row level security;
alter table sites enable row level security;
alter table dab enable row level security;
alter table checklist_items enable row level security;
alter table articles enable row level security;
alter table parametres enable row level security;
alter table fiches enable row level security;
alter table reponses_checklist enable row level security;
alter table etats_modules enable row level security;
alter table pieces_a_prevoir enable row level security;
alter table photos enable row level security;
alter table historique_fiches enable row level security;

-- Profils : chacun voit le sien, admin et superviseur voient tout, admin écrit
create policy profils_lecture on profils for select to authenticated
  using (id = auth.uid() or role_courant() in ('admin','superviseur'));
create policy profils_admin on profils for all to authenticated
  using (role_courant() = 'admin') with check (role_courant() = 'admin');

-- Référentiel : lecture pour tout utilisateur actif, écriture admin
do $$
declare t text;
begin
  foreach t in array array['banques','sites','dab','checklist_items','articles','parametres'] loop
    execute format('create policy %1$s_lecture on %1$s for select to authenticated using (role_courant() is not null)', t);
    execute format('create policy %1$s_admin on %1$s for all to authenticated using (role_courant() = ''admin'') with check (role_courant() = ''admin'')', t);
  end loop;
end $$;

-- Le consultant peut ajouter un DAB absent de la liste (marqué à vérifier)
create policy dab_ajout_consultant on dab for insert to authenticated
  with check (role_courant() = 'consultant' and origine = 'nouveau_a_verifier' and cree_par = auth.uid());

-- Fiches
create policy fiches_lecture on fiches for select to authenticated
  using (consultant_id = auth.uid() or role_courant() in ('admin','superviseur'));
create policy fiches_creation on fiches for insert to authenticated
  with check (consultant_id = auth.uid() and role_courant() = 'consultant' and statut in ('brouillon','terminee'));
create policy fiches_modif_consultant on fiches for update to authenticated
  using (consultant_id = auth.uid() and statut in ('brouillon','terminee','renvoyee'))
  with check (consultant_id = auth.uid() and statut in ('brouillon','terminee'));
create policy fiches_admin on fiches for all to authenticated
  using (role_courant() = 'admin') with check (role_courant() = 'admin');

-- Lignes filles d'une fiche
do $$
declare t text;
begin
  foreach t in array array['reponses_checklist','etats_modules','pieces_a_prevoir','photos'] loop
    execute format('create policy %1$s_lecture on %1$s for select to authenticated using (fiche_modifiable(fiche_id) or exists (select 1 from fiches f where f.id = fiche_id and f.consultant_id = auth.uid()) or role_courant() in (''admin'',''superviseur''))', t);
    execute format('create policy %1$s_ecriture on %1$s for all to authenticated using (fiche_modifiable(fiche_id) or role_courant() = ''admin'') with check (fiche_modifiable(fiche_id) or role_courant() = ''admin'')', t);
  end loop;
end $$;

create policy historique_lecture on historique_fiches for select to authenticated
  using (role_courant() in ('admin','superviseur')
         or exists (select 1 from fiches f where f.id = fiche_id and f.consultant_id = auth.uid()));
