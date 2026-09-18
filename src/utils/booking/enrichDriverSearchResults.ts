import { supabase } from '../../lib/supabase';
import type { Driver } from '../../types';

/** Notes et nombre de courses pour l'affichage liste (après tri principal). */
export async function enrichDriversWithMetadata(
  drivers: Driver[],
  sortedDriverIds: string[],
): Promise<Driver[]> {
  const enriched = drivers.map((driver) => ({ ...driver }));
  const uniqueDriverIds = [...new Set(sortedDriverIds.filter(Boolean))];
  if (uniqueDriverIds.length === 0) return enriched;

  try {
    const { data: ratingRows, error: ratingErr } = await supabase
      .from('driver_rating_stats')
      .select('driver_id, average_rating, total_ratings')
      .in('driver_id', uniqueDriverIds);

    if (!ratingErr && ratingRows) {
      const ratingsByDriver = new Map<string, { average_rating: unknown; total_ratings: number }>();
      ratingRows.forEach((row) => {
        ratingsByDriver.set(row.driver_id, {
          average_rating: row.average_rating,
          total_ratings: row.total_ratings,
        });
      });

      for (const driver of enriched) {
        const stats = ratingsByDriver.get(driver.id);
        if (!stats) continue;
        driver.averageRating = typeof stats.average_rating === 'number'
          ? stats.average_rating
          : parseFloat(String(stats.average_rating));
        driver.totalRatings = stats.total_ratings;
      }
    }

    const driversMissingCount = enriched.filter((d) => typeof d.bookingCount !== 'number');
    if (driversMissingCount.length > 0) {
      const missingIds = [...new Set(driversMissingCount.map((d) => d.id))];
      const counts = await Promise.all(
        missingIds.map(async (id) => {
          const { count, error } = await supabase
            .from('bookings')
            .select('id', { count: 'exact', head: true })
            .eq('driver_id', id)
            .eq('status', 'completed');
          return { id, count: !error && typeof count === 'number' ? count : 0 };
        }),
      );

      const countsByDriver = new Map(counts.map((row) => [row.id, row.count]));
      for (const driver of enriched) {
        if (typeof driver.bookingCount !== 'number') {
          driver.bookingCount = countsByDriver.get(driver.id) ?? 0;
        }
      }
    }
  } catch (err) {
    console.warn('Impossible d\'enrichir les métadonnées chauffeurs:', err);
  }

  return enriched;
}
