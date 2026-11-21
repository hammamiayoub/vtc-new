import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert } from './ui/Alert';
import { Button } from './ui/Button';
import { supabase } from '../lib/supabase';
import {
  PREVIEW_TRIPS,
  configToDraft,
  draftToConfig,
  previewBasePrice,
  type DraftTier,
  type PricingDraft,
  type PricingRow,
} from '../utils/pricingAdmin';

const inputClass =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand';

const money = (n: number): string => n.toFixed(2).replace('.', ',');

const formatDate = (iso: string): string =>
  new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

const Field: React.FC<{ label: string; suffix?: string; value: string; onChange: (v: string) => void; hint?: string }> = ({
  label,
  suffix,
  value,
  onChange,
  hint,
}) => (
  <label className="block">
    <span className="mb-1 block text-xs font-medium text-gray-700">{label}</span>
    <div className="flex items-center gap-2">
      <input className={inputClass} inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)} />
      {suffix && <span className="shrink-0 text-xs text-gray-500">{suffix}</span>}
    </div>
    {hint && <span className="mt-1 block text-xs text-gray-500">{hint}</span>}
  </label>
);

const TierTable: React.FC<{
  title: string;
  valueLabel: string;
  valueSuffix: string;
  tiers: DraftTier[];
  onChange: (tiers: DraftTier[]) => void;
}> = ({ title, valueLabel, valueSuffix, tiers, onChange }) => {
  const update = (index: number, patch: Partial<DraftTier>) =>
    onChange(tiers.map((t, i) => (i === index ? { ...t, ...patch } : t)));
  return (
    <div>
      <h4 className="mb-2 text-sm font-semibold text-gray-900">{title}</h4>
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs text-gray-600">
            <tr>
              <th className="px-3 py-2 font-medium">De (km)</th>
              <th className="px-3 py-2 font-medium">Jusqu’à (km)</th>
              <th className="px-3 py-2 font-medium">{valueLabel}</th>
            </tr>
          </thead>
          <tbody>
            {tiers.map((tier, i) => {
              const isLast = i === tiers.length - 1;
              return (
                <tr key={i} className="border-t border-gray-100">
                  <td className="px-3 py-2 text-gray-600">{i === 0 ? 0 : tiers[i - 1].upTo || '…'}</td>
                  <td className="px-3 py-2">
                    {isLast ? (
                      <span className="text-gray-500">sans limite</span>
                    ) : (
                      <input
                        className={`${inputClass} max-w-[7rem]`}
                        inputMode="decimal"
                        value={tier.upTo}
                        onChange={(e) => update(i, { upTo: e.target.value })}
                        aria-label={`${title}, palier ${i + 1}, borne haute en km`}
                      />
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <input
                        className={`${inputClass} max-w-[7rem]`}
                        inputMode="decimal"
                        value={tier.value}
                        onChange={(e) => update(i, { value: e.target.value })}
                        aria-label={`${title}, palier ${i + 1}, ${valueLabel}`}
                      />
                      <span className="text-xs text-gray-500">{valueSuffix}</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export const AdminPricing: React.FC = () => {
  const [rows, setRows] = useState<PricingRow[]>([]);
  const [draft, setDraft] = useState<PricingDraft | null>(null);
  const [activate, setActivate] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const active = useMemo(() => rows.find((r) => r.is_active) ?? null, [rows]);

  const load = useCallback(async (resetDraft: boolean) => {
    setLoading(true);
    const { data, error: loadError } = await supabase
      .from('pricing_config')
      .select('version, is_active, config, note, created_at')
      .order('version', { ascending: false });
    if (loadError) {
      setError(
        loadError.message.includes('pricing_config')
          ? 'La table pricing_config est introuvable : exécutez scripts/pricing-grid-versioning.sql puis scripts/pricing-grid-admin.sql.'
          : loadError.message,
      );
      setLoading(false);
      return;
    }
    const list = (data ?? []) as PricingRow[];
    setRows(list);
    if (resetDraft) {
      const current = list.find((r) => r.is_active) ?? list[0];
      setDraft(current ? configToDraft(current.config) : null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load(true);
  }, [load]);

  const validation = useMemo(() => (draft ? draftToConfig(draft) : { config: null, errors: [] as string[] }), [draft]);

  const setField = (patch: Partial<PricingDraft>) => setDraft((d) => (d ? { ...d, ...patch } : d));

  const save = async () => {
    if (!validation.config) return;
    const message = activate
      ? 'Enregistrer cette grille comme nouvelle version et l\'ACTIVER ?\n\nLe site et les nouvelles versions de l\'application l\'utiliseront dès leur prochain chargement.'
      : 'Enregistrer cette grille comme nouvelle version, sans l\'activer ?';
    if (!window.confirm(message)) return;

    setSaving(true);
    setError(null);
    setNotice(null);
    const { data, error: rpcError } = await supabase.rpc('admin_save_pricing_grid', {
      p_config: validation.config,
      p_note: draft?.note ?? null,
      p_activate: activate,
    });
    setSaving(false);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    setNotice(`Version ${data} enregistrée${activate ? ' et activée' : ''}.`);
    await load(false);
  };

  const activateVersion = async (version: number) => {
    if (!window.confirm(`Activer la version ${version} ? Elle remplacera la grille active.`)) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    const { error: rpcError } = await supabase.rpc('admin_activate_pricing_grid', { p_version: version });
    setSaving(false);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    setNotice(`Version ${version} activée.`);
    await load(false);
  };

  if (loading && rows.length === 0) {
    return <div className="rounded-xl bg-white p-6 text-sm text-gray-600 shadow-sm">Chargement de la grille tarifaire…</div>;
  }

  return (
    <div className="space-y-6">
      {error && <Alert tone="danger">{error}</Alert>}
      {notice && <Alert tone="success">{notice}</Alert>}

      <Alert tone="info" title="Comment ça fonctionne">
        Chaque enregistrement crée une <strong>nouvelle version</strong> : une version existante n’est jamais modifiée, car les réservations
        gardent la version avec laquelle le prix a été estimé. Seule la version <strong>active</strong> est lue par le site et par les nouvelles
        versions de l’application. Les applications déjà publiées gardent leur grille embarquée. Pour annuler un changement, réactivez la
        version précédente.
      </Alert>

      {draft && (
        <section className="rounded-xl bg-white p-4 shadow-sm sm:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-gray-900">Éditer la grille</h2>
            {active && (
              <span className="rounded-full bg-success-50 px-3 py-1 text-xs font-semibold text-success-800">
                Version active : v{active.version}
              </span>
            )}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Prise en charge par défaut"
                  suffix="TND"
                  value={draft.defaultPickup}
                  onChange={(v) => setField({ defaultPickup: v })}
                  hint="Estimation avant le choix du chauffeur."
                />
                <Field label="Prix minimum" suffix="TND" value={draft.minPrice} onChange={(v) => setField({ minPrice: v })} />
              </div>

              <TierTable
                title="Prise en charge selon la distance du chauffeur"
                valueLabel="Prise en charge (TND)"
                valueSuffix="TND"
                tiers={draft.pickupTiers}
                onChange={(pickupTiers) => setField({ pickupTiers })}
              />

              <TierTable
                title="Tarif au kilomètre (progressif)"
                valueLabel="Tarif au km"
                valueSuffix="TND/km"
                tiers={draft.kmTiers}
                onChange={(kmTiers) => setField({ kmTiers })}
              />

              <div>
                <h4 className="mb-2 text-sm font-semibold text-gray-900">Suppléments</h4>
                <div className="grid gap-4 sm:grid-cols-3">
                  <Field label="Nuit (21 h – 6 h)" suffix="%" value={draft.night} onChange={(v) => setField({ night: v })} />
                  <Field label="Week-end" suffix="%" value={draft.weekend} onChange={(v) => setField({ weekend: v })} />
                  <Field label="Plafond cumulé" suffix="%" value={draft.max} onChange={(v) => setField({ max: v })} />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="mb-2 text-sm font-semibold text-gray-900">Aperçu des prix</h4>
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-left text-xs text-gray-600">
                      <tr>
                        <th className="px-3 py-2 font-medium">Trajet</th>
                        <th className="px-3 py-2 text-right font-medium">Active</th>
                        <th className="px-3 py-2 text-right font-medium">Brouillon</th>
                      </tr>
                    </thead>
                    <tbody>
                      {PREVIEW_TRIPS.map((trip) => {
                        const current = active ? previewBasePrice(active.config, trip.km) : null;
                        const next = validation.config ? previewBasePrice(validation.config, trip.km) : null;
                        const diff = current !== null && next !== null ? next - current : 0;
                        return (
                          <tr key={trip.km} className="border-t border-gray-100">
                            <td className="px-3 py-2 text-gray-800">
                              {trip.label} <span className="text-xs text-gray-500">({trip.km} km)</span>
                            </td>
                            <td className="px-3 py-2 text-right text-gray-600">{current !== null ? `${money(current)}` : '—'}</td>
                            <td className="px-3 py-2 text-right font-semibold text-gray-900">
                              {next !== null ? money(next) : '—'}
                              {next !== null && Math.abs(diff) >= 0.005 && (
                                <span className={`ml-2 text-xs font-medium ${diff < 0 ? 'text-success-700' : 'text-danger-700'}`}>
                                  {diff > 0 ? '+' : ''}
                                  {money(diff)}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  Prix de base en TND pour une berline, chauffeur proche, hors suppléments. Le prix affiché au client est ensuite arrondi
                  (dinar supérieur sur le site, multiple de 5 dans l’application) et multiplié selon le type de véhicule.
                </p>
              </div>

              <label className="block">
                <span className="mb-1 block text-xs font-medium text-gray-700">Note (facultative)</span>
                <input
                  className={inputClass}
                  maxLength={200}
                  value={draft.note}
                  onChange={(e) => setField({ note: e.target.value })}
                  placeholder="Ex. : baisse des tarifs courtes distances"
                />
              </label>

              <label className="flex items-start gap-2 text-sm text-gray-800">
                <input type="checkbox" className="mt-1" checked={activate} onChange={(e) => setActivate(e.target.checked)} />
                <span>Activer immédiatement cette version après l’enregistrement</span>
              </label>

              {validation.errors.length > 0 && (
                <Alert tone="warning" title="À corriger avant d’enregistrer">
                  <ul className="list-disc pl-4">
                    {validation.errors.map((message) => (
                      <li key={message}>{message}</li>
                    ))}
                  </ul>
                </Alert>
              )}

              <div className="flex flex-wrap gap-3">
                <Button onClick={save} loading={saving} disabled={!validation.config || saving} size="sm">
                  {activate ? 'Enregistrer et activer' : 'Enregistrer'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={saving}
                  onClick={() => {
                    const current = rows.find((r) => r.is_active) ?? rows[0];
                    if (current) setDraft(configToDraft(current.config));
                  }}
                >
                  Réinitialiser
                </Button>
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="rounded-xl bg-white p-4 shadow-sm sm:p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Historique des versions</h2>
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs text-gray-600">
              <tr>
                <th className="px-3 py-2 font-medium">Version</th>
                <th className="px-3 py-2 font-medium">Créée le</th>
                <th className="px-3 py-2 font-medium">Note</th>
                <th className="px-3 py-2 font-medium">Statut</th>
                <th className="px-3 py-2 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.version} className="border-t border-gray-100">
                  <td className="px-3 py-2 font-semibold text-gray-900">v{row.version}</td>
                  <td className="px-3 py-2 text-gray-600">{formatDate(row.created_at)}</td>
                  <td className="px-3 py-2 text-gray-700">
                    {row.note || (row.version === 1 ? 'Grille historique (repli des applications publiées)' : '—')}
                  </td>
                  <td className="px-3 py-2">
                    {row.is_active ? (
                      <span className="rounded-full bg-success-50 px-2 py-0.5 text-xs font-semibold text-success-800">Active</span>
                    ) : (
                      <span className="text-xs text-gray-500">Inactive</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        className="rounded-lg border border-gray-300 px-3 py-1 text-xs font-medium text-gray-800 hover:bg-gray-50"
                        onClick={() => setDraft(configToDraft(row.config, row.note ?? ''))}
                      >
                        Copier dans l’éditeur
                      </button>
                      {!row.is_active && (
                        <button
                          type="button"
                          disabled={saving}
                          className="rounded-lg bg-black px-3 py-1 text-xs font-medium text-white hover:bg-gray-800 disabled:bg-gray-300"
                          onClick={() => void activateVersion(row.version)}
                        >
                          Activer
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
