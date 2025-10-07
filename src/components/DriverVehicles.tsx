import React, { useEffect, useState, useCallback } from 'react';
import { Plus, Trash2, Camera, Loader2 } from 'lucide-react';
import { Button } from './ui/Button';
import { listVehicles, createVehicle, softDeleteVehicle, updateVehicle } from '../utils/vehicles';
import { Vehicle } from '../types';
import { uploadVehiclePhotoForVehicle, deleteVehiclePhotoForVehicle } from '../utils/imageUpload';
import { supabase } from '../lib/supabase';

interface DriverVehiclesProps {
  driverId: string;
}

export const DriverVehicles: React.FC<DriverVehiclesProps> = ({ driverId }) => {
  const getVehicleTypeLabel = (type?: Vehicle['type']): string => {
    switch (type) {
      case 'sedan': return 'Berline';
      case 'pickup': return 'Pickup';
      case 'van': return 'Van';
      case 'minibus': return 'Minibus';
      case 'bus': return 'Bus';
      case 'truck': return 'Camion';
      case 'utility': return 'Utilitaire';
      case 'limousine': return 'Limousine';
      default: return '';
    }
  };
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ 
    make: '', 
    model: '', 
    year: '',
    color: '',
    seats: '',
    licensePlate: '',
    type: ''
  });
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const fileInputs = React.useRef<Record<string, HTMLInputElement | null>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ [id: string]: Partial<Vehicle> }>({});

  const refresh = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const rows = await listVehicles(driverId);
      setVehicles(rows);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erreur lors du chargement des véhicules';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [driverId]);

  useEffect(() => {
    if (driverId) {
      void refresh();
    }
  }, [driverId, refresh]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    // Validation minimale côté client
    if (!form.make || !form.model || !form.year || !form.color || !form.seats || !form.licensePlate || !form.type) {
      setError('Veuillez remplir tous les champs requis.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const created = await createVehicle(driverId, {
        make: form.make,
        model: form.model,
        year: parseInt(form.year, 10),
        color: form.color,
        seats: parseInt(form.seats, 10),
        licensePlate: form.licensePlate,
        type: form.type as Vehicle['type']
      });
      setForm({ make: '', model: '', year: '', color: '', seats: '', licensePlate: '', type: '' });
      // Si le profil n'a pas encore de vehicle_info (ancien affichage principal), le définir avec ce nouveau véhicule
      try {
        const { data: driverRow } = await supabase
          .from('drivers')
          .select('vehicle_info')
          .eq('id', driverId)
          .maybeSingle();
        if (!driverRow || !driverRow.vehicle_info) {
          await supabase
            .from('drivers')
            .update({
              vehicle_info: {
                make: created.make,
                model: created.model,
                year: created.year || null,
                color: created.color || null,
                licensePlate: created.licensePlate || null,
                seats: created.seats || null,
                type: created.type || null,
                photoUrl: created.photoUrl || null
              }
            })
            .eq('id', driverId);
        }
      } catch {
        // ignore
      }
      await refresh();
      // section legacy supprimée; pas de reload nécessaire
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Impossible d'ajouter le véhicule";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (vehicleId: string) => {
    if (!window.confirm('Supprimer ce véhicule ?')) return;
    try {
      await softDeleteVehicle(vehicleId);
      await refresh();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erreur lors de la suppression';
      alert(msg);
    }
  };

  const handleUploadClick = (vehicleId: string) => {
    fileInputs.current[vehicleId]?.click();
  };

  const handleFileChange = async (vehicleId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingId(vehicleId);
    try {
      await uploadVehiclePhotoForVehicle(file, vehicleId);
      await refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur lors de l'upload de la photo";
      alert(msg);
    } finally {
      setUploadingId(null);
      e.target.value = '';
    }
  };

  const handleDeletePhoto = async (vehicle: Vehicle) => {
    if (!vehicle.photoUrl) return;
    if (!window.confirm('Supprimer la photo de ce véhicule ?')) return;
    try {
      await deleteVehiclePhotoForVehicle(vehicle.photoUrl, vehicle.id);
      await refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur lors de la suppression de la photo';
      alert(msg);
    }
  };

  const startEdit = (v: Vehicle) => {
    setEditingId(v.id);
    setEditForm({
      [v.id]: {
        make: v.make,
        model: v.model,
        year: v.year,
        color: v.color,
        seats: v.seats,
        licensePlate: v.licensePlate,
        type: v.type
      }
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const saveEdit = async (id: string) => {
    const payload = editForm[id];
    if (!payload?.make || !payload?.model || !payload?.year || !payload?.color || !payload?.seats || !payload?.licensePlate || !payload?.type) {
      alert('Veuillez remplir tous les champs.');
      return;
    }
    try {
      await updateVehicle(id, {
        make: payload.make,
        model: payload.model,
        year: Number(payload.year),
        color: payload.color,
        seats: Number(payload.seats),
        licensePlate: payload.licensePlate,
        type: payload.type
      });
      await refresh();
      cancelEdit();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erreur lors de la mise à jour';
      alert(msg);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-1">Mes véhicules</h3>
      <p className="text-xs text-gray-500 mb-4">Ajoutez vos véhicules et gérez leurs informations et leurs photos.</p>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>
      )}

      {/* Formulaire d'ajout */}
      <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6 p-3 border border-gray-200 rounded-lg bg-gray-50">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-600">Marque</label>
          <input
          value={form.make}
          onChange={(e) => setForm({ ...form, make: e.target.value })}
          placeholder="Ex: Toyota, BMW"
          className="border rounded-md px-2 py-1.5 text-sm h-9"
          required
        />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-600">Modèle</label>
          <input
          value={form.model}
          onChange={(e) => setForm({ ...form, model: e.target.value })}
          placeholder="Ex: Corolla, X5"
          className="border rounded-md px-2 py-1.5 text-sm h-9"
          required
        />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-600">Année</label>
          <input
          value={form.year}
          onChange={(e) => setForm({ ...form, year: e.target.value.replace(/[^0-9]/g, '') })}
          placeholder="2022"
          className="border rounded-md px-2 py-1.5 text-sm h-9"
          inputMode="numeric"
          required
        />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-600">Couleur</label>
          <input
          value={form.color}
          onChange={(e) => setForm({ ...form, color: e.target.value })}
          placeholder="Bleu"
          className="border rounded-md px-2 py-1.5 text-sm h-9"
          required
        />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-600">Places</label>
          <input
          value={form.seats}
          onChange={(e) => setForm({ ...form, seats: e.target.value.replace(/[^0-9]/g, '') })}
          placeholder="4"
          className="border rounded-md px-2 py-1.5 text-sm h-9"
          inputMode="numeric"
          required
        />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-600">Plaque</label>
          <input
          value={form.licensePlate}
          onChange={(e) => setForm({ ...form, licensePlate: e.target.value.toUpperCase() })}
          placeholder="TUN 000"
          className="border rounded-md px-2 py-1.5 text-sm h-9"
          required
        />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-600">Type</label>
          <select
          value={form.type}
          onChange={(e) => setForm({ ...form, type: e.target.value })}
          className="border rounded-md px-2 py-1.5 text-sm h-9"
          required
        >
          <option value="">Type</option>
          <option value="sedan">Berline</option>
          <option value="pickup">Pickup</option>
          <option value="van">Van</option>
          <option value="minibus">Minibus</option>
          <option value="bus">Bus</option>
          <option value="truck">Camion</option>
          <option value="utility">Utilitaire</option>
          <option value="limousine">Limousine</option>
        </select>
        </div>
        <div className="flex items-end">
          <Button type="submit" loading={saving} className="flex items-center justify-center gap-2 w-full h-9 px-3 py-1.5 text-sm">
            <Plus size={16} /> Ajouter
          </Button>
        </div>
      </form>

      {loading ? (
        <p className="text-gray-600 text-sm">Chargement...</p>
      ) : vehicles.length === 0 ? (
        <p className="text-gray-600 text-sm">Aucun véhicule ajouté pour le moment.</p>
      ) : (
        <div className="space-y-3">
          {vehicles.map((v) => (
            <div
              key={v.id}
              className={`p-3 sm:p-4 bg-white border border-gray-200 rounded-lg ${
                editingId === v.id ? 'flex flex-col' : 'flex flex-col sm:flex-row'
              } gap-4`}
            >
              <div className="relative w-full sm:w-48 h-28 rounded-md overflow-hidden bg-gray-50 border border-gray-200 flex-shrink-0">
                {v.photoUrl ? (
                  <img src={v.photoUrl} alt="Véhicule" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-gray-500">Pas de photo</div>
                )}
                {uploadingId === v.id && (
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                    <Loader2 className="text-white animate-spin" size={20} />
                  </div>
                )}
                {v.is_primary && (
                  <div className="absolute top-2 left-2 bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full shadow">Actif</div>
                )}
              </div>

              <div className="flex-1 min-w-0 w-full">
                {editingId === v.id ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 min-w-0 w-full">
                    <input className="w-full border rounded-md px-2 py-1.5 text-sm h-9" value={editForm[v.id]?.make || ''} onChange={(e)=>setEditForm({ ...editForm, [v.id]: { ...editForm[v.id], make: e.target.value } })} placeholder="Marque" />
                    <input className="w-full border rounded-md px-2 py-1.5 text-sm h-9" value={editForm[v.id]?.model || ''} onChange={(e)=>setEditForm({ ...editForm, [v.id]: { ...editForm[v.id], model: e.target.value } })} placeholder="Modèle" />
                    <input className="w-full border rounded-md px-2 py-1.5 text-sm h-9" value={editForm[v.id]?.year ?? ''} onChange={(e)=>setEditForm({ ...editForm, [v.id]: { ...editForm[v.id], year: parseInt(e.target.value || '0', 10) } })} placeholder="Année" inputMode="numeric" />
                    <input className="w-full border rounded-md px-2 py-1.5 text-sm h-9" value={editForm[v.id]?.color || ''} onChange={(e)=>setEditForm({ ...editForm, [v.id]: { ...editForm[v.id], color: e.target.value } })} placeholder="Couleur" />
                    <input className="w-full border rounded-md px-2 py-1.5 text-sm h-9" value={editForm[v.id]?.seats ?? ''} onChange={(e)=>setEditForm({ ...editForm, [v.id]: { ...editForm[v.id], seats: parseInt(e.target.value || '0', 10) } })} placeholder="Places" inputMode="numeric" />
                    <div className="grid grid-cols-2 gap-2">
                      <input className="w-full border rounded-md px-2 py-1.5 text-sm h-9" value={editForm[v.id]?.licensePlate || ''} onChange={(e)=>setEditForm({ ...editForm, [v.id]: { ...editForm[v.id], licensePlate: e.target.value.toUpperCase() } })} placeholder="Plaque" />
                      <select className="w-full border rounded-md px-2 py-1.5 text-sm h-9" value={editForm[v.id]?.type || ''} onChange={(e)=>setEditForm({ ...editForm, [v.id]: { ...editForm[v.id], type: e.target.value as Vehicle['type'] } })}>
                        <option value="">Type</option>
                        <option value="sedan">Berline</option>
                        <option value="pickup">Pickup</option>
                        <option value="van">Van</option>
                        <option value="minibus">Minibus</option>
                        <option value="bus">Bus</option>
                        <option value="truck">Camion</option>
                        <option value="utility">Utilitaire</option>
                        <option value="limousine">Limousine</option>
                      </select>
                    </div>
                    <div className="col-span-2 flex items-center gap-2 mt-1">
                      <input id={`primary-${v.id}`} type="checkbox" checked={!!editForm[v.id]?.is_primary} onChange={(e)=>setEditForm({ ...editForm, [v.id]: { ...editForm[v.id], is_primary: e.target.checked } })} />
                      <label htmlFor={`primary-${v.id}`} className="text-xs text-gray-700">Définir comme véhicule actif</label>
                    </div>
                  </div>
                ) : (
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm sm:text-base text-gray-900 font-semibold truncate">
                        {v.make} {v.model}
                      </span>
                      {v.licensePlate && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-800 border border-gray-200">{v.licensePlate}</span>
                      )}
                      {v.type && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">{getVehicleTypeLabel(v.type)}</span>
                      )}
                      {v.seats && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">{v.seats} places</span>
                      )}
                    </div>
                    <div className="text-xs sm:text-sm text-gray-600 mt-1">
                      {v.year ? `${v.year}` : ''}{v.year && (v.color || v.seats || v.type) ? ' • ' : ''}{v.color || ''}
                    </div>
                  </div>
                )}
              </div>

              <div className={`${editingId === v.id ? 'w-full justify-end mt-2' : 'self-stretch sm:self-auto'} flex items-center gap-2 flex-wrap` }>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  ref={(el) => (fileInputs.current[v.id] = el)}
                  onChange={(e) => handleFileChange(v.id, e)}
                />
                <Button type="button" variant="outline" onClick={() => handleUploadClick(v.id)} className="flex items-center gap-2 whitespace-nowrap w-full sm:w-auto">
                  <Camera size={16} /> Photo
                </Button>
                {editingId === v.id ? (
                  <>
                    <Button type="button" onClick={() => saveEdit(v.id)} className="whitespace-nowrap w-full sm:w-auto">Enregistrer</Button>
                    <Button type="button" variant="outline" onClick={cancelEdit} className="whitespace-nowrap w-full sm:w-auto">Annuler</Button>
                  </>
                ) : (
                  <Button type="button" variant="outline" onClick={() => startEdit(v)} className="whitespace-nowrap w-full sm:w-auto">Éditer</Button>
                )}
                {v.photoUrl && (
                  <Button type="button" variant="outline" onClick={() => handleDeletePhoto(v)} className="flex items-center gap-2 border-red-300 text-red-600 hover:bg-red-50 whitespace-nowrap w-full sm:w-auto">
                    <Trash2 size={16} /> Supprimer photo
                  </Button>
                )}
                <Button type="button" variant="outline" onClick={() => handleDelete(v.id)} className="flex items-center gap-2 border-red-300 text-red-600 hover:bg-red-50 whitespace-nowrap w-full sm:w-auto">
                  <Trash2 size={16} /> Supprimer
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};


