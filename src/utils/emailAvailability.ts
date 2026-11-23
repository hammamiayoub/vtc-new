import { supabase } from '../lib/supabase';

export type EmailUsedBy = 'auth' | 'client' | 'driver';

/**
 * Vérifie côté serveur (fonction is_email_available) si une adresse e-mail est libre.
 * Remplace les lectures directes des tables clients / drivers, qui ne sont plus accessibles sans connexion.
 * En cas d'erreur réseau, l'inscription n'est pas bloquée : les contrôles d'unicité de la base restent actifs.
 */
export async function checkEmailAvailable(
  email: string,
): Promise<{ available: boolean; usedBy?: EmailUsedBy }> {
  const { data, error } = await supabase.rpc('is_email_available', {
    p_email: email.trim().toLowerCase(),
    p_exclude_user_id: null,
  });
  if (error) {
    console.warn('is_email_available a échoué:', error.message);
    return { available: true };
  }
  const result = (data ?? {}) as { available?: boolean; used_by?: EmailUsedBy };
  return result.available === false
    ? { available: false, usedBy: result.used_by }
    : { available: true };
}
