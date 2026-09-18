import { supabase } from '../../lib/supabase';

/** Chauffeurs ayant refusé une course de ce client dans la dernière heure. */
export async function fetchRefusedDriverIds(clientId: string): Promise<Set<string>> {
  const refused = new Set<string>();
  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: refusals } = await supabase
      .from('bookings')
      .select('driver_id')
      .eq('client_id', clientId)
      .eq('status', 'cancelled')
      .is('accepted_at', null)
      .not('driver_id', 'is', null)
      .gte('created_at', oneHourAgo);

    if (refusals?.length) {
      refusals.forEach((r: { driver_id?: string | null }) => {
        if (r.driver_id) refused.add(r.driver_id);
      });
    }
  } catch (error) {
    console.warn('Impossible de vérifier les refus récents:', error);
  }
  return refused;
}
