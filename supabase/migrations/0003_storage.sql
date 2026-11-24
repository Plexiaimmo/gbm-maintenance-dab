-- Photos : bucket privé, chemin fiches/{fiche_id}/{photo_id}.jpg
insert into storage.buckets (id, name, public) values ('photos', 'photos', false)
on conflict (id) do nothing;

create policy photos_lecture on storage.objects for select to authenticated
  using (bucket_id = 'photos' and (
    public.role_courant() in ('admin','superviseur')
    or exists (select 1 from public.fiches f
               where f.id::text = (storage.foldername(name))[2] and f.consultant_id = auth.uid())));

create policy photos_depot on storage.objects for insert to authenticated
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = 'fiches'
              and public.fiche_modifiable(((storage.foldername(name))[2])::uuid));

create policy photos_remplacement on storage.objects for update to authenticated
  using (bucket_id = 'photos' and public.fiche_modifiable(((storage.foldername(name))[2])::uuid))
  with check (bucket_id = 'photos' and public.fiche_modifiable(((storage.foldername(name))[2])::uuid));
