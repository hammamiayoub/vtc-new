import { supabase } from '../lib/supabase';

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