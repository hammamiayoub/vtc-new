import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Phone, CreditCard, Save, CheckCircle, MapPin } from 'lucide-react';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { Button } from './ui/Button';
import { CityInput } from './ui/CityInput';
import { driverProfileSchema } from '../utils/validation';
import { DriverProfileData } from '../types';
import { supabase } from '../lib/supabase';

interface DriverProfileFormProps {
  driverId: string;
  onProfileComplete: () => void;
}

export const DriverProfileForm: React.FC<DriverProfileFormProps> = ({ 
  driverId, 
  onProfileComplete 
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [cityValue, setCityValue] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    setValue,
    watch
  } = useForm<DriverProfileData>({
    resolver: zodResolver(driverProfileSchema),
    mode: 'onChange',
    defaultValues: {}
  });

  // Synchroniser la ville avec le formulaire
  React.useEffect(() => {
    setValue('city', cityValue);
  }, [cityValue, setValue]);
  // anciennes options liées au véhicule supprimées

  const onSubmit = async (data: DriverProfileData) => {
    setIsSubmitting(true);
    
    try {
      const { error } = await supabase
        .from('drivers')
        .update({
          phone: data.phone,
          city: data.city,
          license_number: data.licenseNumber,
          status: 'pending'
        })
        .eq('id', driverId);

      if (error) {
        console.error('Erreur lors de la mise à jour du profil:', error);
        return;
      }

      setSubmitSuccess(true);
      setTimeout(() => {
        onProfileComplete();
      }, 2000);
      
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitSuccess) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-8 text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle size={40} className="text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Profil complété !
        </h2>
        <p className="text-gray-600 mb-6">
          Vos informations ont été enregistrées avec succès. 
          Votre compte est maintenant actif et vous pouvez commencer à recevoir des courses.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Complétez votre profil
        </h2>
        <p className="text-gray-600">Ajoutez vos informations personnelles.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Informations personnelles */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Phone className="w-5 h-5 text-blue-600" />
            Informations personnelles
          </h3>
          <div className="grid gap-6">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Phone className="h-5 w-5 text-gray-400" />
              </div>
              <input
                {...register('phone')}
                type="tel"
                placeholder="Numéro de téléphone (8 chiffres)"
                className={`block w-full pl-10 pr-3 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                  errors.phone ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.phone && (
                <p className="mt-2 text-sm text-red-600">{errors.phone.message}</p>
              )}
            </div>

            <CityInput
              value={cityValue}
              onChange={setCityValue}
              placeholder="Ville de résidence"
              error={errors.city?.message}
              required
            />
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <CreditCard className="h-5 w-5 text-gray-400" />
              </div>
              <input
                {...register('licenseNumber')}
                type="text"
                placeholder="Numéro de permis de conduire"
                className={`block w-full pl-10 pr-3 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                  errors.licenseNumber ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.licenseNumber && (
                <p className="mt-2 text-sm text-red-600">{errors.licenseNumber.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Section informations véhicule supprimée (gérée dans Mes véhicules) */}

        <div className="pt-6 border-t border-gray-200">
          <Button
            type="submit"
            loading={isSubmitting}
            disabled={!isValid || isSubmitting}
            className={`w-full py-4 text-lg flex items-center justify-center gap-2 ${(!isValid || isSubmitting) ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-black text-white hover:bg-gray-900'}`}
          >
            <Save size={20} />
            {isSubmitting ? 'Enregistrement...' : 'Enregistrer le profil'}
          </Button>
        </div>
      </form>
    </div>
  );
};