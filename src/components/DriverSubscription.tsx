import React, { useCallback, useEffect, useState } from 'react';
import {
  CreditCard,
  Check,
  X,
  Calendar,
  TrendingUp,
  Lock,
  Info,
  Copy,
  MessageCircle,
  Paperclip,
  Loader2,
} from 'lucide-react';
import { Button } from './ui/Button';
import { Alert } from './ui/Alert';
import { supabase } from '../lib/supabase';
import { cn } from '../utils/cn';
import {
  daysUntilSubscriptionEnd,
  getBillingPeriodLabel,
  getSubscriptionDurationLabel,
  isSubscriptionEndPassed,
  type SubscriptionBillingPeriod,
} from '../utils/subscriptionPeriod';

/** Coordonnées bancaires affichées ET copiées : une seule source pour que les deux ne divergent jamais. */
const BANK_BENEFICIARY = 'TuniDrive SARL';
const BANK_IBAN = 'TN59 04 117 1850077170413 86';
const SUPPORT_WHATSAPP = '21628528477';

const FREE_RIDES_QUOTA = 2;
const RECEIPT_BUCKET = 'subscription-receipts';
const RECEIPT_MAX_BYTES = 5 * 1024 * 1024;
const RECEIPT_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
};

interface DriverSubscriptionProps {
  driverId: string;
}

interface SubscriptionStatus {
  hasActiveSubscription: boolean;
  canAcceptMoreBookings: boolean;
  remainingFreeBookings: number;
  lifetimeAcceptedBookings: number;
  subscriptionEndDate?: string;
}

type BillingPeriod = SubscriptionBillingPeriod;

interface PendingSubscriptionRequest {
  id: string;
  createdAt: string;
  startDate: string;
  billingPeriod: BillingPeriod;
  totalPriceTnd: number;
  /** Date à laquelle le chauffeur a déclaré son paiement (null tant qu'il ne l'a pas fait). */
  declaredAt: string | null;
  driverReference: string | null;
  hasProof: boolean;
}

interface PeriodPricing {
  price_tnd: number;
  vat_percentage: number;
  total_price_tnd: number;
}

interface Notice {
  tone: 'success' | 'warning' | 'danger' | 'info';
  text: string;
}

const FALLBACK_PRICING: Record<BillingPeriod, PeriodPricing> = {
  monthly: { price_tnd: 30, vat_percentage: 19, total_price_tnd: 35.7 },
  yearly: { price_tnd: 324, vat_percentage: 19, total_price_tnd: 385.56 },
};

function parsePricing(data: unknown): Record<BillingPeriod, PeriodPricing> | null {
  const read = (value: unknown): PeriodPricing | null => {
    const v = value as Record<string, unknown> | null;
    const price = Number(v?.price_tnd);
    const vat = Number(v?.vat_percentage);
    const total = Number(v?.total_price_tnd);
    return [price, vat, total].every((n) => Number.isFinite(n) && n > 0)
      ? { price_tnd: price, vat_percentage: vat, total_price_tnd: total }
      : null;
  };
  const root = data as Record<string, unknown>;
  const monthly = read(root?.monthly);
  const yearly = read(root?.yearly);
  return monthly && yearly ? { monthly, yearly } : null;
}

const tnd = (amount: number) => `${amount.toFixed(2).replace('.', ',')} TND`;

const LONG_DATE: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };

/** Date d'une colonne DATE (AAAA-MM-JJ), sans décalage de fuseau. */
function formatDateOnly(date: string): string {
  return new Date(`${date.slice(0, 10)}T00:00:00Z`).toLocaleDateString('fr-FR', { ...LONG_DATE, timeZone: 'UTC' });
}

function formatTimestamp(value: string): string {
  return new Date(value).toLocaleDateString('fr-FR', LONG_DATE);
}

/** Fin de l'accès provisoire : jour et heure, à l'heure de l'appareil. */
function formatGraceEnd(value: string): string {
  return new Date(value).toLocaleString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
}

function addDays(date: string, days: number): string {
  const d = new Date(`${date.slice(0, 10)}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

type StepState = 'done' | 'current' | 'upcoming';

function TrackingStep({
  number,
  state,
  title,
  isLast,
  children,
}: {
  number: number;
  state: StepState;
  title: string;
  isLast?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <li className="relative flex gap-4" aria-current={state === 'current' ? 'step' : undefined}>
      {!isLast && (
        <span
          aria-hidden="true"
          className={cn('absolute left-4 top-8 bottom-0 w-px -translate-x-1/2', state === 'done' ? 'bg-gray-900' : 'bg-gray-200')}
        />
      )}
      <span
        className={cn(
          'relative z-10 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-semibold',
          state === 'done' && 'bg-gray-900 text-white',
          state === 'current' && 'bg-white text-gray-900 ring-2 ring-gray-900',
          state === 'upcoming' && 'bg-white text-gray-400 ring-1 ring-gray-300',
        )}
      >
        {state === 'done' ? <Check size={16} aria-hidden="true" /> : number}
      </span>
      <div className={cn('min-w-0 flex-1', isLast ? 'pb-0' : 'pb-8')}>
        <h4 className={cn('pt-1 font-semibold', state === 'upcoming' ? 'text-gray-500' : 'text-gray-900')}>
          {title}
          {state === 'done' && <span className="sr-only"> (terminé)</span>}
        </h4>
        {children && <div className="mt-2 text-sm text-gray-700">{children}</div>}
      </div>
    </li>
  );
}

function CopyRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* presse-papiers indisponible : la valeur reste lisible à l'écran */
    }
  };
  return (
    <div>
      <dt className="text-xs font-medium text-gray-500">{label}</dt>
      <dd className="mt-1 flex items-center gap-2">
        <span className={cn('min-w-0 flex-1 break-all text-gray-900', mono && 'font-mono text-sm')}>{value}</span>
        <button
          type="button"
          onClick={copy}
          className="focus-ring inline-flex h-9 flex-shrink-0 items-center gap-1.5 rounded-full border border-gray-300 bg-white px-3 text-xs font-semibold text-gray-900 hover:bg-gray-50 transition-colors"
        >
          {copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
          {copied ? 'Copié' : 'Copier'}
        </button>
      </dd>
    </div>
  );
}

export const DriverSubscription: React.FC<DriverSubscriptionProps> = ({ driverId }) => {
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const [lastPaidEndDate, setLastPaidEndDate] = useState<string | null>(null);
  // Fin de l'accès provisoire accordé après une déclaration de paiement (null s'il n'y en a pas).
  const [graceUntil, setGraceUntil] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingRequest, setPendingRequest] = useState<PendingSubscriptionRequest | null>(null);
  // Faux tant que la migration « déclaration de paiement » n'est pas appliquée : on garde alors
  // l'ancien parcours (prévenir le support) au lieu d'un formulaire qui échouerait.
  const [declareSupported, setDeclareSupported] = useState(true);
  const [selectedBillingPeriod, setSelectedBillingPeriod] = useState<BillingPeriod>('monthly');
  const [notice, setNotice] = useState<Notice | null>(null);
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [cancellingRequest, setCancellingRequest] = useState(false);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [paymentReference, setPaymentReference] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [declaring, setDeclaring] = useState(false);
  const [editingDeclaration, setEditingDeclaration] = useState(false);

  // Tarif : la base est la seule source (fonction subscription_price_for) et c'est elle qui facture à la
  // création de la demande. L'écran l'affiche tel quel ; ces valeurs de secours ne servent qu'à
  // l'affichage si la lecture échoue, jamais à la facturation.
  const [pricing, setPricing] = useState<Record<BillingPeriod, PeriodPricing>>(FALLBACK_PRICING);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.rpc('get_subscription_pricing');
      if (cancelled || error || !data) return;
      const parsed = parsePricing(data);
      if (parsed) setPricing(parsed);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const checkPendingRequest = useCallback(async () => {
    const pendingQuery = (columns: string) =>
      supabase
        .from('driver_subscriptions')
        .select(columns)
        .eq('driver_id', driverId)
        .eq('payment_status', 'pending')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    const baseColumns = 'id, created_at, billing_period, start_date, total_price_tnd';
    try {
      let supported = true;
      let { data, error } = await pendingQuery(
        `${baseColumns}, payment_declared_at, driver_payment_reference, payment_proof_path`,
      );
      if (error) {
        // Colonnes de déclaration absentes : lecture sans elles.
        supported = false;
        ({ data, error } = await pendingQuery(baseColumns));
      }
      if (error) {
        console.error('Erreur vérification demande:', error);
        return;
      }
      setDeclareSupported(supported);

      const row = data as Record<string, unknown> | null;
      if (!row) {
        setPendingRequest(null);
        return;
      }
      const billingPeriod: BillingPeriod = row.billing_period === 'yearly' ? 'yearly' : 'monthly';
      setPendingRequest({
        id: String(row.id),
        createdAt: String(row.created_at),
        startDate: String(row.start_date),
        billingPeriod,
        totalPriceTnd: Number(row.total_price_tnd) || 0,
        declaredAt: typeof row.payment_declared_at === 'string' ? row.payment_declared_at : null,
        driverReference: typeof row.driver_payment_reference === 'string' ? row.driver_payment_reference : null,
        hasProof: typeof row.payment_proof_path === 'string' && row.payment_proof_path.length > 0,
      });
    } catch (error) {
      console.error('Erreur vérification demande:', error);
    }
  }, [driverId]);

  const fetchSubscriptionStatus = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('get_driver_subscription_status', { p_driver_id: driverId });
      if (error) {
        console.error('Erreur récupération statut abonnement:', error);
        return;
      }

      if (data && data.length > 0) {
        const status = data[0];
        setSubscriptionStatus({
          hasActiveSubscription: status.has_active_subscription,
          canAcceptMoreBookings: status.can_accept_more_bookings,
          remainingFreeBookings: status.remaining_free_bookings,
          lifetimeAcceptedBookings: status.lifetime_accepted_bookings || 0,
          subscriptionEndDate: status.subscription_end_date ?? undefined,
        });
      }

      // Dernier abonnement payé : sert à dire « expiré le … » quand il n'y en a plus d'actif.
      const { data: lastPaid } = await supabase
        .from('driver_subscriptions')
        .select('end_date')
        .eq('driver_id', driverId)
        .eq('payment_status', 'paid')
        .order('end_date', { ascending: false })
        .limit(1)
        .maybeSingle();
      setLastPaidEndDate(lastPaid?.end_date ?? null);

      // Accès provisoire : lecture tolérante (colonne absente tant que la migration n'est pas appliquée).
      const { data: grace, error: graceError } = await supabase
        .from('drivers')
        .select('payment_grace_until')
        .eq('id', driverId)
        .maybeSingle();
      const until = graceError ? null : (grace as { payment_grace_until?: string | null } | null)?.payment_grace_until;
      setGraceUntil(until && new Date(until).getTime() > Date.now() ? until : null);
    } catch (error) {
      console.error('Erreur:', error);
    }
  }, [driverId]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([fetchSubscriptionStatus(), checkPendingRequest()]).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [fetchSubscriptionStatus, checkPendingRequest]);

  const handleSubscriptionRequest = async () => {
    setSubmittingRequest(true);
    setNotice(null);
    try {
      // Le serveur fixe le prix et les dates, refuse une seconde demande en attente et, si un abonnement
      // payé est en cours, fait démarrer la nouvelle période à sa fin (aucun jour perdu).
      const { data, error } = await supabase.rpc('request_driver_subscription', {
        p_billing_period: selectedBillingPeriod,
      });

      if (error) {
        console.error('Erreur création demande abonnement:', error);
        setNotice({ tone: 'danger', text: "La demande n'a pas pu être créée. Veuillez réessayer." });
        return;
      }

      const result = data as { success: boolean; reason?: string } | null;

      if (!result?.success) {
        if (result?.reason === 'already_pending') {
          await checkPendingRequest();
          setNotice({ tone: 'info', text: 'Vous avez déjà une demande en cours : son suivi est affiché ci-dessous.' });
          return;
        }
        const messages: Record<string, string> = {
          not_authenticated: 'Votre session a expiré. Reconnectez-vous puis réessayez.',
          driver_not_found: 'Profil chauffeur introuvable. Contactez le support.',
          duplicate_period: 'Une demande existe déjà pour cette période. Rechargez la page.',
        };
        setNotice({
          tone: 'danger',
          text: messages[result?.reason ?? ''] ?? "La demande n'a pas pu être créée. Veuillez réessayer.",
        });
        return;
      }

      await checkPendingRequest();
      setNotice({ tone: 'success', text: 'Demande enregistrée. Il vous reste à effectuer le paiement (étape 2).' });
    } catch (error) {
      console.error('Erreur:', error);
      setNotice({ tone: 'danger', text: 'Une erreur est survenue. Veuillez réessayer.' });
    } finally {
      setSubmittingRequest(false);
    }
  };

  const handleCancelPendingRequest = async () => {
    if (!pendingRequest) return;
    setCancellingRequest(true);
    setNotice(null);
    try {
      const { data, error } = await supabase.rpc('cancel_pending_driver_subscription', {
        p_subscription_id: pendingRequest.id,
      });

      if (error) {
        console.error('Erreur annulation demande abonnement:', error);
        setNotice({ tone: 'danger', text: "Impossible d'annuler la demande. Réessayez ou contactez le support." });
        return;
      }

      const result = data as { success?: boolean; reason?: string } | null;
      if (!result?.success) {
        setNotice({
          tone: 'danger',
          text:
            result?.reason === 'not_cancellable'
              ? 'Cette demande ne peut plus être annulée (déjà traitée ou payée).'
              : "Impossible d'annuler la demande.",
        });
        await Promise.all([checkPendingRequest(), fetchSubscriptionStatus()]);
        return;
      }

      setPendingRequest(null);
      setPaymentReference('');
      setReceiptFile(null);
      setEditingDeclaration(false);
      setNotice({ tone: 'info', text: 'Demande annulée. Vous pouvez en créer une nouvelle quand vous le souhaitez.' });
    } catch (error) {
      console.error('Erreur:', error);
      setNotice({ tone: 'danger', text: 'Une erreur est survenue. Veuillez réessayer.' });
    } finally {
      setCancellingRequest(false);
      setConfirmingCancel(false);
    }
  };

  const handleReceiptChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setNotice(null);
    if (!file) {
      setReceiptFile(null);
      return;
    }
    if (!RECEIPT_TYPES[file.type]) {
      setNotice({ tone: 'danger', text: 'Format non accepté. Envoyez une photo (JPG, PNG, WebP) ou un PDF.' });
      e.target.value = '';
      setReceiptFile(null);
      return;
    }
    if (file.size > RECEIPT_MAX_BYTES) {
      setNotice({ tone: 'danger', text: 'Le reçu dépasse 5 Mo. Envoyez un fichier plus léger.' });
      e.target.value = '';
      setReceiptFile(null);
      return;
    }
    setReceiptFile(file);
  };

  const handleDeclarePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingRequest) return;

    const reference = paymentReference.trim();
    if (!reference && !receiptFile) {
      setNotice({ tone: 'danger', text: 'Indiquez la référence du paiement ou joignez le reçu.' });
      return;
    }

    setDeclaring(true);
    setNotice(null);
    try {
      let proofPath: string | null = null;
      if (receiptFile) {
        // Le dossier porte l'identifiant du chauffeur : c'est ce que vérifient les règles du bucket.
        proofPath = `${driverId}/${pendingRequest.id}-${Date.now()}.${RECEIPT_TYPES[receiptFile.type]}`;
        const { error: uploadError } = await supabase.storage
          .from(RECEIPT_BUCKET)
          .upload(proofPath, receiptFile, { contentType: receiptFile.type });
        if (uploadError) {
          console.error('Erreur envoi reçu:', uploadError);
          setNotice({
            tone: 'danger',
            text: reference
              ? "Le reçu n'a pas pu être envoyé. Réessayez, ou retirez le fichier pour déclarer avec la référence seule."
              : "Le reçu n'a pas pu être envoyé. Réessayez, ou indiquez la référence du paiement.",
          });
          return;
        }
      }

      const { data, error } = await supabase.rpc('declare_driver_subscription_payment', {
        p_subscription_id: pendingRequest.id,
        p_payment_reference: reference || null,
        p_proof_path: proofPath,
      });

      const result = data as { success?: boolean; reason?: string } | null;
      if (error || !result?.success) {
        console.error('Erreur déclaration paiement:', error ?? result);
        if (result?.reason === 'not_pending') {
          await Promise.all([checkPendingRequest(), fetchSubscriptionStatus()]);
          setNotice({ tone: 'info', text: 'Cette demande a déjà été traitée.' });
          return;
        }
        setNotice({
          tone: 'danger',
          text: "La déclaration n'a pas pu être enregistrée. Prévenez le support par WhatsApp avec votre référence.",
        });
        return;
      }

      setPaymentReference('');
      setReceiptFile(null);
      setEditingDeclaration(false);
      await Promise.all([checkPendingRequest(), fetchSubscriptionStatus()]);
      const graceGranted = (data as { grace_until?: string | null } | null)?.grace_until;
      setNotice({
        tone: 'success',
        text: graceGranted
          ? `Paiement déclaré. En attendant la vérification, vous pouvez accepter des courses jusqu'au ${formatGraceEnd(graceGranted)}.`
          : 'Paiement déclaré. Nous le vérifions et activons votre abonnement.',
      });
    } catch (error) {
      console.error('Erreur:', error);
      setNotice({ tone: 'danger', text: 'Une erreur est survenue. Veuillez réessayer.' });
    } finally {
      setDeclaring(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  if (!subscriptionStatus) {
    return (
      <Alert tone="danger">
        Impossible de charger votre abonnement. Rechargez la page ou contactez le support.
      </Alert>
    );
  }

  const isPremium = subscriptionStatus.hasActiveSubscription;
  const endDate = subscriptionStatus.subscriptionEndDate;
  const daysLeft = isPremium ? daysUntilSubscriptionEnd(endDate) : null;
  const expiredOn = !isPremium && lastPaidEndDate && isSubscriptionEndPassed(lastPaidEndDate) ? lastPaidEndDate : null;
  const usedFreeRides = Math.min(FREE_RIDES_QUOTA, subscriptionStatus.lifetimeAcceptedBookings);

  const transferMotif = `ABONNEMENT-${driverId.slice(0, 8).toUpperCase()}`;
  const monthlyTotal = pricing.monthly.total_price_tnd;
  const yearlyTotal = pricing.yearly.total_price_tnd;
  const selected = pricing[selectedBillingPeriod];
  const yearlySaving = monthlyTotal * 12 - yearlyTotal;

  const isDeclared = pendingRequest?.declaredAt != null;
  const activeGraceUntil =
    !isPremium && isDeclared && graceUntil && subscriptionStatus.canAcceptMoreBookings ? graceUntil : null;
  const showDeclareForm = pendingRequest !== null && declareSupported && (!isDeclared || editingDeclaration);
  // Renouvellement anticipé : la période demandée commence après l'abonnement en cours.
  const pendingStartsLater = pendingRequest !== null && isPremium && pendingRequest.startDate > new Date().toISOString().slice(0, 10);

  const whatsappHref = pendingRequest
    ? `https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(
        `Bonjour, j'ai payé mon abonnement Premium ${pendingRequest.billingPeriod === 'yearly' ? 'ANNUEL' : 'MENSUEL'} (${tnd(pendingRequest.totalPriceTnd)}).\n\nRéférence : ${transferMotif}`,
      )}`
    : '';

  const periodButtonClass = (active: boolean) =>
    cn(
      'focus-ring relative rounded-xl border-2 p-4 text-center transition-colors',
      active ? 'border-gray-900 bg-gray-50' : 'border-gray-200 bg-white hover:border-gray-300',
    );

  return (
    <div className="space-y-6">
      {notice && (
        <Alert tone={notice.tone} aria-live="polite">
          {notice.text}
        </Alert>
      )}

      {expiredOn && !pendingRequest && (
        <Alert tone="danger" title={`Votre abonnement Premium a expiré le ${formatDateOnly(expiredOn)}`}>
          Souscrivez de nouveau ci-dessous pour recommencer à accepter des courses.
        </Alert>
      )}

      {/* Statut */}
      <div className={cn('rounded-xl p-6', isPremium ? 'bg-gray-900 text-white' : 'bg-white border border-surface-border')}>
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0',
                isPremium ? 'bg-white/20' : 'bg-gray-100',
              )}
            >
              {isPremium ? (
                <TrendingUp size={24} className="text-white" aria-hidden="true" />
              ) : (
                <Lock size={24} className="text-gray-600" aria-hidden="true" />
              )}
            </div>
            <div>
              <h3 className={cn('text-xl font-semibold', isPremium ? 'text-white' : 'text-gray-900')}>
                {isPremium ? 'Abonnement Premium' : 'Compte gratuit'}
              </h3>
              <p className={cn('text-sm', isPremium ? 'text-white/90' : 'text-gray-600')}>
                {isPremium ? 'Courses illimitées' : `${FREE_RIDES_QUOTA} courses gratuites`}
              </p>
            </div>
          </div>
          {isPremium && (
            <span className="rounded-full bg-white/20 px-3 py-1 text-sm font-semibold text-white">Actif</span>
          )}
        </div>

        <div className={cn('rounded-lg p-4', isPremium ? 'bg-white/10' : 'bg-gray-50')}>
          {isPremium ? (
            <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
              <p className="text-sm text-white/90">
                <Calendar size={14} className="inline mr-1.5 -mt-0.5" aria-hidden="true" />
                {endDate ? `Valable jusqu'au ${formatDateOnly(endDate)}` : 'Sans date de fin'}
              </p>
              {daysLeft !== null && daysLeft >= 0 && (
                <p className="text-sm font-semibold text-white">
                  {daysLeft === 0 ? "Expire aujourd'hui" : daysLeft === 1 ? 'Expire demain' : `${daysLeft} jours restants`}
                </p>
              )}
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Courses gratuites utilisées</span>
                <span className="text-2xl font-semibold text-gray-900">
                  {usedFreeRides}
                  <span className="text-sm font-normal"> / {FREE_RIDES_QUOTA}</span>
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                <div
                  className="bg-gray-900 h-2 rounded-full transition-[width] duration-300"
                  style={{ width: `${(usedFreeRides / FREE_RIDES_QUOTA) * 100}%` }}
                />
              </div>
              <p className="text-xs text-gray-600">
                {subscriptionStatus.remainingFreeBookings > 0
                  ? `${subscriptionStatus.remainingFreeBookings} course${subscriptionStatus.remainingFreeBookings > 1 ? 's' : ''} gratuite${subscriptionStatus.remainingFreeBookings > 1 ? 's' : ''} restante${subscriptionStatus.remainingFreeBookings > 1 ? 's' : ''}`
                  : activeGraceUntil
                    ? `Quota gratuit épuisé. Accès provisoire jusqu'au ${formatGraceEnd(activeGraceUntil)}, le temps de vérifier votre paiement.`
                    : 'Quota gratuit épuisé : un abonnement est nécessaire pour accepter de nouvelles courses.'}
              </p>
            </>
          )}
        </div>
      </div>

      {/* Suivi de la demande en cours */}
      {pendingRequest && (
        <section className="bg-white border border-surface-border rounded-xl p-6" aria-labelledby="subscription-tracking-title">
          <h3 id="subscription-tracking-title" className="text-xl font-semibold text-gray-900 mb-1">
            {isPremium ? 'Suivi de votre renouvellement' : 'Suivi de votre demande'}
          </h3>
          <p className="text-sm text-gray-600 mb-6">
            {getBillingPeriodLabel(pendingRequest.billingPeriod)} ({getSubscriptionDurationLabel(pendingRequest.billingPeriod)}) ·{' '}
            <strong className="text-gray-900">{tnd(pendingRequest.totalPriceTnd)} TTC</strong>
          </p>

          <ol>
            <TrackingStep number={1} state="done" title="Demande enregistrée">
              <p>Le {formatTimestamp(pendingRequest.createdAt)}.</p>
            </TrackingStep>

            <TrackingStep number={2} state={isDeclared ? 'done' : 'current'} title={isDeclared ? 'Paiement déclaré' : 'Effectuez le paiement'}>
              {isDeclared && !editingDeclaration ? (
                <div className="space-y-2">
                  <p>
                    Le {formatTimestamp(pendingRequest.declaredAt as string)}
                    {pendingRequest.driverReference ? ` · référence ${pendingRequest.driverReference}` : ''}
                    {pendingRequest.hasProof ? ' · reçu envoyé' : ''}.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingDeclaration(true);
                      setPaymentReference(pendingRequest.driverReference ?? '');
                    }}
                    className="focus-ring rounded-md text-sm font-semibold text-gray-900 underline underline-offset-4 hover:text-ink-muted"
                  >
                    Corriger ou ajouter un reçu
                  </button>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <p className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <CreditCard size={18} aria-hidden="true" />
                      Virement bancaire
                    </p>
                    <dl className="space-y-3">
                      <div>
                        <dt className="text-xs font-medium text-gray-500">Bénéficiaire</dt>
                        <dd className="mt-1 text-gray-900">{BANK_BENEFICIARY}</dd>
                      </div>
                      <CopyRow label="Numéro de compte" value={BANK_IBAN} mono />
                      <div>
                        <dt className="text-xs font-medium text-gray-500">Montant</dt>
                        <dd className="mt-1 font-semibold text-gray-900">{tnd(pendingRequest.totalPriceTnd)}</dd>
                      </div>
                      <CopyRow label="Motif du virement" value={transferMotif} mono />
                    </dl>
                  </div>

                  {declareSupported ? (
                    showDeclareForm && (
                      <form onSubmit={handleDeclarePayment} className="space-y-4">
                        <p className="font-semibold text-gray-900">Une fois le paiement fait, déclarez-le ici</p>
                        <div>
                          <label htmlFor="subscription-payment-reference" className="block text-sm font-medium text-gray-700 mb-1">
                            Référence du paiement
                          </label>
                          <input
                            id="subscription-payment-reference"
                            type="text"
                            value={paymentReference}
                            onChange={(e) => setPaymentReference(e.target.value)}
                            maxLength={255}
                            placeholder="Numéro indiqué sur votre reçu"
                            className="block w-full rounded-control border border-gray-300 px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900"
                          />
                        </div>
                        <div>
                          <label htmlFor="subscription-payment-receipt" className="block text-sm font-medium text-gray-700 mb-1">
                            Reçu de paiement (photo ou PDF, 5 Mo max)
                          </label>
                          <input
                            id="subscription-payment-receipt"
                            type="file"
                            accept="image/jpeg,image/png,image/webp,application/pdf"
                            onChange={handleReceiptChange}
                            className="block w-full text-sm text-gray-700 file:mr-3 file:rounded-full file:border-0 file:bg-gray-900 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-gray-800"
                          />
                          {receiptFile && (
                            <p className="mt-2 flex items-center gap-1.5 text-xs text-gray-600">
                              <Paperclip size={12} aria-hidden="true" />
                              {receiptFile.name}
                            </p>
                          )}
                          <p className="mt-2 text-xs text-gray-500">La référence ou le reçu suffit ; les deux accélèrent la vérification.</p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3">
                          <Button type="submit" disabled={declaring} className="sm:flex-1">
                            {declaring ? (
                              <>
                                <Loader2 size={18} className="animate-spin mr-2" aria-hidden="true" />
                                Envoi en cours…
                              </>
                            ) : (
                              "J'ai payé"
                            )}
                          </Button>
                          {editingDeclaration && (
                            <Button
                              type="button"
                              variant="outline"
                              disabled={declaring}
                              onClick={() => {
                                setEditingDeclaration(false);
                                setReceiptFile(null);
                              }}
                            >
                              Annuler la correction
                            </Button>
                          )}
                        </div>
                      </form>
                    )
                  ) : (
                    <div className="space-y-3">
                      <p>Une fois le paiement fait, prévenez le support avec votre référence de paiement :</p>
                      <a
                        href={whatsappHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="focus-ring inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-success-600 px-5 text-sm font-semibold text-white hover:bg-success-700 transition-colors"
                      >
                        <MessageCircle size={16} aria-hidden="true" />
                        Prévenir par WhatsApp
                      </a>
                    </div>
                  )}
                </div>
              )}
            </TrackingStep>

            <TrackingStep number={3} state={isDeclared ? 'current' : 'upcoming'} title="Activation par TuniDrive" isLast>
              {isDeclared ? (
                <div className="space-y-3">
                  {activeGraceUntil && (
                    <Alert tone="success" title="Vous pouvez déjà accepter des courses">
                      Accès provisoire jusqu'au {formatGraceEnd(activeGraceUntil)}, sans attendre la validation.
                    </Alert>
                  )}
                  <p>
                    Vérification en cours : l'activation se fait sous 24 h ouvrables et vous recevrez un email de
                    confirmation.
                  </p>
                  <a
                    href={whatsappHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="focus-ring inline-flex items-center gap-1.5 rounded-md text-sm font-semibold text-gray-900 underline underline-offset-4 hover:text-ink-muted"
                  >
                    <MessageCircle size={14} aria-hidden="true" />
                    Une question ? Écrire au support
                  </a>
                </div>
              ) : (
                <p className="text-gray-500">
                  {pendingStartsLater
                    ? `Après vérification du paiement. La nouvelle période commencera le ${formatDateOnly(pendingRequest.startDate)}, à la fin de votre abonnement actuel.`
                    : `Après vérification du paiement, sous 24 h ouvrables. Vos ${getSubscriptionDurationLabel(pendingRequest.billingPeriod)} commencent le jour de l'activation.`}
                </p>
              )}
            </TrackingStep>
          </ol>

          <div className="mt-6 border-t border-gray-200 pt-4">
            {confirmingCancel ? (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <p className="text-sm text-gray-700 sm:flex-1">
                  {isDeclared
                    ? 'Vous avez déclaré un paiement pour cette demande. Annuler quand même ?'
                    : 'Annuler cette demande ? Vous pourrez en créer une nouvelle ensuite.'}
                </p>
                <div className="flex gap-3">
                  <Button size="sm" variant="danger" disabled={cancellingRequest} onClick={handleCancelPendingRequest}>
                    {cancellingRequest ? 'Annulation…' : "Oui, annuler"}
                  </Button>
                  <Button size="sm" variant="outline" disabled={cancellingRequest} onClick={() => setConfirmingCancel(false)}>
                    Garder ma demande
                  </Button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmingCancel(true)}
                className="focus-ring inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-danger-700 hover:underline underline-offset-4"
              >
                <X size={14} aria-hidden="true" />
                Annuler ma demande
              </button>
            )}
          </div>
        </section>
      )}

      {/* Souscription ou renouvellement (masqué tant qu'une demande est en cours) */}
      {!pendingRequest && (
        <section className="bg-white border border-surface-border rounded-xl p-6" aria-labelledby="subscription-offer-title">
          <h3 id="subscription-offer-title" className="text-2xl font-semibold text-gray-900 mb-2">
            {isPremium ? 'Renouveler mon abonnement' : 'Passez au Premium'}
          </h3>
          <p className="text-gray-700 mb-6">
            {isPremium
              ? endDate
                ? `La nouvelle période commencera le ${formatDateOnly(addDays(endDate, 1))}, à la fin de votre abonnement actuel : vous ne perdez aucun jour.`
                : 'Ajoutez une période à votre abonnement.'
              : 'Débloquez un accès illimité aux courses et maximisez vos revenus.'}
          </p>

          <fieldset className="mb-6">
            <legend className="block text-sm font-semibold text-gray-900 mb-3">Choisissez votre période</legend>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                aria-pressed={selectedBillingPeriod === 'monthly'}
                onClick={() => setSelectedBillingPeriod('monthly')}
                className={periodButtonClass(selectedBillingPeriod === 'monthly')}
              >
                <p className="font-semibold text-gray-900 mb-1">Mensuel</p>
                <p className="text-xl sm:text-2xl font-semibold text-gray-900">{tnd(monthlyTotal)}</p>
                <p className="text-xs text-gray-500 mt-1">par mois</p>
              </button>
              <button
                type="button"
                aria-pressed={selectedBillingPeriod === 'yearly'}
                onClick={() => setSelectedBillingPeriod('yearly')}
                className={periodButtonClass(selectedBillingPeriod === 'yearly')}
              >
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-success-600 px-2 py-0.5 text-xs font-semibold text-white">
                  -10 %
                </span>
                <p className="font-semibold text-gray-900 mb-1">Annuel</p>
                <p className="text-xl sm:text-2xl font-semibold text-gray-900">{tnd(yearlyTotal)}</p>
                <p className="text-xs text-gray-500 mt-1">soit {tnd(yearlyTotal / 12)}/mois</p>
              </button>
            </div>
            {selectedBillingPeriod === 'yearly' && yearlySaving > 0 && (
              <p className="text-xs text-success-700 mt-2 text-center font-medium">
                Vous économisez {tnd(yearlySaving)} par an.
              </p>
            )}
          </fieldset>

          {!isPremium && (
            <ul className="space-y-3 mb-6">
              {[
                { title: 'Courses illimitées', text: 'Acceptez autant de courses que vous le souhaitez' },
                { title: 'Priorité sur les réservations', text: 'Recevez les nouvelles demandes en priorité' },
                { title: 'Support prioritaire', text: 'Assistance rapide en cas de besoin' },
              ].map(({ title, text }) => (
                <li key={title} className="flex items-start gap-3">
                  <Check size={20} className="text-success-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <div>
                    <p className="font-semibold text-gray-900">{title}</p>
                    <p className="text-sm text-gray-600">{text}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <dl className="rounded-lg bg-gray-50 p-4 mb-6 text-sm">
            <div className="flex items-baseline justify-between mb-2">
              <dt className="text-gray-600">Prix HT</dt>
              <dd className="text-gray-900 font-medium">{tnd(selected.price_tnd)}</dd>
            </div>
            <div className="flex items-baseline justify-between mb-3">
              <dt className="text-gray-600">TVA ({selected.vat_percentage} %)</dt>
              <dd className="text-gray-900 font-medium">{tnd(selected.total_price_tnd - selected.price_tnd)}</dd>
            </div>
            <div className="flex items-baseline justify-between border-t border-gray-200 pt-3">
              <dt className="text-gray-900 font-semibold">Total TTC</dt>
              <dd className="text-2xl font-semibold text-gray-900">{tnd(selected.total_price_tnd)}</dd>
            </div>
          </dl>

          <Button size="lg" fullWidth onClick={handleSubscriptionRequest} disabled={submittingRequest}>
            {submittingRequest ? (
              <>
                <Loader2 size={20} className="animate-spin mr-2" aria-hidden="true" />
                Création en cours…
              </>
            ) : (
              `${isPremium ? 'Renouveler' : 'Souscrire'} · ${tnd(selected.total_price_tnd)}`
            )}
          </Button>
          <p className="mt-3 text-center text-xs text-gray-500">
            Paiement par virement bancaire. Les coordonnées s'affichent à l'étape suivante.
          </p>
        </section>
      )}

      {/* Rappel des règles */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
        <ul className="space-y-2 text-sm text-gray-600">
          <li className="flex items-start gap-2">
            <Info size={16} className="flex-shrink-0 mt-0.5" aria-hidden="true" />
            <span>
              <strong>Essai gratuit :</strong> {FREE_RIDES_QUOTA} courses gratuites pour tout nouveau chauffeur, une seule fois.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <Info size={16} className="flex-shrink-0 mt-0.5" aria-hidden="true" />
            <span>
              <strong>Durée :</strong> 1 mois ou 1 an à partir de l'activation. Pas de renouvellement automatique : vous
              pouvez renouveler à tout moment sans perdre de jours.
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
};
