/**
 * Valeur d'un champ `datetime-local` (« 2026-11-16T14:30 ») en heure locale de l'utilisateur.
 * Ne pas utiliser `toISOString()` pour cela : il renvoie l'heure UTC, soit une heure de retard
 * en Tunisie.
 */
export function toLocalDateTimeInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
