-- La validation applique aussi le code affiché sur le DAB (-> code_banque), la banque et l'agence relevées sur place,
-- et renvoie ce qui a été appliqué et ce qui ne l'a pas pu (banque inconnue, etc.) pour que l'administrateur le voie.
-- Le code interne du DAB (dab.code) ne change jamais.
drop function if exists valider_fiche(uuid, boolean);

create function valider_fiche(p_id uuid, appliquer_corrections boolean) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  f fiches; d dab;
  appliquees text[] := '{}'; non_appliquees text[] := '{}';
  nouv_code text; nouv_banque text; nouv_agence text;
  saisie text[]; banque_actuelle uuid; agence_actuelle text; banque_cible uuid; agence_cible text; site_cible uuid;
begin
  if role_courant() is distinct from 'admin' then raise exception 'Réservé à l''administrateur' using errcode = '42501'; end if;
  select * into f from fiches where id = p_id;
  if not found then raise exception 'Fiche introuvable'; end if;
  if f.statut <> 'terminee' then raise exception 'Seule une fiche terminée peut être validée'; end if;

  if appliquer_corrections then
    select * into d from dab where id = f.dab_id;

    update dab set
      numero_serie = coalesce(nullif(upper(regexp_replace(coalesce(f.identification->>'numero_serie', ''), '\s', '', 'g')), ''), numero_serie),
      modele = coalesce(nullif(trim(f.identification->>'modele'), ''), modele),
      marque = coalesce(nullif(trim(f.identification->>'marque'), ''), marque)
    where id = f.dab_id;

    -- Code affiché sur le DAB : gardé à part, sans toucher au code interne.
    nouv_code := nullif(upper(trim(f.identification->>'code_affiche')), '');
    if nouv_code is not null and nouv_code is distinct from d.code_banque then
      update dab set code_banque = nouv_code where id = f.dab_id;
      appliquees := array_append(appliquees, 'code_banque');
    end if;

    -- Banque et agence : on retrouve (ou on crée) l'agence de la bonne banque, sans doublon.
    nouv_banque := nullif(trim(f.identification->>'banque'), '');
    nouv_agence := nullif(trim(f.identification->>'agence'), '');
    if nouv_banque is not null or nouv_agence is not null then
      saisie := string_to_array(coalesce(d.agence_saisie, ''), ' — ');
      select banque_id, nom into banque_actuelle, agence_actuelle from sites where id = d.site_id;
      if banque_actuelle is null and saisie[1] is not null then
        select id into banque_actuelle from banques where upper(code) = upper(trim(saisie[1]));
      end if;
      agence_actuelle := coalesce(agence_actuelle, nullif(trim(saisie[2]), ''));

      if nouv_banque is not null then
        select id into banque_cible from banques where upper(code) = upper(nouv_banque);
        if banque_cible is null then
          non_appliquees := array_append(non_appliquees, 'banque inconnue : ' || nouv_banque);
          if nouv_agence is not null then non_appliquees := array_append(non_appliquees, 'agence non appliquée : ' || nouv_agence); end if;
        end if;
      else
        banque_cible := banque_actuelle;
        if banque_cible is null then non_appliquees := array_append(non_appliquees, 'agence non appliquée (banque du DAB inconnue) : ' || nouv_agence); end if;
      end if;

      agence_cible := coalesce(nouv_agence, agence_actuelle);
      if banque_cible is not null and agence_cible is not null then
        select id into site_cible from sites where banque_id = banque_cible and lower(trim(nom)) = lower(agence_cible) order by nom limit 1;
        if site_cible is null then
          insert into sites (banque_id, nom, ville) values (banque_cible, agence_cible, d.ville) returning id into site_cible;
        end if;
        if site_cible is distinct from d.site_id then
          update dab set site_id = site_cible where id = f.dab_id;
          if banque_cible is distinct from banque_actuelle then appliquees := array_append(appliquees, 'banque'); end if;
          if lower(agence_cible) is distinct from lower(coalesce(agence_actuelle, '')) then appliquees := array_append(appliquees, 'agence'); end if;
        end if;
      end if;
    end if;

    if f.arrivee_lat is not null then
      update sites set lat = f.arrivee_lat, lng = f.arrivee_lng
      where id = (select site_id from dab where id = f.dab_id);
    end if;

    insert into historique_fiches (fiche_id, par, action, details)
    values (p_id, auth.uid(), 'corrections_appliquees',
            jsonb_build_object('numero_serie', f.identification->>'numero_serie', 'modele', f.identification->>'modele', 'marque', f.identification->>'marque',
                               'lat', f.arrivee_lat, 'lng', f.arrivee_lng,
                               'appliquees', to_jsonb(appliquees), 'non_appliquees', to_jsonb(non_appliquees)));
  end if;

  update fiches set statut = 'validee', motif_renvoi = null where id = p_id;
  return jsonb_build_object('appliquees', to_jsonb(appliquees), 'non_appliquees', to_jsonb(non_appliquees));
end $$;

alter function valider_fiche(uuid, boolean) security definer;
revoke execute on function valider_fiche(uuid, boolean) from public, anon;
grant execute on function valider_fiche(uuid, boolean) to authenticated;
