insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', true)
on conflict (id) do nothing;

create policy "Public can read attachments"
on storage.objects
as permissive
for select
to public
using (bucket_id = 'attachments');

create policy "Authenticated users can upload attachments"
on storage.objects
as permissive
for insert
to authenticated
with check (
  bucket_id = 'attachments'
  and (storage.foldername(name))[1] is not null
);

create policy "Authenticated users can update attachments"
on storage.objects
as permissive
for update
to authenticated
using (
  bucket_id = 'attachments'
  and (storage.foldername(name))[1] is not null
);
