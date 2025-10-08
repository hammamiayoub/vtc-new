import React, { useEffect, useState, useCallback } from 'react';
import { Plus, Trash2, Camera, Loader2, CheckCircle, Edit } from 'lucide-react';
import { Button } from './ui/Button';
import { listVehicles, createVehicle, softDeleteVehicle, updateVehicle } from '../utils/vehicles';
import { Vehicle } from '../types';
import { uploadVehiclePhotoForVehicle, deleteVehiclePhotoForVehicle } from '../utils/imageUpload';
import { supabase } from '../lib/supabase';

interface DriverVehiclesProps {
  driverId: string;
}

export const DriverVehicles: React.FC<DriverVehiclesProps> = ({ driverId }) => {
  // Options pour les années (de 1990 à l'année en cours)
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: currentYear - 1990 + 1 }, (_, i) => currentYear - i);
  
  // Options pour les places (de 2 à 100)
  const seatOptions = Array.from({ length: 99 }, (_, i) => i + 2);
  
  // Couleurs standards
  const colorOptions = [
    'Blanc',
    'Noir',
    'Gris',
    'Argent',
    'Bleu',
    'Rouge',
    'Vert',
    'Jaune',
    'Orange',
    'Marron',
    'Beige',
    'Violet',
    'Rose',
    'Or',
    'Bronze'
  ];

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

  const refresh = useCallback(async (showLoader = true): Promise<void> => {
    if (showLoader) setLoading(true);
    setError(null);
    try {
      const rows = await listVehicles(driverId);
      setVehicles(rows);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erreur lors du chargement des véhicules';
      setError(msg);
    } finally {
      if (showLoader) setLoading(false);
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
      // Refresh sans loader pour éviter le freeze
      await refresh(false);
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
      // Refresh sans loader pour éviter le freeze
      await refresh(false);
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
      // Refresh sans loader pour éviter le freeze
      await refresh(false);
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
      // Refresh sans loader pour éviter le freeze
      await refresh(false);
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
    
    // Optimisation: mettre à jour l'état local immédiatement
    const updatedVehicle = {
      ...vehicles.find(v => v.id === id)!,
      make: payload.make,
      model: payload.model,
      year: Number(payload.year),
      color: payload.color,
      seats: Number(payload.seats),
      licensePlate: payload.licensePlate,
      type: payload.type
    };
    
    // Mise à jour optimiste de l'état local
    setVehicles(prev => prev.map(v => v.id === id ? updatedVehicle : v));
    cancelEdit();
    
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
      // Refresh silencieux en arrière-plan pour synchroniser
      await refresh(false);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erreur lors de la mise à jour';
      alert(msg);
      // En cas d'erreur, recharger pour restaurer l'état correct
      await refresh(false);
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
          <select
            value={form.year}
            onChange={(e) => setForm({ ...form, year: e.target.value })}
            className="border rounded-md px-2 py-1.5 text-sm h-9"
            required
          >
            <option value="">Sélectionner</option>
            {yearOptions.map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-600">Couleur</label>
          <select
            value={form.color}
            onChange={(e) => setForm({ ...form, color: e.target.value })}
            className="border rounded-md px-2 py-1.5 text-sm h-9"
            required
          >
            <option value="">Sélectionner</option>
            {colorOptions.map((color) => (
              <option key={color} value={color}>{color}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-600">Places</label>
          <select
            value={form.seats}
            onChange={(e) => setForm({ ...form, seats: e.target.value })}
            className="border rounded-md px-2 py-1.5 text-sm h-9"
            required
          >
            <option value="">Sélectionner</option>
            {seatOptions.map((seats) => (
              <option key={seats} value={seats}>{seats}</option>
            ))}
          </select>
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
              {/* Photo du véhicule avec overlay moderne */}
              <div className="relative w-full sm:w-48 h-32 sm:h-36 rounded-lg overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 border-2 border-gray-200 flex-shrink-0 group">
                {v.photoUrl ? (
                  <>
                    <img src={v.photoUrl} alt="Véhicule" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                    {/* Overlay hover avec actions rapides */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="absolute bottom-0 left-0 right-0 p-3 flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleUploadClick(v.id)}
                          disabled={uploadingId === v.id}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white/90 hover:bg-white text-gray-900 rounded-md text-xs font-medium transition-all shadow-sm disabled:opacity-50"
                        >
                          <Camera size={14} />
                          Changer
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePhoto(v)}
                          disabled={uploadingId === v.id}
                          className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-red-500/90 hover:bg-red-500 text-white rounded-md text-xs font-medium transition-all shadow-sm disabled:opacity-50"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleUploadClick(v.id)}
                    disabled={uploadingId === v.id}
                    className="w-full h-full flex flex-col items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-all group-hover:scale-105 disabled:opacity-50"
                  >
                    <Camera size={32} className="mb-2 text-gray-400" />
                    <span className="text-xs font-medium">Ajouter une photo</span>
                    <span className="text-[10px] text-gray-400 mt-1">Cliquez ici</span>
                  </button>
                )}
                
                {/* Indicateur de chargement */}
                {uploadingId === v.id && (
                  <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex flex-col items-center justify-center">
                    <Loader2 className="text-white animate-spin mb-2" size={24} />
                    <span className="text-white text-xs font-medium">Upload en cours...</span>
                  </div>
                )}
                
                {/* Badge "Actif" */}
                {v.is_primary && (
                  <div className="absolute top-2 right-2 bg-amber-500 text-white text-[10px] sm:text-xs px-2 py-1 rounded-full shadow-lg font-semibold flex items-center gap-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    Actif
                  </div>
                )}
                
                {/* Input file caché */}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  ref={(el) => (fileInputs.current[v.id] = el)}
                  onChange={(e) => handleFileChange(v.id, e)}
                />
              </div>

              <div className="flex-1 min-w-0 w-full">
                {editingId === v.id ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 min-w-0 w-full">
                    <input className="w-full border rounded-md px-2 py-1.5 text-sm h-9" value={editForm[v.id]?.make || ''} onChange={(e)=>setEditForm({ ...editForm, [v.id]: { ...editForm[v.id], make: e.target.value } })} placeholder="Marque" />
                    <input className="w-full border rounded-md px-2 py-1.5 text-sm h-9" value={editForm[v.id]?.model || ''} onChange={(e)=>setEditForm({ ...editForm, [v.id]: { ...editForm[v.id], model: e.target.value } })} placeholder="Modèle" />
                    <select className="w-full border rounded-md px-2 py-1.5 text-sm h-9" value={editForm[v.id]?.year ?? ''} onChange={(e)=>setEditForm({ ...editForm, [v.id]: { ...editForm[v.id], year: parseInt(e.target.value || '0', 10) } })}>
                      <option value="">Année</option>
                      {yearOptions.map((year) => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                    <select className="w-full border rounded-md px-2 py-1.5 text-sm h-9" value={editForm[v.id]?.color || ''} onChange={(e)=>setEditForm({ ...editForm, [v.id]: { ...editForm[v.id], color: e.target.value } })}>
                      <option value="">Couleur</option>
                      {colorOptions.map((color) => (
                        <option key={color} value={color}>{color}</option>
                      ))}
                    </select>
                    <select className="w-full border rounded-md px-2 py-1.5 text-sm h-9" value={editForm[v.id]?.seats ?? ''} onChange={(e)=>setEditForm({ ...editForm, [v.id]: { ...editForm[v.id], seats: parseInt(e.target.value || '0', 10) } })}>
                      <option value="">Places</option>
                      {seatOptions.map((seats) => (
                        <option key={seats} value={seats}>{seats}</option>
                      ))}
                    </select>
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

              {/* Actions du véhicule */}
              <div className={`${editingId === v.id ? 'w-full justify-end mt-2' : 'self-stretch sm:self-auto'} flex items-center gap-2 flex-wrap` }>
                {editingId === v.id ? (
                  <>
                    <Button type="button" onClick={() => saveEdit(v.id)} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white whitespace-nowrap w-full sm:w-auto">
                      <CheckCircle size={16} />
                      Enregistrer
                    </Button>
                    <Button type="button" variant="outline" onClick={cancelEdit} className="whitespace-nowrap w-full sm:w-auto">
                      Annuler
                    </Button>
                  </>
                ) : (
                  <>
                    <Button type="button" variant="outline" onClick={() => startEdit(v)} className="flex items-center gap-2 whitespace-nowrap w-full sm:w-auto">
                      <Edit size={16} />
                      Modifier
                    </Button>
                    <Button type="button" variant="outline" onClick={() => handleDelete(v.id)} className="flex items-center gap-2 border-red-300 text-red-600 hover:bg-red-50 whitespace-nowrap w-full sm:w-auto">
                      <Trash2 size={16} />
                      Supprimer
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};


