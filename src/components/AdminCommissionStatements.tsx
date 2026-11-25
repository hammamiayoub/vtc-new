import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  COMMISSION_RECEIPT_BUCKET,
  STATUS_LABELS,
  STATUS_STYLES,
  formatDueDate,
  formatMonth,
  formatTnd,
  statementTotal,
  type CommissionStatement,
  type CommissionStatus,
} from '../utils/commission';

type Row = CommissionStatement & {
  drivers: { first_name: string | null; last_name: string | null; email: string | null } | null;
};

const FILTERS: { id: 'attention' | 'all' | CommissionStatus; label: string }[] = [
  { id: 'attention', label: 'À traiter' },
  { id: 'overdue', label: 'En retard' },
  { id: 'paid', label: 'Payés' },
  { id: 'all', label: 'Tous' },
];

export const AdminCommissionStatements: React.FC = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['id']>('attention');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error: fetchError } = await supabase
      .from('driver_commission_statements')
      .select('*, drivers(first_name, last_name, email)')
      .order('period_start', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(500);
    if (fetchError) {
      console.error('Erreur chargement relevés de commission:', fetchError);
      setError('Impossible de charger les relevés de commission.');
    } else {
      setError(null);
      setRows((data ?? []) as Row[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(() => {
    if (filter === 'all') return rows;
    if (filter === 'attention') return rows.filter((r) => ['declared', 'overdue', 'due'].includes(r.status));
    return rows.filter((r) => r.status === filter);
  }, [rows, filter]);

  const pendingValidation = rows.filter((r) => r.status === 'declared').length;

  const review = async (row: Row, decision: 'paid' | 'reject' | 'waive') => {
    const confirmText = {
      paid: `Valider le paiement de ${formatTnd(statementTotal(row))} reçu de ce chauffeur ?`,
      reject: 'Rejeter la déclaration de paiement (le relevé repasse à payer) ?',
      waive: 'Annuler ce relevé (aucun paiement dû) ?',
    }[decision];
    if (!window.confirm(confirmText)) return;
    const notes = decision === 'paid' ? null : window.prompt('Note pour le chauffeur / le suivi (facultatif) :') ?? null;

    setBusyId(row.id);
    const { error: rpcError } = await supabase.rpc('admin_review_commission_payment', {
      p_statement_id: row.id,
      p_decision: decision,
      p_notes: notes,
    });
    setBusyId(null);
    if (rpcError) {
      console.error('Erreur validation relevé:', rpcError);
      window.alert("L'opération a échoué. Réessayez.");
      return;
    }
    await load();
  };

  const openReceipt = async (path: string) => {
    const { data, error: urlError } = await supabase.storage.from(COMMISSION_RECEIPT_BUCKET).createSignedUrl(path, 300);
    if (urlError || !data?.signedUrl) {
      window.alert("Impossible d'ouvrir le reçu. Réessayez.");
      return;
    }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <section className="mb-6 rounded-xl bg-white shadow-sm" aria-labelledby="admin-commission-title">
      <div className="space-y-3 border-b border-gray-200 px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 id="admin-commission-title" className="text-lg font-semibold text-gray-900 sm:text-xl">
              Relevés de commission
            </h2>
            <p className="text-xs text-gray-600 sm:text-sm">
              Commission mensuelle des chauffeurs : validez les virements reçus.
              {pendingValidation > 0 && <strong className="ml-1 text-info-700">{pendingValidation} à valider</strong>}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`rounded-full border px-3 py-1 text-xs font-medium ${
                filter === f.id ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="mx-4 mt-4 rounded-lg border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700 sm:mx-6">{error}</div>}

      {loading ? (
        <p className="px-6 py-6 text-sm text-gray-500">Chargement…</p>
      ) : visible.length === 0 ? (
        <p className="px-6 py-6 text-sm text-gray-500">Aucun relevé dans cette vue.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full table-auto text-sm">
            <thead className="bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-4 py-3">Chauffeur</th>
                <th className="px-4 py-3">Relevé</th>
                <th className="px-4 py-3">Courses</th>
                <th className="px-4 py-3">Total TTC</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {visible.map((r) => {
                const name = `${r.drivers?.first_name ?? ''} ${r.drivers?.last_name ?? ''}`.trim() || 'Chauffeur';
                const open = r.status !== 'paid' && r.status !== 'waived';
                return (
                  <tr key={r.id} className="align-top">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{name}</p>
                      <p className="text-xs text-gray-500">{r.drivers?.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="capitalize text-gray-900">{formatMonth(r.period_start)}</p>
                      <p className="text-xs text-gray-500">{r.invoice_number}</p>
                      {open && <p className="text-xs text-gray-500">Échéance : {formatDueDate(r.due_at)}</p>}
                    </td>
                    <td className="px-4 py-3 text-gray-900">
                      {r.rides_count}
                      <p className="text-xs text-gray-500">{formatTnd(r.gross_amount_tnd)}</p>
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-900">{formatTnd(statementTotal(r))}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[r.status]}`}>
                        {STATUS_LABELS[r.status]}
                      </span>
                      {r.payment_reference && <p className="mt-1 text-xs text-gray-500">Réf. : {r.payment_reference}</p>}
                      {r.admin_notes && <p className="mt-1 text-xs text-gray-500">Note : {r.admin_notes}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {r.payment_proof_path && (
                          <button type="button" onClick={() => void openReceipt(r.payment_proof_path!)} className="rounded-md border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50">
                            Voir le reçu
                          </button>
                        )}
                        {open && (
                          <button
                            type="button"
                            disabled={busyId === r.id}
                            onClick={() => void review(r, 'paid')}
                            className="rounded-md border border-success-200 bg-success-50 px-2 py-1 text-xs font-medium text-success-700 hover:bg-success-100 disabled:opacity-50"
                          >
                            Valider le paiement
                          </button>
                        )}
                        {r.status === 'declared' && (
                          <button
                            type="button"
                            disabled={busyId === r.id}
                            onClick={() => void review(r, 'reject')}
                            className="rounded-md border border-warning-200 bg-warning-50 px-2 py-1 text-xs font-medium text-warning-700 hover:bg-warning-100 disabled:opacity-50"
                          >
                            Rejeter
                          </button>
                        )}
                        {open && (
                          <button
                            type="button"
                            disabled={busyId === r.id}
                            onClick={() => void review(r, 'waive')}
                            className="rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                          >
                            Annuler le relevé
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};
