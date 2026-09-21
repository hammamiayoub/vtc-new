const DEFAULT_PAGE_SIZE = 1000;
const MAX_ROWS = 50000;

/**
 * PostgREST plafonne chaque SELECT à 1000 lignes par défaut.
 * Rejoue la requête par pages jusqu'à épuisement (ou MAX_ROWS).
 */
export async function fetchAllPages<T>(
  buildQuery: () => { range: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }> },
  pageSize = DEFAULT_PAGE_SIZE
): Promise<T[]> {
  const rows: T[] = [];
  let from = 0;

  while (from < MAX_ROWS) {
    const { data, error } = await buildQuery().range(from, from + pageSize - 1);
    if (error) {
      throw new Error(error.message);
    }
    const page = data ?? [];
    rows.push(...page);
    if (page.length < pageSize) break;
    from += pageSize;
  }

  return rows;
}
