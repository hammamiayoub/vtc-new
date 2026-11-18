-- Retour arrière de 20261118110000_refund_free_ride_on_cancellation.sql
-- Les courses déjà restituées ne sont pas recomptées.

DROP TRIGGER IF EXISTS trigger_refund_driver_ride_on_cancellation ON public.bookings;
DROP FUNCTION IF EXISTS public.refund_driver_ride_on_cancellation();
