export type CommissionStatus = 'due' | 'declared' | 'paid' | 'overdue' | 'waived';

export interface CommissionStatement {
  id: string;
  driver_id: string;
  period_start: string;
  period_end: string;
  invoice_number: string;
  rides_count: number;
  free_rides_excluded: number;
  gross_amount_tnd: number;
  rate: number;
  commission_ht_tnd: number;
  vat_percentage: number;
  vat_amount_tnd: number;
  stamp_tnd: number;
  total_ttc_tnd: number;
  adjustment_tnd: number;
  status: CommissionStatus;
  due_at: string;
  payment_reference: string | null;
  payment_proof_path: string | null;
  payment_declared_at: string | null;
  paid_at: string | null;
  admin_notes: string | null;
  created_at: string;
}

/** Coordonnées bancaires de TuniDrive (identiques à celles de l'espace abonnement). */
export const COMMISSION_BANK_BENEFICIARY = 'TuniDrive SARL';
export const COMMISSION_BANK_IBAN = 'TN59 04 117 1850077170413 86';
export const COMMISSION_RECEIPT_BUCKET = 'subscription-receipts';
export const COMMISSION_RECEIPT_MAX_BYTES = 5 * 1024 * 1024;
export const COMMISSION_RECEIPT_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
};

export const STATUS_LABELS: Record<CommissionStatus, string> = {
  due: 'À payer',
  declared: 'Paiement déclaré',
  paid: 'Payé',
  overdue: 'En retard',
  waived: 'Annulé',
};

export const STATUS_STYLES: Record<CommissionStatus, string> = {
  due: 'bg-warning-50 text-warning-700 border-warning-200',
  declared: 'bg-info-50 text-info-700 border-info-200',
  paid: 'bg-success-50 text-success-700 border-success-200',
  overdue: 'bg-danger-50 text-danger-700 border-danger-200',
  waived: 'bg-gray-100 text-gray-600 border-gray-200',
};

export const formatTnd = (value: number | string | null | undefined): string =>
  `${Number(value ?? 0).toFixed(3)} TND`;

/** Total réellement à virer : TTC + ajustement éventuel de l'administrateur. */
export const statementTotal = (s: Pick<CommissionStatement, 'total_ttc_tnd' | 'adjustment_tnd'>): number =>
  Number(s.total_ttc_tnd) + Number(s.adjustment_tnd ?? 0);

export const formatMonth = (periodStart: string): string =>
  new Date(`${periodStart.slice(0, 7)}-01T12:00:00Z`).toLocaleDateString('fr-FR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });

export const formatDueDate = (iso: string): string =>
  new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Tunis' });
