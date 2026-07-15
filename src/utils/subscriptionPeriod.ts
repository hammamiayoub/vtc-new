export type SubscriptionBillingPeriod = 'monthly' | 'yearly';

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
