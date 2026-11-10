-- Le chauffeur assigné peut lire le nom et le téléphone du client
-- une fois la course acceptée, en cours ou terminée.
-- Avant acceptation, la fiche client reste invisible.

DROP POLICY IF EXISTS "drivers_read_client_of_assigned_booking" ON public.clients;

CREATE POLICY "drivers_read_client_of_assigned_booking"
  ON public.clients
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.bookings b
      WHERE b.client_id = clients.id
        AND b.driver_id = auth.uid()
        AND b.status IN ('accepted', 'in_progress', 'completed')
    )
  );
