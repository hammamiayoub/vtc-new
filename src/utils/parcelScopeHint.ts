import type { ParcelServiceScope } from '../types';

/**
 * Mémorise le type de colis choisi sur une page publique (local ou international) pour
 * présélectionner le bon formulaire après la connexion ou l'inscription du client.
 *
 * localStorage et non sessionStorage : le lien de confirmation d'email s'ouvre dans un
 * nouvel onglet, où un sessionStorage serait vide (même raison que pendingQuote.ts).
 */
const KEY = 'td_parcel_scope_hint';
const TTL_MS = 2 * 60 * 60 * 1000;

export function setParcelScopeHint(scope: ParcelServiceScope): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ scope, at: Date.now() }));
  } catch {
    /* stockage indisponible */
  }
}

/** Lit l'indication sans la supprimer (le formulaire peut être monté deux fois en dev). */
export function peekParcelScopeHint(): ParcelServiceScope | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { scope?: unknown; at?: unknown };
    const fresh = typeof parsed.at === 'number' && Date.now() - parsed.at < TTL_MS;
    if (fresh && (parsed.scope === 'local' || parsed.scope === 'international')) {
      return parsed.scope;
    }
    localStorage.removeItem(KEY);
    return null;
  } catch {
    return null;
  }
}

export function clearParcelScopeHint(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* stockage indisponible */
  }
}
