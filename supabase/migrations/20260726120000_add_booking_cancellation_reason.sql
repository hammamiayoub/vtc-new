-- Colonne cancellation_reason sur bookings (motif d'annulation)
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

COMMENT ON COLUMN public.bookings.cancellation_reason IS
  'Motif d''annulation (ex. « Absence de réponse du chauffeur » pour auto-cancel 4 h).';
