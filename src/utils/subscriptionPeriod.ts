export type SubscriptionBillingPeriod = 'monthly' | 'yearly';

/**
 * Date du jour au format AAAA-MM-JJ, en UTC : c'est la référence de CURRENT_DATE dans la base
 * (Supabase tourne en UTC), donc celle qui décide réellement si un abonnement donne accès.
 */
export function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Vrai si la date de fin (colonne DATE, AAAA-MM-JJ) est strictement passée.
 * La date de fin est inclusive, comme `end_date >= CURRENT_DATE` côté SQL : un abonnement qui finit
 * aujourd'hui est encore valable. Comparer `new Date(end_date) < new Date()` le déclarait expiré dès
 * minuit UTC du dernier jour.
 */
export function isSubscriptionEndPassed(endDate?: string | null): boolean {
  if (!endDate) return false;
  return endDate.slice(0, 10) < todayDateString();
}

function parseDateString(date: string): Date {
  const [y, m, d] = date.slice(0, 10).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/**
 * Jours restants avant la fin d'un abonnement : 0 = finit aujourd'hui, négatif = expiré.
 * null si la date est inconnue. Même référence (UTC) que isSubscriptionEndPassed.
 */
export function daysUntilSubscriptionEnd(endDate?: string | null): number | null {
  if (!endDate) return null;
  const ms = parseDateString(endDate).getTime() - parseDateString(todayDateString()).getTime();
  return Math.round(ms / 86_400_000);
}

const DATE_OPTS: Intl.DateTimeFormatOptions = {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
};

const DATE_SHORT_OPTS: Intl.DateTimeFormatOptions = {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
};

export function getBillingPeriodLabel(billingPeriod?: SubscriptionBillingPeriod | null): string {
  if (billingPeriod === 'yearly') return 'Annuel';
  if (billingPeriod === 'monthly') return 'Mensuel';
  return 'Premium';
}

export function formatSubscriptionPeriodRange(
  startDate: string,
  endDate: string,
  options?: { short?: boolean }
): string {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const fmt = options?.short ? DATE_SHORT_OPTS : DATE_OPTS;
  return `Du ${start.toLocaleDateString('fr-FR', fmt)} au ${end.toLocaleDateString('fr-FR', fmt)}`;
}

export function formatSubscriptionPeriodSummary(
  startDate: string,
  endDate: string,
  billingPeriod?: SubscriptionBillingPeriod | null
): string {
  return `${getBillingPeriodLabel(billingPeriod)} — ${formatSubscriptionPeriodRange(startDate, endDate)}`;
}

export function getSubscriptionDurationLabel(billingPeriod?: SubscriptionBillingPeriod | null): string {
  return billingPeriod === 'yearly' ? '12 mois' : '1 mois';
}

function toDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addBillingPeriod(start: Date, billingPeriod: SubscriptionBillingPeriod): Date {
  const end = new Date(start);
  if (billingPeriod === 'yearly') {
    end.setFullYear(end.getFullYear() + 1);
  } else {
    end.setMonth(end.getMonth() + 1);
  }
  return end;
}

/** Calcule la période effective à l'activation (même logique que la RPC Supabase). */
export function computeSubscriptionActivationDates(params: {
  billingPeriod: SubscriptionBillingPeriod;
  plannedStartDate: string;
  activationDate?: Date;
  activePaidSubscriptionEndDate?: string | null;
}): { startDate: string; endDate: string } {
  const activation = params.activationDate ? new Date(params.activationDate) : new Date();
  activation.setHours(0, 0, 0, 0);

  const planned = new Date(params.plannedStartDate);
  planned.setHours(0, 0, 0, 0);

  const activeEnd = params.activePaidSubscriptionEndDate
    ? new Date(params.activePaidSubscriptionEndDate)
    : null;
  if (activeEnd) {
    activeEnd.setHours(0, 0, 0, 0);
  }

  let start: Date;
  if (activeEnd && planned >= activeEnd) {
    start = planned > activation ? planned : activation;
  } else {
    start = activation;
  }

  const end = addBillingPeriod(start, params.billingPeriod);
  return { startDate: toDateString(start), endDate: toDateString(end) };
}

export type SubscriptionExtensionUnit = 'days' | 'months' | 'years';

export function computeExtendedSubscriptionEndDate(
  currentEndDate: string,
  amount: number,
  unit: SubscriptionExtensionUnit,
  referenceDate?: Date
): string {
  const today = referenceDate ? new Date(referenceDate) : new Date();
  today.setHours(0, 0, 0, 0);

  const currentEnd = new Date(currentEndDate);
  currentEnd.setHours(0, 0, 0, 0);

  const base = currentEnd >= today ? currentEnd : today;
  const extended = new Date(base);

  if (unit === 'days') {
    extended.setDate(extended.getDate() + amount);
  } else if (unit === 'months') {
    extended.setMonth(extended.getMonth() + amount);
  } else {
    extended.setFullYear(extended.getFullYear() + amount);
  }

  return toDateString(extended);
}

export function getSubscriptionExtensionUnitLabel(unit: SubscriptionExtensionUnit, amount: number): string {
  const labels: Record<SubscriptionExtensionUnit, [string, string]> = {
    days: ['jour', 'jours'],
    months: ['mois', 'mois'],
    years: ['an', 'ans'],
  };
  const [singular, plural] = labels[unit];
  return `${amount} ${amount > 1 ? plural : singular}`;
}
