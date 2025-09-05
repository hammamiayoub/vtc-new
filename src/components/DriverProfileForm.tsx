import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Phone, CreditCard, Car, Save, CheckCircle } from 'lucide-react';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { Button } from './ui/Button';
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

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    setValue,
    watch
  } = useForm<DriverProfileData>({
    resolver: zodResolver(driverProfileSchema),
    mode: 'onChange',
    defaultValues: {
      vehicleInfo: {
        seats: 4,
        type: 'sedan'
      }
    }
  });

  const vehicleTypeOptions = [
    { value: 'sedan', label: 'Berline' },
    { value: 'suv', label: 'SUV' },
    { value: 'luxury', label: 'Véhicule de luxe' },
    { value: 'van', label: 'Monospace' }
  ];

  const seatsOptions = [
    { value: 2, label: '2 places' },
    { value: 4, label: '4 places' },
    { value: 5, label: '5 places' },
    { value: 7, label: '7 places' },
    { value: 8, label: '8 places' }
  ];

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 25 }, (_, i) => ({
    value: currentYear - i,
    label: (currentYear - i).toString()
  }));

  const onSubmit = async (data: DriverProfileData) => {
    setIsSubmitting(true);
    
    try {
      const { error } = await supabase
        .from('drivers')
        .update({
          phone: data.phone,
          license_number: data.licenseNumber,
          vehicle_info: data.vehicleInfo,
          status: 'pending'
        })
        .eq('id', driverId);

      if (error) {
        console.error('Erreur lors de la mise à jour du profil:', error);
        if (error.message.includes('déjà utilisé')) {
          alert(error.message);
        } else if (error.message.includes('duplicate key value')) {
          if (error.message.includes('phone')) {
            alert('Ce numéro de téléphone est déjà utilisé par un autre compte');
          } else {
            alert('Ces informations sont déjà utilisées par un autre compte');
          }
        } else {
          alert('Erreur lors de la mise à jour du profil');
        }
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
        <p className="text-gray-600">
          Ajoutez vos informations personnelles et les détails de votre véhicule
        </p>
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
                placeholder="Numéro de téléphone"
                className={`block w-full pl-10 pr-3 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                  errors.phone ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.phone && (
                <p className="mt-2 text-sm text-red-600">{errors.phone.message}</p>
              )}
            </div>

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

        {/* Informations véhicule */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Car className="w-5 h-5 text-blue-600" />
            Informations véhicule
          </h3>
          <div className="grid md:grid-cols-2 gap-6">
            <input
              {...register('vehicleInfo.make')}
              type="text"
              placeholder="Marque (ex: Toyota, BMW)"
              className={`block w-full px-3 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                errors.vehicleInfo?.make ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.vehicleInfo?.make && (
              <p className="mt-2 text-sm text-red-600">{errors.vehicleInfo.make.message}</p>
            )}

            <input
              {...register('vehicleInfo.model')}
              type="text"
              placeholder="Modèle (ex: Camry, X5)"
              className={`block w-full px-3 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                errors.vehicleInfo?.model ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.vehicleInfo?.model && (
              <p className="mt-2 text-sm text-red-600">{errors.vehicleInfo.model.message}</p>
            )}

            <div className="relative">
              <select
                {...register('vehicleInfo.year', { valueAsNumber: true })}
                className={`block w-full px-3 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all appearance-none ${
                  errors.vehicleInfo?.year ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Année</option>
                {yearOptions.map((year) => (
                  <option key={year.value} value={year.value}>
                    {year.label}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
            {errors.vehicleInfo?.year && (
              <p className="mt-2 text-sm text-red-600">{errors.vehicleInfo.year.message}</p>
            )}

            <input
              {...register('vehicleInfo.color')}
              type="text"
              placeholder="Couleur"
              className={`block w-full px-3 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                errors.vehicleInfo?.color ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.vehicleInfo?.color && (
              <p className="mt-2 text-sm text-red-600">{errors.vehicleInfo.color.message}</p>
            )}

            <input
              {...register('vehicleInfo.licensePlate')}
              type="text"
              placeholder="Plaque d'immatriculation"
              className={`block w-full px-3 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                errors.vehicleInfo?.licensePlate ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.vehicleInfo?.licensePlate && (
              <p className="mt-2 text-sm text-red-600">{errors.vehicleInfo.licensePlate.message}</p>
            )}

            <div className="relative">
              <select
                {...register('vehicleInfo.seats', { valueAsNumber: true })}
                className={`block w-full px-3 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all appearance-none ${
                  errors.vehicleInfo?.seats ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                {seatsOptions.map((seat) => (
                  <option key={seat.value} value={seat.value}>
                    {seat.label}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
            {errors.vehicleInfo?.seats && (
              <p className="mt-2 text-sm text-red-600">{errors.vehicleInfo.seats.message}</p>
            )}

            <div className="relative">
              <select
                {...register('vehicleInfo.type')}
                className={`block w-full px-3 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all appearance-none ${
                  errors.vehicleInfo?.type ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                {vehicleTypeOptions.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
            {errors.vehicleInfo?.type && (
              <p className="mt-2 text-sm text-red-600">{errors.vehicleInfo.type.message}</p>
            )}
          </div>
        </div>

        <div className="pt-6 border-t border-gray-200">
          <Button
            type="submit"
            loading={isSubmitting}
            disabled={!isValid || isSubmitting}
            className="w-full py-4 text-lg flex items-center justify-center gap-2"
          >
            <Save size={20} />
            {isSubmitting ? 'Enregistrement...' : 'Enregistrer le profil'}
          </Button>
        </div>
      </form>
    </div>
  );
};