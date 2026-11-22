-- Correctif : « Bucket not found » sur les photos et factures de colis.
--
-- Supabase répond « Bucket not found » à une URL publique (/object/public/parcel-photos/...)
-- dans deux cas : le bucket n'existe pas, OU il existe mais n'est pas public.
-- Ce script gère les deux. Il peut être rejoué sans risque.

-- 1. Diagnostic (à lire avant de continuer)
select id, name, public, file_size_limit, allowed_mime_types
from storage.buckets
where id = 'parcel-photos';

-- 2. Création / mise en conformité du bucket (photos + PDF pour les factures)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'parcel-photos',
  'parcel-photos',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']
)
on conflict (id) do update set
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];

-- 3. Politiques d'accès (identiques à la migration 20260602160000)
drop policy if exists "Clients can upload parcel photos" on storage.objects;
create policy "Clients can upload parcel photos"
on storage.objects for insert to authenticated
with check (bucket_id = 'parcel-photos');

drop policy if exists "Public read access to parcel photos" on storage.objects;
create policy "Public read access to parcel photos"
on storage.objects for select to public
using (bucket_id = 'parcel-photos');

drop policy if exists "Clients can delete their parcel photos" on storage.objects;
create policy "Clients can delete their parcel photos"
on storage.objects for delete to authenticated
using (bucket_id = 'parcel-photos');

-- 4. Vérification : public doit valoir true
select id, public, allowed_mime_types from storage.buckets where id = 'parcel-photos';
