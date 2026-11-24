-- Relevé terrain Wincor — schéma
create table profils (
  id uuid primary key references auth.users(id) on delete cascade,
  nom text not null,
  role text not null check (role in ('admin','superviseur','consultant')),
  actif boolean not null default true
);

create table banques (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  nom text not null
);

create table sites (
  id uuid primary key default gen_random_uuid(),
  banque_id uuid not null references banques(id),
  nom text not null,
  ville text,
  lat double precision,
  lng double precision
);

create table dab (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  site_id uuid references sites(id),
  marque text,
  modele text,
  numero_serie text,
  ville text,
  origine text not null default 'reference' check (origine in ('reference','nouveau_a_verifier')),
  cree_par uuid references auth.users(id)
);

create table checklist_items (
  id text primary key,
  ordre int not null,
  libelle text not null,
  module text,
  consigne text,
  obligatoire boolean not null default true,
  modele text not null default 'Tous',
  photo_requise boolean not null default false,
  commentaire_requis boolean not null default false,
  actif boolean not null default true
);

create table articles (
  pn text primary key,
  designation text
);

create table parametres (
  cle text primary key,
  valeur text not null
);
insert into parametres values ('duree_min_minutes','60'), ('distance_max_metres','300');

create table fiches (
  id uuid primary key,
  dab_id uuid not null references dab(id),
  consultant_id uuid not null references auth.users(id),
  statut text not null default 'brouillon' check (statut in ('brouillon','terminee','validee','renvoyee')),
  arrivee_at timestamptz not null,
  arrivee_lat double precision,
  arrivee_lng double precision,
  arrivee_precision double precision,
  arrivee_gps_at timestamptz,
  gps_motif text check (gps_motif in ('indisponible','refuse')),
  depart_at timestamptz,
  depart_lat double precision,
  depart_lng double precision,
  identification jsonb not null default '{}',
  systeme jsonb not null default '{}',
  cloture jsonb not null default '{}',
  sans_signature boolean not null default false,
  motif_renvoi text,
  recu_at timestamptz not null default now(),
  maj_at timestamptz not null default now()
);
create index on fiches (dab_id);
create index on fiches (consultant_id);

create table reponses_checklist (
  fiche_id uuid not null references fiches(id) on delete cascade,
  item_id text not null references checklist_items(id),
  valeur text not null check (valeur in ('OK','NOK','NA')),
  commentaire text,
  primary key (fiche_id, item_id)
);

create table etats_modules (
  fiche_id uuid not null references fiches(id) on delete cascade,
  module text not null,
  etat text not null check (etat in ('Bon','Use','A_remplacer','Absent')),
  commentaire text,
  primary key (fiche_id, module)
);

create table pieces_a_prevoir (
  id uuid primary key,
  fiche_id uuid not null references fiches(id) on delete cascade,
  module text not null,
  pn text references articles(pn),
  pn_libre text,
  quantite int not null check (quantite > 0),
  check (pn is not null or pn_libre is not null)
);

create table photos (
  id uuid primary key,
  fiche_id uuid not null references fiches(id) on delete cascade,
  cible text not null,
  storage_path text not null,
  prise_at timestamptz,
  prise_tablette_at timestamptz not null,
  recu_at timestamptz not null default now()
);
create index on photos (fiche_id);

create table historique_fiches (
  id bigserial primary key,
  fiche_id uuid not null references fiches(id) on delete cascade,
  at timestamptz not null default now(),
  par uuid,
  action text not null,
  details jsonb
);

-- Heure de réception imposée par le serveur
create function forcer_recu_at() returns trigger language plpgsql as $$
begin
  new.recu_at := now();
  return new;
end $$;
create trigger fiches_recu before insert on fiches for each row execute function forcer_recu_at();
create trigger photos_recu before insert or update on photos for each row execute function forcer_recu_at();

-- Mise à jour d'une fiche : maj_at + historique
create function suivre_fiche() returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.maj_at := now();
  if new.statut is distinct from old.statut then
    insert into historique_fiches (fiche_id, par, action, details)
    values (new.id, auth.uid(), 'statut', jsonb_build_object('avant', old.statut, 'apres', new.statut, 'motif', new.motif_renvoi));
  elsif old.statut = 'terminee' then
    insert into historique_fiches (fiche_id, par, action, details)
    values (new.id, auth.uid(), 'modification_apres_terminer', null);
  end if;
  return new;
end $$;
create trigger fiches_suivi before update on fiches for each row execute function suivre_fiche();
