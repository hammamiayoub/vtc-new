import { supabase } from '../lib/supabase';

export interface PlatformStats {
  completedBookings: number;
  activeDrivers: number;
  averageRating: number | null;
  totalRatings: number;
}

const EMPTY_STATS: PlatformStats = {
  completedBookings: 0,
  activeDrivers: 0,
  averageRating: null,
  totalRatings: 0,
};

type RpcRow = {
  completed_bookings?: number;
  active_drivers?: number;
  average_rating?: number | string;
  total_ratings?: number;
};

export async function fetchPlatformStats(): Promise<PlatformStats> {
  try {
    const { data, error } = await supabase.rpc('get_public_platform_stats');

    if (error || !data) {
      console.warn('Impossible de charger les statistiques publiques:', error?.message);
      return EMPTY_STATS;
    }

    const row = data as RpcRow;
    const avgRaw = row.average_rating;
    const averageRating =
      avgRaw != null && Number(avgRaw) > 0 ? Number(Number(avgRaw).toFixed(1)) : null;

    return {
      completedBookings: row.completed_bookings ?? 0,
      activeDrivers: row.active_drivers ?? 0,
      averageRating,
      totalRatings: row.total_ratings ?? 0,
    };
  } catch (err) {
    console.warn('Erreur statistiques publiques:', err);
    return EMPTY_STATS;
  }
}
