/**
 * Dates de dernière mise à jour des documents juridiques (format AAAA-MM-JJ).
 * À modifier à la main, uniquement quand le contenu du document change réellement.
 * Valeurs initiales : date du dernier commit modifiant chaque fichier.
 */
export const LEGAL_UPDATED_AT = {
  terms: '2026-11-25',
  privacy: '2026-11-23',
} as const;

export function formatLegalDate(iso: string, locale: 'fr' | 'en'): string {
  // Midi UTC pour éviter tout décalage de jour selon le fuseau du navigateur.
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString(locale === 'en' ? 'en-GB' : 'fr-FR', {
    timeZone: 'UTC',
  });
}
