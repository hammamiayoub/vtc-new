import React, { useState } from 'react';
import { 
  X, 
  User, 
  Mail, 
  Phone, 
  Car, 
  CreditCard, 
  Trash2, 
  AlertTriangle,
  Edit3,
  Save,
  Calendar,
  Camera
} from 'lucide-react';
import { Button } from './ui/Button';
import { ImageUpload } from './ui/ImageUpload';
import { supabase } from '../lib/supabase';
import { Driver, Client } from '../types';
import { uploadProfileImage, deleteProfileImage } from '../utils/imageUpload';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: Driver | Client;
  userType: 'driver' | 'client';
  onProfileDeleted: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  user,
  userType,
  onProfileDeleted
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [currentPhotoUrl, setCurrentPhotoUrl] = useState(user.profilePhotoUrl);
  const driver = userType === 'driver' ? user as Driver : null;
  
  const [editData, setEditData] = useState({
    firstName: user.firstName,
    lastName: user.lastName,
    phone: 'phone' in user ? user.phone : '',
    city: 'city' in user ? user.city || '' : '',
    email: user.email
  });
  const [editVehicleData, setEditVehicleData] = useState(
    driver?.vehicleInfo ? {
      make: driver.vehicleInfo.make,
      model: driver.vehicleInfo.model,
      year: driver.vehicleInfo.year,
      color: driver.vehicleInfo.color,
      licensePlate: driver.vehicleInfo.licensePlate,
      seats: driver.vehicleInfo.seats,
      type: driver.vehicleInfo.type
    } : {
      make: '',
      model: '',
      year: new Date().getFullYear(),
      color: '',
      licensePlate: '',
      seats: 4,
      type: 'sedan' as const
    }
  );
  const [isSaving, setIsSaving] = useState(false);

  // Options pour les types de véhicules
  const vehicleTypeOptions = [
    { value: 'sedan', label: 'Berline' },
    { value: 'pickup', label: 'Pickup' },
    { value: 'van', label: 'Van' },
    { value: 'minibus', label: 'Minibus' },
    { value: 'bus', label: 'Bus' },
    { value: 'truck', label: 'Camion' },
    { value: 'utility', label: 'Utilitaire' },
    { value: 'limousine', label: 'Limousine' }
  ];

  // Options pour les sièges
  const seatsOptions = [
    { value: 2, label: '2 places' },
    { value: 4, label: '4 places' },
    { value: 5, label: '5 places' },
    { value: 7, label: '7 places' },
    { value: 8, label: '8 places' },
    { value: 12, label: '12 places' },
    { value: 16, label: '16 places' },
    { value: 20, label: '20 places' },
    { value: 30, label: '30 places' },
    { value: 50, label: '50 places' }
  ];

  // Options pour les années
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 25 }, (_, i) => ({
    value: currentYear - i,
    label: (currentYear - i).toString()
  }));

  if (!isOpen) return null;

  const handlePhotoUpload = async (file: File) => {
    setUploadingPhoto(true);
    try {
      const newPhotoUrl = await uploadProfileImage(file, user.id, userType);
      setCurrentPhotoUrl(newPhotoUrl);
    } catch (error) {
      console.error('Erreur upload photo:', error);
      alert('Erreur lors de l\'upload de la photo');
    } finally {
      setUploadingPhoto(false);
    }
  };
  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const tableName = userType === 'driver' ? 'drivers' : 'clients';
      
      // Préparer les données à mettre à jour
      const updateData: any = {
        first_name: editData.firstName,
        last_name: editData.lastName,
        phone: editData.phone,
        city: editData.city,
        email: editData.email
      };

      // Si c'est un chauffeur, inclure les informations véhicule
      if (userType === 'driver') {
        updateData.vehicle_info = editVehicleData;
      }

      const { error } = await supabase
        .from(tableName)
        .update(updateData)
        .eq('id', user.id);

      if (error) {
        console.error('Erreur lors de la mise à jour:', error);
        alert('Erreur lors de la mise à jour du profil');
        return;
      }

      // Mettre à jour l'email dans Supabase Auth si nécessaire
      if (editData.email !== user.email) {
        const { error: authError } = await supabase.auth.updateUser({
          email: editData.email
        });
        
        if (authError) {
          console.error('Erreur lors de la mise à jour de l\'email:', authError);
        }
      }

      setIsEditing(false);
      alert('Profil mis à jour avec succès');
      window.location.reload(); // Recharger pour voir les changements
    } catch (error) {
      console.error('Erreur:', error);
      alert('Une erreur est survenue');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteProfile = async () => {
    setIsDeleting(true);
    try {
      // Supprimer la photo de profil si elle existe
      if (currentPhotoUrl) {
        try {
          await deleteProfileImage(currentPhotoUrl, user.id, userType);
        } catch (error) {
          console.error('Erreur suppression photo:', error);
        }
      }

      // Supprimer d'abord les données liées
      if (userType === 'driver') {
        // Supprimer les disponibilités
        await supabase
          .from('driver_availability')
          .delete()
          .eq('driver_id', user.id);
        
        // Mettre à jour les réservations (retirer l'assignation du chauffeur)
        await supabase
          .from('bookings')
          .update({ driver_id: null, status: 'pending' })
          .eq('driver_id', user.id);
      } else {
        // Supprimer les réservations du client
        await supabase
          .from('bookings')
          .delete()
          .eq('client_id', user.id);
      }

      // Marquer le profil comme supprimé au lieu de le supprimer complètement
      const tableName = userType === 'driver' ? 'drivers' : 'clients';
      const { error: profileError } = await supabase
        .from(tableName)
        .update({ 
          status: 'deleted',
          deleted_at: new Date().toISOString(),
          email: `deleted_${Date.now()}_${user.email}` // Modifier l'email pour éviter les conflits
        })
        .eq('id', user.id);

      if (profileError) {
        console.error('Erreur lors de la suppression du profil:', profileError);
        alert('Erreur lors de la suppression du profil');
        return;
      }

      // Supprimer l'utilisateur Auth pour permettre la réinscription
      try {
        const { error: authError } = await supabase.auth.admin.deleteUser(user.id);
        if (authError) {
          console.warn('⚠️ Impossible de supprimer le compte Auth:', authError);
          // Continuer même si la suppression Auth échoue
        } else {
          console.log('✅ Compte Auth supprimé avec succès');
        }
      } catch (error) {
        console.warn('⚠️ Erreur lors de la suppression du compte Auth:', error);
        // Continuer même si la suppression Auth échoue
      }

      // Déconnecter l'utilisateur
      await supabase.auth.signOut();
      
      alert('Votre profil a été supprimé avec succès. Vous avez été déconnecté.');
      onProfileDeleted();
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      alert('Une erreur est survenue lors de la suppression');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                {currentPhotoUrl ? (
                  <img
                    src={currentPhotoUrl}
                    alt="Photo de profil"
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                    <User size={24} className="text-gray-700" />
                  </div>
                )}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Mon profil</h2>
                <p className="text-gray-600">
                  {userType === 'driver' ? 'Compte chauffeur' : 'Compte client'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-2 text-gray-600 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                  title="Modifier le profil"
                >
                  <Edit3 size={20} />
                </button>
              )}
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X size={24} />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Photo de profil */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Camera className="w-5 h-5 text-purple-600" />
              Photo de profil
            </h3>
            <ImageUpload
              currentImageUrl={currentPhotoUrl}
              onImageUpload={handlePhotoUpload}
              loading={uploadingPhoto}
              className="mb-4"
            />
          </div>

          {/* Informations personnelles */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-blue-600" />
              Informations personnelles
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <label className="block text-sm text-gray-600 mb-1">Prénom</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editData.firstName}
                    onChange={(e) => setEditData({ ...editData, firstName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <p className="font-semibold text-gray-900">{user.firstName}</p>
                )}
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <label className="block text-sm text-gray-600 mb-1">Nom</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editData.lastName}
                    onChange={(e) => setEditData({ ...editData, lastName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <p className="font-semibold text-gray-900">{user.lastName}</p>
                )}
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <label className="block text-sm text-gray-600 mb-1">Email</label>
                {isEditing ? (
                  <input
                    type="email"
                    value={editData.email}
                    onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <p className="font-semibold text-gray-900">{user.email}</p>
                )}
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <label className="block text-sm text-gray-600 mb-1">Téléphone</label>
                {isEditing ? (
                  <input
                    type="tel"
                    value={editData.phone}
                    onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <p className="font-semibold text-gray-900">
                    {'phone' in user ? user.phone || 'Non renseigné' : 'Non renseigné'}
                  </p>
                )}
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <label className="block text-sm text-gray-600 mb-1">Ville de résidence</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editData.city}
                    onChange={(e) => setEditData({ ...editData, city: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ville de résidence"
                  />
                ) : (
                  <p className="font-semibold text-gray-900">
                    {'city' in user ? user.city || 'Non renseigné' : 'Non renseigné'}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Informations spécifiques au chauffeur */}
          {driver && (
            <>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-green-600" />
                  Informations chauffeur
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <label className="block text-sm text-gray-600 mb-1">Statut</label>
                    <p className={`font-semibold ${
                      driver.status === 'active' ? 'text-green-600' : 
                      driver.status === 'pending' ? 'text-orange-600' : 'text-red-600'
                    }`}>
                      {driver.status === 'active' ? 'Actif' : 
                       driver.status === 'pending' ? 'En attente' : 'Suspendu'}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <label className="block text-sm text-gray-600 mb-1">Permis de conduire</label>
                    <p className="font-semibold text-gray-900">
                      {driver.licenseNumber || 'Non renseigné'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Informations véhicule */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Car className="w-5 h-5 text-purple-600" />
                  Véhicule
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <label className="block text-sm text-gray-600 mb-1">Marque</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editVehicleData.make}
                        onChange={(e) => setEditVehicleData({ ...editVehicleData, make: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Marque du véhicule"
                      />
                    ) : (
                      <p className="font-semibold text-gray-900">
                        {driver?.vehicleInfo?.make || 'Non renseigné'}
                      </p>
                    )}
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <label className="block text-sm text-gray-600 mb-1">Modèle</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editVehicleData.model}
                        onChange={(e) => setEditVehicleData({ ...editVehicleData, model: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Modèle du véhicule"
                      />
                    ) : (
                      <p className="font-semibold text-gray-900">
                        {driver?.vehicleInfo?.model || 'Non renseigné'}
                      </p>
                    )}
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <label className="block text-sm text-gray-600 mb-1">Année</label>
                    {isEditing ? (
                      <select
                        value={editVehicleData.year}
                        onChange={(e) => setEditVehicleData({ ...editVehicleData, year: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {yearOptions.map((year) => (
                          <option key={year.value} value={year.value}>
                            {year.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <p className="font-semibold text-gray-900">
                        {driver?.vehicleInfo?.year || 'Non renseigné'}
                      </p>
                    )}
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <label className="block text-sm text-gray-600 mb-1">Couleur</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editVehicleData.color}
                        onChange={(e) => setEditVehicleData({ ...editVehicleData, color: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Couleur du véhicule"
                      />
                    ) : (
                      <p className="font-semibold text-gray-900">
                        {driver?.vehicleInfo?.color || 'Non renseigné'}
                      </p>
                    )}
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <label className="block text-sm text-gray-600 mb-1">Plaque d'immatriculation</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editVehicleData.licensePlate}
                        onChange={(e) => setEditVehicleData({ ...editVehicleData, licensePlate: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Plaque d'immatriculation"
                      />
                    ) : (
                      <p className="font-semibold text-gray-900">
                        {driver?.vehicleInfo?.licensePlate || 'Non renseigné'}
                      </p>
                    )}
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <label className="block text-sm text-gray-600 mb-1">Nombre de places</label>
                    {isEditing ? (
                      <select
                        value={editVehicleData.seats}
                        onChange={(e) => setEditVehicleData({ ...editVehicleData, seats: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {seatsOptions.map((seat) => (
                          <option key={seat.value} value={seat.value}>
                            {seat.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <p className="font-semibold text-gray-900">
                        {driver?.vehicleInfo?.seats ? `${driver.vehicleInfo.seats} places` : 'Non renseigné'}
                      </p>
                    )}
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <label className="block text-sm text-gray-600 mb-1">Type de véhicule</label>
                    {isEditing ? (
                      <select
                        value={editVehicleData.type}
                        onChange={(e) => setEditVehicleData({ ...editVehicleData, type: e.target.value as any })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {vehicleTypeOptions.map((type) => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <p className="font-semibold text-gray-900">
                        {driver?.vehicleInfo?.type ? 
                          vehicleTypeOptions.find(opt => opt.value === driver.vehicleInfo.type)?.label || 'Non renseigné'
                          : 'Non renseigné'
                        }
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Informations du compte */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-gray-600" />
              Informations du compte
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <label className="block text-sm text-gray-600 mb-1">Membre depuis</label>
                <p className="font-semibold text-gray-900">
                  {new Date(user.createdAt).toLocaleDateString('fr-FR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <label className="block text-sm text-gray-600 mb-1">Dernière mise à jour</label>
                <p className="font-semibold text-gray-900">
                  {new Date(user.updatedAt).toLocaleDateString('fr-FR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 border-t border-gray-200">
          {isEditing ? (
            <div className="flex gap-3">
              <Button
                onClick={handleSaveProfile}
                loading={isSaving}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
              >
                <Save size={16} />
                {isSaving ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
              <Button
                onClick={() => {
                  setIsEditing(false);
                  setEditData({
                    firstName: user.firstName,
                    lastName: user.lastName,
                    phone: 'phone' in user ? user.phone : '',
                    city: 'city' in user ? user.city || '' : '',
                    email: user.email
                  });
                  setEditVehicleData(
                    driver?.vehicleInfo ? {
                      make: driver.vehicleInfo.make,
                      model: driver.vehicleInfo.model,
                      year: driver.vehicleInfo.year,
                      color: driver.vehicleInfo.color,
                      licensePlate: driver.vehicleInfo.licensePlate,
                      seats: driver.vehicleInfo.seats,
                      type: driver.vehicleInfo.type
                    } : {
                      make: '',
                      model: '',
                      year: new Date().getFullYear(),
                      color: '',
                      licensePlate: '',
                      seats: 4,
                      type: 'sedan' as const
                    }
                  );
                }}
                variant="outline"
              >
                Annuler
              </Button>
            </div>
          ) : (
            <div className="flex justify-between items-center">
              <Button
                onClick={() => setShowDeleteConfirm(true)}
                variant="outline"
                className="flex items-center gap-2 border-red-300 text-red-600 hover:bg-red-50"
              >
                <Trash2 size={16} />
                Supprimer mon compte
              </Button>
            </div>
          )}
        </div>

        {/* Modal de confirmation de suppression */}
        {showDeleteConfirm && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertTriangle size={24} className="text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Supprimer le compte</h3>
                  <p className="text-gray-600">Cette action est irréversible</p>
                </div>
              </div>
              
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <p className="text-red-800 text-sm">
                  <strong>Attention :</strong> La suppression de votre compte entraînera :
                </p>
                <ul className="text-red-700 text-sm mt-2 space-y-1">
                  <li>• Suppression définitive de toutes vos données</li>
                  {userType === 'driver' ? (
                    <>
                      <li>• Annulation de vos disponibilités</li>
                      <li>• Désassignation de vos courses en cours</li>
                    </>
                  ) : (
                    <li>• Annulation de toutes vos réservations</li>
                  )}
                  <li>• Impossibilité de récupérer votre compte</li>
                </ul>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handleDeleteProfile}
                  loading={isDeleting}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                >
                  {isDeleting ? 'Suppression...' : 'Confirmer la suppression'}
                </Button>
                <Button
                  onClick={() => setShowDeleteConfirm(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Annuler
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};