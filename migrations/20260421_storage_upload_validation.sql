-- Harden storage uploads for issue photos with type and size checks.

begin;

drop policy if exists "issue_photos_insert_own" on storage.objects;
create policy "issue_photos_insert_own"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'issue-photos'
  and (storage.foldername(name))[1] = 'users'
  and (storage.foldername(name))[2] = auth.uid()::text
  and lower(storage.extension(name)) = any (array['jpg', 'jpeg', 'png', 'webp'])
  and coalesce(metadata->>'mimetype', '') = any (array['image/jpeg', 'image/jpg', 'image/png', 'image/webp'])
  and coalesce((metadata->>'size')::bigint, 0) <= 5242880
);

drop policy if exists "issue_photos_update_own" on storage.objects;
create policy "issue_photos_update_own"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'issue-photos'
  and (storage.foldername(name))[1] = 'users'
  and (storage.foldername(name))[2] = auth.uid()::text
)
with check (
  bucket_id = 'issue-photos'
  and (storage.foldername(name))[1] = 'users'
  and (storage.foldername(name))[2] = auth.uid()::text
  and lower(storage.extension(name)) = any (array['jpg', 'jpeg', 'png', 'webp'])
  and coalesce(metadata->>'mimetype', '') = any (array['image/jpeg', 'image/jpg', 'image/png', 'image/webp'])
  and coalesce((metadata->>'size')::bigint, 0) <= 5242880
);

commit;
