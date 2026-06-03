-- =============================================================================
-- Correctif PROD : colonne document_type + PDF sur bucket parcel-photos
-- Exécuter dans Supabase → SQL Editor (projet production)
-- =============================================================================

ALTER TABLE public.parcel_photos
  ADD COLUMN IF NOT EXISTS document_type text NOT NULL DEFAULT 'photo';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'parcel_photos_document_type_check'
  ) THEN
    ALTER TABLE public.parcel_photos
      ADD CONSTRAINT parcel_photos_document_type_check
      CHECK (document_type IN ('photo', 'invoice'));
  END IF;
END $$;

UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf'
]
WHERE id = 'parcel-photos';

-- Recharger le cache schéma PostgREST (API)
NOTIFY pgrst, 'reload schema';

-- Vérification
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'parcel_photos'
  AND column_name = 'document_type';
