import { supabase } from '../lib/supabase';

export const uploadVehicleImage = async (
  file: File, 
  driverId: string
): Promise<string> => {
  try {
    console.log('🚗 Debug upload véhicule - driverId:', driverId);
    console.log('🚗 Debug upload véhicule - file size:', file.size);
    console.log('🚗 Debug upload véhicule - file type:', file.type);

    // Générer un nom de fichier unique pour le véhicule
    const fileExt = file.name.split('.').pop();
    const fileName = `vehicle-${driverId}-${Date.now()}.${fileExt}`;
    const filePath = `vehicles/${fileName}`;
    
    console.log('🚗 Debug upload véhicule - filePath:', filePath);

    // Upload vers Supabase Storage dans le bucket vehicle-photos
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('vehicle-photos')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('🚨 Erreur upload véhicule détaillée:', uploadError);
      console.error('🚨 Message:', uploadError.message);
      console.error('🚨 Détails:', uploadError);
      throw new Error('Erreur lors de l\'upload de l\'image du véhicule');
    }

    console.log('✅ Upload véhicule réussi:', uploadData);

    // Obtenir l'URL publique
    const { data: urlData } = supabase.storage
      .from('vehicle-photos')
      .getPublicUrl(filePath);

    if (!urlData.publicUrl) {
      throw new Error('Impossible d\'obtenir l\'URL de l\'image du véhicule');
    }

    console.log('✅ URL publique véhicule:', urlData.publicUrl);

    // Mettre à jour la base de données avec l'URL de la photo du véhicule
    const { data: driverData, error: fetchError } = await supabase
      .from('drivers')
      .select('vehicle_info')
      .eq('id', driverId)
      .single();

    if (fetchError) {
      console.error('Erreur récupération driver:', fetchError);
      throw new Error('Erreur lors de la récupération des données du chauffeur');
    }

    const updatedVehicleInfo = {
      ...driverData.vehicle_info,
      photoUrl: urlData.publicUrl
    };

    const { error: updateError } = await supabase
      .from('drivers')
      .update({ vehicle_info: updatedVehicleInfo })
      .eq('id', driverId);

    if (updateError) {
      console.error('Erreur mise à jour DB véhicule:', updateError);
      throw new Error('Erreur lors de la mise à jour des informations du véhicule');
    }

    console.log('✅ Véhicule mis à jour avec succès');
    return urlData.publicUrl;
  } catch (error) {
    console.error('Erreur uploadVehicleImage:', error);
    throw error;
  }
};

export const deleteVehicleImage = async (
  imageUrl: string, 
  driverId: string
): Promise<void> => {
  try {
    // Extraire le chemin du fichier depuis l'URL
    const pathSegments = imageUrl.split('/').slice(imageUrl.indexOf('vehicle-photos') + 1);
    const filePath = pathSegments.join('/');

    // Supprimer de Supabase Storage
    const { error: deleteError } = await supabase.storage
      .from('vehicle-photos')
      .remove([filePath]);

    if (deleteError) {
      console.error('Erreur suppression storage véhicule:', deleteError);
    }

    // Mettre à jour la base de données
    const { data: driverData, error: fetchError } = await supabase
      .from('drivers')
      .select('vehicle_info')
      .eq('id', driverId)
      .single();

    if (fetchError) {
      console.error('Erreur récupération driver:', fetchError);
      throw new Error('Erreur lors de la récupération des données du chauffeur');
    }

    const updatedVehicleInfo = {
      ...driverData.vehicle_info,
      photoUrl: null
    };

    const { error: updateError } = await supabase
      .from('drivers')
      .update({ vehicle_info: updatedVehicleInfo })
      .eq('id', driverId);

    if (updateError) {
      console.error('Erreur mise à jour DB véhicule:', updateError);
      throw new Error('Erreur lors de la mise à jour des informations du véhicule');
    }
  } catch (error) {
    console.error('Erreur deleteVehicleImage:', error);
    throw error;
  }
};

// Upload photo for a specific vehicle (vehicles table)
export const uploadVehiclePhotoForVehicle = async (
  file: File,
  vehicleId: string
): Promise<string> => {
  // Generate unique filename and upload to vehicle-photos bucket
  const fileExt = file.name.split('.').pop();
  const fileName = `vehicle-${vehicleId}-${Date.now()}.${fileExt}`;
  const filePath = `vehicles/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('vehicle-photos')
    .upload(filePath, file, { cacheControl: '3600', upsert: false });
  if (uploadError) throw uploadError;

  const { data: urlData } = supabase.storage
    .from('vehicle-photos')
    .getPublicUrl(filePath);
  if (!urlData.publicUrl) throw new Error("Impossible d'obtenir l'URL de l'image du véhicule");

  const { error: updateErr } = await supabase
    .from('vehicles')
    .update({ photo_url: urlData.publicUrl })
    .eq('id', vehicleId);
  if (updateErr) throw updateErr;

  return urlData.publicUrl;
};

export const deleteVehiclePhotoForVehicle = async (
  imageUrl: string,
  vehicleId: string
): Promise<void> => {
  // Extract storage path
  const idx = imageUrl.indexOf('vehicle-photos');
  if (idx === -1) return;
  const path = imageUrl.substring(idx + 'vehicle-photos'.length + 1); // after bucket/

  await supabase.storage
    .from('vehicle-photos')
    .remove([path]);

  const { error } = await supabase
    .from('vehicles')
    .update({ photo_url: null })
    .eq('id', vehicleId);
  if (error) throw error;
};

export const uploadProfileImage = async (
  file: File, 
  userId: string, 
  userType: 'driver' | 'client'
): Promise<string> => {
  try {
    console.log('🔍 Debug upload - userId:', userId);
    console.log('🔍 Debug upload - userType:', userType);
    
    // Générer un nom de fichier unique
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}-${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;
    
    console.log('🔍 Debug upload - filePath:', filePath);
    console.log('🔍 Debug upload - file size:', file.size);
    console.log('🔍 Debug upload - file type:', file.type);

    // Upload vers Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('profile-photos')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('🚨 Erreur upload détaillée:', uploadError);
      console.error('🚨 Message:', uploadError.message);
      console.error('🚨 Détails:', uploadError);
      throw new Error('Erreur lors de l\'upload de l\'image');
    }

    console.log('✅ Upload réussi:', uploadData);

    // Obtenir l'URL publique
    const { data: urlData } = supabase.storage
      .from('profile-photos')
      .getPublicUrl(filePath);

    if (!urlData.publicUrl) {
      throw new Error('Impossible d\'obtenir l\'URL de l\'image');
    }

    console.log('✅ URL publique:', urlData.publicUrl);

    // Mettre à jour la base de données
    const tableName = userType === 'driver' ? 'drivers' : 'clients';
    const { error: updateError } = await supabase
      .from(tableName)
      .update({ profile_photo_url: urlData.publicUrl })
      .eq('id', userId);

    if (updateError) {
      console.error('Erreur mise à jour DB:', updateError);
      throw new Error('Erreur lors de la mise à jour du profil');
    }

    console.log('✅ Profil mis à jour avec succès');
    return urlData.publicUrl;
  } catch (error) {
    console.error('Erreur uploadProfileImage:', error);
    throw error;
  }
};

export const deleteProfileImage = async (
  imageUrl: string, 
  userId: string, 
  userType: 'driver' | 'client'
): Promise<void> => {
  try {
    // Extraire le chemin du fichier depuis l'URL
    const pathSegments = imageUrl.split('/').slice(imageUrl.indexOf('profile-photos') + 1);
    const filePath = pathSegments.join('/');

    // Supprimer de Supabase Storage
    const { error: deleteError } = await supabase.storage
      .from('profile-photos')
      .remove([filePath]);

    if (deleteError) {
      console.error('Erreur suppression storage:', deleteError);
    }

    // Mettre à jour la base de données
    const tableName = userType === 'driver' ? 'drivers' : 'clients';
    const { error: updateError } = await supabase
      .from(tableName)
      .update({ profile_photo_url: null })
      .eq('id', userId);

    if (updateError) {
      console.error('Erreur mise à jour DB:', updateError);
      throw new Error('Erreur lors de la mise à jour du profil');
    }
  } catch (error) {
    console.error('Erreur deleteProfileImage:', error);
    throw error;
  }
};