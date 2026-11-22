import React from 'react';
import { TUNISIA_GOVERNORATES, TUNISIA_GOVERNORATE_CODES } from '../../utils/tunisiaGovernorates';

interface GovernoratePickerProps {
  value: string[];
  onChange: (next: string[]) => void;
  error?: string;
}

/** Sélection multiple des gouvernorats couverts par un transporteur local. */
export const GovernoratePicker: React.FC<GovernoratePickerProps> = ({ value, onChange, error }) => {
  const selected = new Set(value);
  const allSelected = value.length === TUNISIA_GOVERNORATE_CODES.length;

  const toggle = (code: string) => {
    const next = new Set(selected);
    if (next.has(code)) next.delete(code);
    else next.add(code);
    // Conserver l'ordre officiel
    onChange(TUNISIA_GOVERNORATE_CODES.filter((c) => next.has(c)));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="block text-sm font-medium text-gray-700">
          Zones couvertes (gouvernorats de départ) *
        </label>
        <button
          type="button"
          onClick={() => onChange(allSelected ? [] : [...TUNISIA_GOVERNORATE_CODES])}
          className="text-xs font-medium text-gray-900 underline underline-offset-2 hover:text-gray-600"
        >
          {allSelected ? 'Tout désélectionner' : 'Toute la Tunisie'}
        </button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {TUNISIA_GOVERNORATES.map((g) => {
          const checked = selected.has(g.code);
          return (
            <label
              key={g.code}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm cursor-pointer transition-colors ${
                checked ? 'border-black bg-gray-50 text-gray-900' : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggle(g.code)}
                className="rounded border-gray-300 text-black focus:ring-gray-900"
              />
              {g.fr}
            </label>
          );
        })}
      </div>
      <p className="text-xs text-gray-500 mt-2">
        Vous recevrez les demandes dont l'adresse de départ se situe dans l'un de ces gouvernorats.
      </p>
      {error && <p className="mt-2 text-sm text-danger-600">{error}</p>}
    </div>
  );
};
