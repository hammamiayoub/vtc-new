import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from './Button';
import type { ParcelItem } from '../../types';

interface ParcelItemsInputProps {
  items: Omit<ParcelItem, 'id' | 'requestId' | 'createdAt'>[];
  onChange: (items: Omit<ParcelItem, 'id' | 'requestId' | 'createdAt'>[]) => void;
  errors?: string;
}

const emptyItem = (): Omit<ParcelItem, 'id' | 'requestId' | 'createdAt'> => ({
  name: '',
  quantity: 1,
  weightKg: undefined,
  volumeM3: undefined,
});

export const ParcelItemsInput: React.FC<ParcelItemsInputProps> = ({ items, onChange, errors }) => {
  const updateItem = (index: number, field: keyof Omit<ParcelItem, 'id' | 'requestId' | 'createdAt'>, value: string | number) => {
    const next = [...items];
    next[index] = { ...next[index], [field]: value };
    onChange(next);
  };

  const addItem = () => onChange([...items, emptyItem()]);

  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    onChange(items.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-900">Description des objets</h3>
        <Button type="button" variant="outline" size="sm" onClick={addItem} className="flex items-center gap-1">
          <Plus size={14} />
          Ajouter un objet
        </Button>
      </div>

      {items.map((item, index) => (
        <div key={index} className="p-4 border border-gray-200 rounded-lg bg-gray-50 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Objet {index + 1}</span>
            {items.length > 1 && (
              <button
                type="button"
                onClick={() => removeItem(index)}
                className="text-red-500 hover:text-red-700 p-1"
                aria-label="Supprimer l'objet"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Nom de l'objet *</label>
              <input
                type="text"
                value={item.name}
                onChange={(e) => updateItem(index, 'name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ex: Cartons, meubles…"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Nombre de colis *</label>
              <input
                type="number"
                min={1}
                value={item.quantity}
                onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value, 10) || 1)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Poids estimé (kg)</label>
              <input
                type="number"
                min={0}
                step="0.1"
                value={item.weightKg ?? ''}
                onChange={(e) =>
                  updateItem(index, 'weightKg', e.target.value ? parseFloat(e.target.value) : undefined as unknown as number)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Optionnel"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Volume estimé (m³)</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={item.volumeM3 ?? ''}
                onChange={(e) =>
                  updateItem(index, 'volumeM3', e.target.value ? parseFloat(e.target.value) : undefined as unknown as number)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Optionnel"
              />
            </div>
          </div>
        </div>
      ))}

      {errors && <p className="text-sm text-red-600">{errors}</p>}
    </div>
  );
};
