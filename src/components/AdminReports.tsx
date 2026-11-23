import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Flag, Image as ImageIcon, ShieldOff, ShieldCheck, Check, X, User } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { authBearer } from '../utils/edgeAuth';
import { SkeletonList } from './ui/Skeleton';

type ReportStatus = 'open' | 'reviewed' | 'dismissed' | 'action_taken';
type Role = 'client' | 'driver';
type Action = 'dismiss' | 'reviewed' | 'remove_photo' | 'suspend' | 'unsuspend';

interface ReportRow {
  id: string;
  reporter_id: string;
  reporter_role: Role;
  reported_id: string;
  reported_role: Role;
  booking_id: string | null;
  parcel_request_id: string | null;
  reason: string;
  comment: string | null;
  status: ReportStatus;
  admin_note: string | null;
  handled_at: string | null;
  created_at: string;
}

interface Person {
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  profile_photo_url: string | null;
  status: string | null;
}

const REASON_LABELS: Record<string, string> = {
  inappropriate_photo: 'Photo inappropriée',
  abusive_behavior: 'Comportement abusif',
  fake_identity: 'Fausse identité',
  vehicle_issue: 'Véhicule non conforme',
  other: 'Autre',
};

const STATUS_LABELS: Record<ReportStatus, { label: string; className: string }> = {
  open: { label: 'À traiter', className: 'bg-warning-100 text-warning-700' },
  reviewed: { label: 'Examiné', className: 'bg-gray-100 text-gray-700' },
  dismissed: { label: 'Sans suite', className: 'bg-gray-100 text-gray-600' },
  action_taken: { label: 'Mesure prise', className: 'bg-success-100 text-success-700' },
};

const ROLE_LABELS: Record<Role, string> = { client: 'Client', driver: 'Chauffeur / transporteur' };

interface AdminReportsProps {
  onOpenCountChange?: (count: number) => void;
}

export const AdminReports: React.FC<AdminReportsProps> = ({ onOpenCountChange }) => {
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [people, setPeople] = useState<Record<string, Person>>({});
  const [rejectedPhotos, setRejectedPhotos] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'open' | 'all'>('open');
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: reportsError } = await supabase
        .from('user_reports')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(300);
      if (reportsError) throw reportsError;
      const rows = (data ?? []) as ReportRow[];
      setReports(rows);
      onOpenCountChange?.(rows.filter((r) => r.status === 'open').length);

      const clientIds = new Set<string>();
      const driverIds = new Set<string>();
      rows.forEach((r) => {
        (r.reporter_role === 'client' ? clientIds : driverIds).add(r.reporter_id);
        (r.reported_role === 'client' ? clientIds : driverIds).add(r.reported_id);
      });
      const cols = 'id, first_name, last_name, email, profile_photo_url, status';
      const [clients, drivers] = await Promise.all([
        clientIds.size ? supabase.from('clients').select(cols).in('id', [...clientIds]) : { data: [] },
        driverIds.size ? supabase.from('drivers').select(cols).in('id', [...driverIds]) : { data: [] },
      ]);
      const map: Record<string, Person> = {};
      [...(clients.data ?? []), ...(drivers.data ?? [])].forEach((p: any) => {
        map[p.id] = p;
      });
      setPeople(map);

      const reportedIds = [...new Set(rows.map((r) => r.reported_id))];
      if (reportedIds.length) {
        const { data: logs } = await supabase
          .from('image_moderation_log')
          .select('user_id')
          .eq('status', 'rejected')
          .in('user_id', reportedIds);
        const counts: Record<string, number> = {};
        (logs ?? []).forEach((l: { user_id: string }) => {
          counts[l.user_id] = (counts[l.user_id] ?? 0) + 1;
        });
        setRejectedPhotos(counts);
      }
    } catch (e) {
      console.error('Erreur chargement signalements:', e);
      setError('Impossible de charger les signalements.');
    } finally {
      setLoading(false);
    }
  }, [onOpenCountChange]);

  useEffect(() => {
    load();
  }, [load]);

  const reportsAgainst = useMemo(() => {
    const counts: Record<string, number> = {};
    reports.forEach((r) => {
      counts[r.reported_id] = (counts[r.reported_id] ?? 0) + 1;
    });
    return counts;
  }, [reports]);

  const visible = filter === 'open' ? reports.filter((r) => r.status === 'open') : reports;

  const runAction = async (report: ReportRow, action: Action) => {
    const target = people[report.reported_id];
    const name = target ? `${target.first_name ?? ''} ${target.last_name ?? ''}`.trim() : 'cet utilisateur';
    const confirmations: Partial<Record<Action, string>> = {
      suspend: `Suspendre le compte de ${name} ? Il ne pourra plus se connecter.`,
      remove_photo: `Supprimer définitivement la photo de profil (et les photos de véhicule) de ${name} ?`,
      unsuspend: `Lever la suspension du compte de ${name} ?`,
    };
    const message = confirmations[action];
    if (message && !window.confirm(message)) return;

    setBusyId(report.id);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-moderate-user`, {
        method: 'POST',
        headers: { Authorization: await authBearer(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId: report.id, action, note: notes[report.id] ?? '' }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      await load();
    } catch (e) {
      console.error('Erreur traitement signalement:', e);
      window.alert("Le traitement a échoué. Réessayez, ou consultez les journaux de la fonction « admin-moderate-user ».");
    } finally {
      setBusyId(null);
    }
  };

  const renderPerson = (id: string, role: Role) => {
    const p = people[id];
    return (
      <div className="flex items-center gap-3 min-w-0">
        {p?.profile_photo_url ? (
          <img src={p.profile_photo_url} alt="" className="w-10 h-10 rounded-full object-cover bg-gray-100 flex-shrink-0" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
            <User size={18} className="text-gray-400" />
          </div>
        )}
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">
            {p ? `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() || 'Sans nom' : 'Compte supprimé'}
          </p>
          <p className="text-xs text-gray-500 truncate">
            {ROLE_LABELS[role]}
            {p?.email ? ` · ${p.email}` : ''}
          </p>
        </div>
      </div>
    );
  };

  if (loading) return <SkeletonList count={4} />;

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Flag size={18} className="text-gray-700" />
          <h2 className="text-base sm:text-lg font-semibold text-gray-900">Signalements</h2>
        </div>
        <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden text-xs sm:text-sm">
          {(['open', 'all'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 font-medium ${filter === f ? 'bg-brand text-white' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              {f === 'open' ? 'À traiter' : 'Tous'}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="px-4 sm:px-6 py-4 text-sm text-danger-600">{error}</p>}

      {!error && visible.length === 0 && (
        <p className="px-4 sm:px-6 py-10 text-center text-sm text-gray-500">
          {filter === 'open' ? 'Aucun signalement à traiter.' : 'Aucun signalement.'}
        </p>
      )}

      <ul className="divide-y divide-gray-100">
        {visible.map((report) => {
          const target = people[report.reported_id];
          const suspended = target?.status === 'suspended';
          const busy = busyId === report.id;
          const statusBadge = STATUS_LABELS[report.status];
          return (
            <li key={report.id} className="px-4 sm:px-6 py-4 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusBadge.className}`}>
                  {statusBadge.label}
                </span>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-900 text-white">
                  {REASON_LABELS[report.reason] ?? report.reason}
                </span>
                {suspended && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-danger-100 text-danger-700">
                    Compte suspendu
                  </span>
                )}
                <span className="text-xs text-gray-500 ml-auto">
                  {new Date(report.created_at).toLocaleString('fr-FR')}
                </span>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-gray-400 mb-1">Signalé par</p>
                  {renderPerson(report.reporter_id, report.reporter_role)}
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-gray-400 mb-1">Personne signalée</p>
                  {renderPerson(report.reported_id, report.reported_role)}
                </div>
              </div>

              <p className="text-xs text-gray-500">
                {reportsAgainst[report.reported_id] ?? 1} signalement(s) contre cette personne ·{' '}
                {rejectedPhotos[report.reported_id] ?? 0} photo(s) refusée(s) par la modération automatique
                {report.booking_id && ` · réservation ${report.booking_id.slice(0, 8)}`}
                {report.parcel_request_id && ` · demande de colis ${report.parcel_request_id.slice(0, 8)}`}
              </p>

              {report.comment && (
                <p className="text-sm text-gray-800 bg-gray-50 rounded-lg px-3 py-2 whitespace-pre-wrap">{report.comment}</p>
              )}

              {report.status === 'open' ? (
                <div className="space-y-2">
                  <textarea
                    value={notes[report.id] ?? ''}
                    onChange={(e) => setNotes((n) => ({ ...n, [report.id]: e.target.value }))}
                    placeholder="Note interne (facultatif)"
                    maxLength={1000}
                    rows={2}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand/30"
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => runAction(report, 'dismiss')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      <X size={14} /> Sans suite
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => runAction(report, 'reviewed')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      <Check size={14} /> Examiné
                    </button>
                    <button
                      type="button"
                      disabled={busy || !target}
                      onClick={() => runAction(report, 'remove_photo')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-warning-300 text-warning-700 hover:bg-warning-50 disabled:opacity-50"
                    >
                      <ImageIcon size={14} /> Supprimer les photos
                    </button>
                    {suspended ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => runAction(report, 'unsuspend')}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-success-300 text-success-700 hover:bg-success-50 disabled:opacity-50"
                      >
                        <ShieldCheck size={14} /> Lever la suspension
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={busy || !target}
                        onClick={() => runAction(report, 'suspend')}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-danger-600 text-white hover:bg-danger-700 disabled:opacity-50"
                      >
                        <ShieldOff size={14} /> Suspendre le compte
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                report.admin_note && (
                  <p className="text-xs text-gray-500">
                    Note : {report.admin_note}
                    {report.handled_at && ` (${new Date(report.handled_at).toLocaleDateString('fr-FR')})`}
                  </p>
                )
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
};
