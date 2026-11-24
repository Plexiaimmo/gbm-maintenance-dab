-- Signaux de contrôle du consultant
create function distance_metres(lat1 float8, lng1 float8, lat2 float8, lng2 float8) returns float8
language sql immutable set search_path = public as $$
  select 2 * 6371000 * asin(sqrt(
    power(sin(radians(lat2 - lat1) / 2), 2) +
    cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lng2 - lng1) / 2), 2)))
$$;

create view v_fiches_signaux with (security_invoker = true) as
with p as (
  select coalesce((select valeur::int from parametres where cle = 'duree_min_minutes'), 60) as duree_min,
         coalesce((select valeur::int from parametres where cle = 'distance_max_metres'), 300) as dist_max
), base as (
  select f.id, f.consultant_id, f.arrivee_at, f.depart_at, f.arrivee_lat, f.arrivee_lng, f.sans_signature,
         s.lat as site_lat, s.lng as site_lng, p.duree_min, p.dist_max
  from fiches f cross join p
  left join dab d on d.id = f.dab_id left join sites s on s.id = d.site_id
), r as (
  select b.id, b.sans_signature,
    array_remove(array[
      case when b.depart_at is not null and extract(epoch from b.depart_at - b.arrivee_at) / 60 < b.duree_min
           then format('Visite de moins de %s min', b.duree_min) end,
      case when b.arrivee_lat is null then 'GPS absent'
           when b.site_lat is null then null
           when distance_metres(b.arrivee_lat, b.arrivee_lng, b.site_lat, b.site_lng) > b.dist_max
           then format('GPS à %s m du site', round(distance_metres(b.arrivee_lat, b.arrivee_lng, b.site_lat, b.site_lng))) end,
      (select format('Chevauche la visite du DAB %s', d2.code) from fiches f2 join dab d2 on d2.id = f2.dab_id
        where f2.consultant_id = b.consultant_id and f2.id <> b.id
          and tstzrange(f2.arrivee_at, coalesce(f2.depart_at, f2.arrivee_at), '[]')
           && tstzrange(b.arrivee_at, coalesce(b.depart_at, b.arrivee_at), '[]')
        order by f2.arrivee_at limit 1),
      case when exists (select 1 from photos ph where ph.fiche_id = b.id and ph.prise_at is not null
             and (ph.prise_at < b.arrivee_at - interval '10 minutes'
                  or ph.prise_at > coalesce(b.depart_at, now()) + interval '10 minutes'))
           then 'Photo prise hors de la visite' end
    ], null) as raisons,
    (b.arrivee_lat is not null and b.site_lat is null) as gps_non_comparable
  from base as b
)
select id as fiche_id,
       cardinality(raisons) > 0 as douteux,
       raisons || case when gps_non_comparable then array['GPS non comparable (site sans coordonnées)'] else '{}'::text[] end as raisons,
       sans_signature
from r;
