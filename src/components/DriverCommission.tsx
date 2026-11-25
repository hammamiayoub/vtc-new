import React, { useCallback, useEffect, useState } from 'react';
import { Copy, FileText, Receipt, Upload } from 'lucide-react';
import { Button } from './ui/Button';
import { Alert } from './ui/Alert';
import { supabase } from '../lib/supabase';
import {
  COMMISSION_BANK_BENEFICIARY,
  COMMISSION_BANK_IBAN,
  COMMISSION_RECEIPT_BUCKET,
  COMMISSION_RECEIPT_MAX_BYTES,
  COMMISSION_RECEIPT_TYPES,
  STATUS_LABELS,
  STATUS_STYLES,
  formatDueDate,
  formatMonth,
  formatTnd,
  statementTotal,
  type CommissionStatement,
} from '../utils/commission';

interface Props {
  driverId: string;
}

const Row: React.FC<{ label: string; value: string; strong?: boolean }> = ({ label, value, strong }) => (
  <div className="flex items-baseline justify-between gap-4 py-1 text-sm">
    <span className="text-gray-500">{label}</span>
    <span className={strong ? 'font-semibold text-gray-900' : 'text-gray-900'}>{value}</span>
  </div>
);

export const DriverCommission: React.FC<Props> = ({ driverId }) => {
  const [statements, setStatements] = useState<CommissionStatement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: 'success' | 'danger' | 'info'; text: string } | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [reference, setReference] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    const { data, error: fetchError } = await supabase
      .from('driver_commission_statements')
      .select('*')
      .eq('driver_id', driverId)
      .order('period_start', { ascending: false });
    if (fetchError) {
      console.error('Erreur chargement relevés:', fetchError);
      setError('Impossible de charger vos relevés. Réessayez plus tard.');
    } else {
      setError(null);
      setStatements((data ?? []) as CommissionStatement[]);
    }
    setLoading(false);
  }, [driverId]);

  useEffect(() => {
    void load();
  }, [load]);

  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setNotice({ tone: 'info', text: 'Copié dans le presse-papiers.' });
    } catch {
      setNotice({ tone: 'danger', text: 'Copie impossible : sélectionnez le texte manuellement.' });
    }
  };

  const pickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    if (f && !COMMISSION_RECEIPT_TYPES[f.type]) {
      setNotice({ tone: 'danger', text: 'Format non pris en charge. Envoyez une image (JPG, PNG, WebP) ou un PDF.' });
      e.target.value = '';
      return;
    }
    if (f && f.size > COMMISSION_RECEIPT_MAX_BYTES) {
      setNotice({ tone: 'danger', text: 'Le reçu dépasse 5 Mo. Envoyez un fichier plus léger.' });
      e.target.value = '';
      return;
    }
    setFile(f);
  };

  const declare = async (statement: CommissionStatement) => {
    if (!reference.trim() && !file) {
      setNotice({ tone: 'danger', text: 'Indiquez la référence du virement ou joignez le reçu.' });
      return;
    }
    setSubmitting(true);
    setNotice(null);
    try {
      let proofPath: string | null = null;
      if (file) {
        // Le dossier porte l'identifiant du chauffeur : c'est ce que vérifient les règles du bucket.
        proofPath = `${driverId}/commission-${statement.id}-${Date.now()}.${COMMISSION_RECEIPT_TYPES[file.type]}`;
        const { error: uploadError } = await supabase.storage
          .from(COMMISSION_RECEIPT_BUCKET)
          .upload(proofPath, file, { contentType: file.type });
        if (uploadError) {
          console.error('Erreur envoi reçu:', uploadError);
          setNotice({ tone: 'danger', text: "Le reçu n'a pas pu être envoyé. Réessayez, ou déclarez avec la référence seule." });
          return;
        }
      }
      const { error: rpcError } = await supabase.rpc('declare_commission_payment', {
        p_statement_id: statement.id,
        p_reference: reference.trim() || null,
        p_proof_path: proofPath,
      });
      if (rpcError) {
        console.error('Erreur déclaration paiement:', rpcError);
        setNotice({ tone: 'danger', text: "La déclaration n'a pas pu être enregistrée. Contactez le support avec votre référence." });
        return;
      }
      setNotice({ tone: 'success', text: 'Paiement déclaré. Vous restez actif en attendant la validation par notre équipe.' });
      setOpenId(null);
      setReference('');
      setFile(null);
      await load();
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="py-8 text-center text-sm text-gray-500">Chargement de vos relevés…</div>;
  }

  return (
    <section className="mb-8 space-y-4" aria-labelledby="commission-title">
      <div>
        <h3 id="commission-title" className="text-xl font-semibold text-gray-900">Ma commission</h3>
        <p className="text-sm text-gray-600">
          Chaque début de mois, TuniDrive calcule 10 % du montant de vos courses terminées le mois précédent (vos 2
          premières courses sont offertes). Aucune course, aucun paiement.
        </p>
      </div>

      {error && <Alert tone="danger">{error}</Alert>}
      {notice && <Alert tone={notice.tone}>{notice.text}</Alert>}

      {statements.length === 0 && !error && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-600">
          <Receipt className="mb-2 h-5 w-5 text-gray-400" aria-hidden="true" />
          Aucun relevé pour le moment. Votre premier relevé sera émis le 1er du mois suivant votre première course
          facturable.
        </div>
      )}

      {statements.map((s) => {
        const payable = s.status === 'due' || s.status === 'overdue';
        const expanded = openId === s.id;
        return (
          <article key={s.id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h4 className="font-semibold capitalize text-gray-900">{formatMonth(s.period_start)}</h4>
                <p className="text-xs text-gray-500">{s.invoice_number}</p>
              </div>
              <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[s.status]}`}>
                {STATUS_LABELS[s.status]}
              </span>
            </header>

            <div className="divide-y divide-gray-100">
              <Row label="Courses facturables" value={String(s.rides_count)} />
              {s.free_rides_excluded > 0 && <Row label="Courses offertes" value={String(s.free_rides_excluded)} />}
              <Row label="Montant des courses" value={formatTnd(s.gross_amount_tnd)} />
              <Row label={`Commission HT (${Math.round(Number(s.rate) * 100)} %)`} value={formatTnd(s.commission_ht_tnd)} />
              <Row label={`TVA (${Number(s.vat_percentage)} %)`} value={formatTnd(s.vat_amount_tnd)} />
              {Number(s.stamp_tnd) > 0 && <Row label="Droit de timbre" value={formatTnd(s.stamp_tnd)} />}
              {Number(s.adjustment_tnd) !== 0 && <Row label="Ajustement" value={formatTnd(s.adjustment_tnd)} />}
              <Row label="Total à virer (TTC)" value={formatTnd(statementTotal(s))} strong />
            </div>

            {s.status === 'paid' && s.paid_at && (
              <p className="mt-3 text-sm text-success-700">
                Paiement validé le {new Date(s.paid_at).toLocaleDateString('fr-FR', { timeZone: 'Africa/Tunis' })}.
              </p>
            )}
            {s.status === 'declared' && (
              <p className="mt-3 text-sm text-info-700">
                Paiement déclaré{s.payment_reference ? ` (référence : ${s.payment_reference})` : ''}. En attente de validation.
              </p>
            )}
            {s.admin_notes && <p className="mt-2 text-xs text-gray-500">Note : {s.admin_notes}</p>}

            {payable && (
              <div className="mt-4 space-y-3">
                <Alert tone={s.status === 'overdue' ? 'danger' : 'warning'}>
                  {s.status === 'overdue'
                    ? "L'échéance est dépassée. Réglez votre relevé et déclarez votre paiement."
                    : `À régler avant le ${formatDueDate(s.due_at)}. Vous restez actif jusqu'à cette date, et tant que votre paiement déclaré n'est pas refusé.`}
                </Alert>

                <div className="rounded-lg bg-gray-50 p-4 text-sm">
                  <p className="mb-2 font-medium text-gray-900">Virement bancaire</p>
                  <Row label="Bénéficiaire" value={COMMISSION_BANK_BENEFICIARY} />
                  <div className="flex items-baseline justify-between gap-4 py-1 text-sm">
                    <span className="text-gray-500">IBAN</span>
                    <button type="button" onClick={() => copy(COMMISSION_BANK_IBAN)} className="inline-flex items-center gap-1.5 font-mono text-gray-900 hover:underline">
                      {COMMISSION_BANK_IBAN} <Copy size={14} aria-hidden="true" />
                      <span className="sr-only">Copier l'IBAN</span>
                    </button>
                  </div>
                  <div className="flex items-baseline justify-between gap-4 py-1 text-sm">
                    <span className="text-gray-500">Référence à indiquer</span>
                    <button type="button" onClick={() => copy(s.invoice_number)} className="inline-flex items-center gap-1.5 font-mono text-gray-900 hover:underline">
                      {s.invoice_number} <Copy size={14} aria-hidden="true" />
                      <span className="sr-only">Copier la référence</span>
                    </button>
                  </div>
                </div>

                {!expanded ? (
                  <Button onClick={() => { setOpenId(s.id); setReference(''); setFile(null); setNotice(null); }}>
                    J'ai effectué le virement
                  </Button>
                ) : (
                  <form
                    className="space-y-3 rounded-lg border border-gray-200 p-4"
                    onSubmit={(e) => { e.preventDefault(); void declare(s); }}
                  >
                    <label className="block text-sm">
                      <span className="mb-1 block font-medium text-gray-900">Référence du virement</span>
                      <input
                        value={reference}
                        onChange={(e) => setReference(e.target.value)}
                        maxLength={120}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-gray-900 focus:outline-none"
                        placeholder="N° d'opération indiqué par votre banque"
                      />
                    </label>
                    <label className="block text-sm">
                      <span className="mb-1 flex items-center gap-1.5 font-medium text-gray-900">
                        <Upload size={14} aria-hidden="true" /> Reçu du virement (facultatif, 5 Mo max)
                      </span>
                      <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={pickFile} className="text-sm" />
                    </label>
                    <div className="flex gap-2">
                      <Button type="submit" loading={submitting}>Déclarer mon paiement</Button>
                      <Button type="button" variant="outline" onClick={() => setOpenId(null)}>Annuler</Button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </article>
        );
      })}

      {statements.length > 0 && (
        <p className="flex items-center gap-1.5 text-xs text-gray-500">
          <FileText size={14} aria-hidden="true" /> Une question sur un relevé ? support@tunidrive.net
        </p>
      )}
    </section>
  );
};
