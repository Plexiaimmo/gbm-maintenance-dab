-- La validation applique aussi la marque relevée sur place (code, banque et agence restent à vérifier à la main).
create or replace function valider_fiche(p_id uuid, appliquer_corrections boolean) returns void
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
      modele = coalesce(nullif(trim(f.identification->>'modele'), ''), modele),
      marque = coalesce(nullif(trim(f.identification->>'marque'), ''), marque)
    where id = f.dab_id;
    if f.arrivee_lat is not null then
      update sites set lat = f.arrivee_lat, lng = f.arrivee_lng
      where id = (select site_id from dab where id = f.dab_id);
    end if;
    insert into historique_fiches (fiche_id, par, action, details)
    values (p_id, auth.uid(), 'corrections_appliquees',
            jsonb_build_object('numero_serie', f.identification->>'numero_serie', 'modele', f.identification->>'modele', 'marque', f.identification->>'marque',
                               'lat', f.arrivee_lat, 'lng', f.arrivee_lng));
  end if;
  update fiches set statut = 'validee', motif_renvoi = null where id = p_id;
end $$;

alter function valider_fiche(uuid, boolean) security definer;
