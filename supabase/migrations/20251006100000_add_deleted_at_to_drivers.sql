-- Add deleted_at column for soft delete compatibility on drivers
-- If Supabase API "soft delete" is enabled, DELETE will set this column

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'drivers'
      AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE public.drivers
      ADD COLUMN deleted_at timestamptz NULL;

    COMMENT ON COLUMN public.drivers.deleted_at IS 'Soft delete timestamp; NULL means active row';
  END IF;
END
$$;

-- Optional: index to speed up lookups for active rows if you later filter by deleted_at IS NULL
CREATE INDEX IF NOT EXISTS drivers_deleted_at_null_idx
  ON public.drivers (id)
  WHERE deleted_at IS NULL;


