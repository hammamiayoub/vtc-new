/*
  # Photos et factures sur les demandes de colis

  - document_type sur parcel_photos : 'photo' | 'invoice'
  - Bucket parcel-photos : autoriser les PDF (factures)
*/

ALTER TABLE public.parcel_photos
  ADD COLUMN IF NOT EXISTS document_type text NOT NULL DEFAULT 'photo'
  CHECK (document_type IN ('photo', 'invoice'));

-- Schéma storage (pas public) — table des buckets Supabase
UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf'
]
WHERE id = 'parcel-photos';
