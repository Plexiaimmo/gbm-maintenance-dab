alter function forcer_recu_at() set search_path = public;
revoke execute on function role_courant() from public, anon;
revoke execute on function fiche_modifiable(uuid) from public, anon;
revoke execute on function suivre_fiche() from public, anon, authenticated;
grant execute on function role_courant() to authenticated;
grant execute on function fiche_modifiable(uuid) to authenticated;
