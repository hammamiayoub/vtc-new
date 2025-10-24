import React, { useState } from 'react';
import { 
  X, 
  User, 
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
import { CityInput } from './ui/CityInput';
import { supabase } from '../lib/supabase';
import { Driver, Client } from '../types';
import { uploadProfileImage, deleteProfileImage } from '../utils/imageUpload';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: Driver | Client;
  userType: 'driver' | 'client';
  onProfileDeleted: () => void;
  onProfileUpdated?: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  user,
  userType,
  onProfileDeleted,
  onProfileUpdated
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
  const [isSaving, setIsSaving] = useState(false);

  // Ancien bloc véhicule supprimé (gestion multi-véhicules ailleurs)

  // Anciennes options de véhicule retirées

  // Anciennes options de sièges retirées

  // Anciennes options d'années retirées

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
      
      // Log pour déboguer
      console.log('💾 Sauvegarde du profil:', {
        tableName,
        userId: user.id,
        cityValue: editData.city,
        editData
      });
      
      // Préparer les données à mettre à jour (email non modifiable ici)
      const updateData: {
        first_name: string;
        last_name: string;
        phone: string;
        city: string;
      } = {
        first_name: editData.firstName,
        last_name: editData.lastName,
        phone: editData.phone || '',
        city: editData.city || ''
      };

      console.log('📝 Données à mettre à jour:', updateData);

      const { error } = await supabase
        .from(tableName)
        .update(updateData)
        .eq('id', user.id);

      if (error) {
        console.error('❌ Erreur lors de la mise à jour:', error);
        alert('Erreur lors de la mise à jour du profil');
        return;
      }

      console.log('✅ Profil mis à jour avec succès');

      // Email non modifiable dans ce modal

      setIsEditing(false);
      alert('Profil mis à jour avec succès');
      
      // Rafraîchir les données utilisateur via callback au lieu de recharger la page
      if (onProfileUpdated) {
        onProfileUpdated();
      }
      
      // Fermer le modal après la mise à jour
      onClose();
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
                <p className="font-semibold text-gray-900">{user.email}</p>
                {isEditing && (
                  <p className="text-xs text-gray-500 mt-1">Pour modifier l'adresse email, contactez le support.</p>
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
                  <CityInput
                    value={editData.city}
                    onChange={(value) => setEditData({ ...editData, city: value })}
                    placeholder="Ville de résidence"
                    className="w-full"
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

              {/* Section véhicule supprimée (gestion multi-véhicules) */}
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