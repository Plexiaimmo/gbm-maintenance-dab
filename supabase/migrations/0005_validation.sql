-- Validation et renvoi des fiches (admin)
create function valider_fiche(p_id uuid, appliquer_corrections boolean) returns void
language plpgsql set search_path = public as $$
declare f fiches;
begin
  if role_courant() is distinct from 'admin' then raise exception 'Réservé à l''administrateur' using errcode = '42501'; end if;
  select * into f from fiches where id = p_id;
  if not found then raise exception 'Fiche introuvable'; end if;
  if f.statut <> 'terminee' then raise exception 'Seule une fiche terminée peut être validée'; end if;
  if appliquer_corrections then
    update dab set
      numero_serie = coalesce(nullif(upper(regexp_replace(coalesce(f.identification->>'numero_serie', ''), '\s', '', 'g')), ''), numero_serie),
      modele = coalesce(nullif(trim(f.identification->>'modele'), ''), modele)
    where id = f.dab_id;
    if f.arrivee_lat is not null then
      update sites set lat = f.arrivee_lat, lng = f.arrivee_lng
      where id = (select site_id from dab where id = f.dab_id);
    end if;
    insert into historique_fiches (fiche_id, par, action, details)
    values (p_id, auth.uid(), 'corrections_appliquees',
            jsonb_build_object('numero_serie', f.identification->>'numero_serie', 'modele', f.identification->>'modele',
                               'lat', f.arrivee_lat, 'lng', f.arrivee_lng));
  end if;
  update fiches set statut = 'validee', motif_renvoi = null where id = p_id;
end $$;

create function renvoyer_fiche(p_id uuid, motif text) returns void
language plpgsql set search_path = public as $$
begin
  if role_courant() is distinct from 'admin' then raise exception 'Réservé à l''administrateur' using errcode = '42501'; end if;
  if motif is null or trim(motif) = '' then raise exception 'Le motif du renvoi est obligatoire'; end if;
  update fiches set statut = 'renvoyee', motif_renvoi = trim(motif) where id = p_id and statut = 'terminee';
  if not found then raise exception 'Seule une fiche terminée peut être renvoyée'; end if;
end $$;

revoke execute on function valider_fiche(uuid, boolean) from public, anon;
revoke execute on function renvoyer_fiche(uuid, text) from public, anon;
grant execute on function valider_fiche(uuid, boolean) to authenticated;
grant execute on function renvoyer_fiche(uuid, text) to authenticated;
