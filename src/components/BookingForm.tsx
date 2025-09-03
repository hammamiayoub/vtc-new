import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  MapPin, 
  Navigation, 
  Clock, 
  Calculator, 
  Car, 
  MessageSquare,
  ArrowRight,
  CheckCircle,
  User
} from 'lucide-react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { bookingSchema, calculateDistance, calculatePrice } from '../utils/validation';
import { BookingFormData, Driver } from '../types';
import { supabase } from '../lib/supabase';

interface BookingFormProps {
  clientId: string;
  onBookingSuccess: () => void;
}

export const BookingForm: React.FC<BookingFormProps> = ({ clientId, onBookingSuccess }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableDrivers, setAvailableDrivers] = useState<Driver[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<string | null>(null);
  const [estimatedPrice, setEstimatedPrice] = useState<number | null>(null);
  const [estimatedDistance, setEstimatedDistance] = useState<number | null>(null);
  const [showDrivers, setShowDrivers] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isValid }
  } = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
    mode: 'onChange'
  });

  const watchPickup = watch('pickupAddress');
  const watchDestination = watch('destinationAddress');

  // Simuler le calcul de distance et prix (en production, utiliser une API de géocodage)
  React.useEffect(() => {
    if (watchPickup && watchDestination && watchPickup.length > 5 && watchDestination.length > 5) {
      // Simulation d'une distance basée sur la longueur des adresses (à remplacer par une vraie API)
      const simulatedDistance = Math.max(5, Math.min(50, (watchPickup.length + watchDestination.length) / 4));
      const price = calculatePrice(simulatedDistance);
      
      setEstimatedDistance(simulatedDistance);
      setEstimatedPrice(price);
    } else {
      setEstimatedDistance(null);
      setEstimatedPrice(null);
    }
  }, [watchPickup, watchDestination]);

  const searchAvailableDrivers = async () => {
    try {
      const { data, error } = await supabase
        .from('drivers')
        .select('*')
        .eq('status', 'active');

      if (error) {
        console.error('Erreur lors de la recherche de chauffeurs:', error);
        return;
      }

      const formattedDrivers = data.map(driver => ({
        id: driver.id,
        firstName: driver.first_name,
        lastName: driver.last_name,
        email: driver.email,
        phone: driver.phone,
        licenseNumber: driver.license_number,
        vehicleInfo: driver.vehicle_info,
        status: driver.status,
        createdAt: driver.created_at,
        updatedAt: driver.updated_at
      }));

      setAvailableDrivers(formattedDrivers);
      setShowDrivers(true);
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const onSubmit = async (data: BookingFormData) => {
    if (!estimatedDistance || !estimatedPrice) {
      alert('Veuillez saisir des adresses valides pour calculer le prix');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const bookingData = {
        client_id: clientId,
        pickup_address: data.pickupAddress,
        destination_address: data.destinationAddress,
        distance_km: estimatedDistance,
        price_tnd: estimatedPrice,
        scheduled_time: data.scheduledTime,
        notes: data.notes || null,
        status: 'pending'
      };

      const { data: booking, error } = await supabase
        .from('bookings')
        .insert(bookingData)
        .select()
        .single();

      if (error) {
        console.error('Erreur lors de la création de la réservation:', error);
        return;
      }

      onBookingSuccess();
      
    } catch (error) {
      console.error('Erreur lors de la réservation:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getMinDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 30); // Minimum 30 minutes à l'avance
    return now.toISOString().slice(0, 16);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm p-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Réserver une course
          </h2>
          <p className="text-gray-600">
            Renseignez les détails de votre trajet
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* Adresses */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MapPin className="h-5 w-5 text-green-600" />
              </div>
              <input
                {...register('pickupAddress')}
                type="text"
                placeholder="Adresse de départ (ex: Avenue Habib Bourguiba, Tunis)"
                className={`block w-full pl-10 pr-3 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all ${
                  errors.pickupAddress ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.pickupAddress && (
                <p className="mt-2 text-sm text-red-600">{errors.pickupAddress.message}</p>
              )}
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Navigation className="h-5 w-5 text-red-600" />
              </div>
              <input
                {...register('destinationAddress')}
                type="text"
                placeholder="Adresse d'arrivée (ex: Aéroport Tunis-Carthage)"
                className={`block w-full pl-10 pr-3 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all ${
                  errors.destinationAddress ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.destinationAddress && (
                <p className="mt-2 text-sm text-red-600">{errors.destinationAddress.message}</p>
              )}
            </div>
          </div>

          {/* Estimation de prix */}
          {estimatedDistance && estimatedPrice && (
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <Calculator className="w-6 h-6 text-purple-600" />
                <h3 className="text-lg font-semibold text-purple-900">
                  Estimation du trajet
                </h3>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-white rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Distance estimée</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {estimatedDistance} km
                  </p>
                </div>
                <div className="bg-white rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Prix estimé</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {estimatedPrice} TND
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    2,5 TND par kilomètre
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Heure et notes */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <input
                {...register('scheduledTime')}
                type="datetime-local"
                min={getMinDateTime()}
                className={`block w-full pl-10 pr-3 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all ${
                  errors.scheduledTime ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.scheduledTime && (
                <p className="mt-2 text-sm text-red-600">{errors.scheduledTime.message}</p>
              )}
              <p className="mt-2 text-xs text-gray-500">
                Réservation minimum 30 minutes à l'avance
              </p>
            </div>

            <div className="relative">
              <div className="absolute top-3 left-3 pointer-events-none">
                <MessageSquare className="h-5 w-5 text-gray-400" />
              </div>
              <textarea
                {...register('notes')}
                placeholder="Notes ou instructions spéciales (optionnel)"
                rows={3}
                className={`block w-full pl-10 pr-3 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all resize-none ${
                  errors.notes ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.notes && (
                <p className="mt-2 text-sm text-red-600">{errors.notes.message}</p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4">
            {!showDrivers ? (
              <Button
                type="button"
                onClick={searchAvailableDrivers}
                disabled={!isValid || !estimatedPrice}
                className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700"
              >
                <Car size={20} />
                Rechercher des chauffeurs disponibles
              </Button>
            ) : (
              <Button
                type="submit"
                loading={isSubmitting}
                disabled={!isValid || isSubmitting || !estimatedPrice}
                className="flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700"
              >
                <CheckCircle size={20} />
                {isSubmitting ? 'Réservation en cours...' : 'Confirmer la réservation'}
              </Button>
            )}
          </div>
        </form>

        {/* Liste des chauffeurs disponibles */}
        {showDrivers && (
          <div className="mt-8 border-t border-gray-200 pt-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">
              Chauffeurs disponibles ({availableDrivers.length})
            </h3>
            
            {availableDrivers.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-xl">
                <Car size={48} className="text-gray-400 mx-auto mb-4" />
                <h4 className="text-lg font-medium text-gray-900 mb-2">
                  Aucun chauffeur disponible
                </h4>
                <p className="text-gray-500">
                  Essayez de modifier l'heure de votre réservation ou réessayez plus tard.
                </p>
              </div>
            ) : (
              <div className="grid gap-4">
                {availableDrivers.map((driver) => (
                  <div 
                    key={driver.id}
                    className={`border rounded-xl p-6 cursor-pointer transition-all duration-200 ${
                      selectedDriver === driver.id
                        ? 'border-purple-500 bg-purple-50 shadow-md'
                        : 'border-gray-200 hover:border-purple-300 hover:shadow-sm'
                    }`}
                    onClick={() => setSelectedDriver(driver.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                          <User size={24} className="text-purple-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">
                            {driver.firstName} {driver.lastName}
                          </h4>
                          <p className="text-sm text-gray-600">
                            {driver.vehicleInfo ? 
                              `${driver.vehicleInfo.make} ${driver.vehicleInfo.model} (${driver.vehicleInfo.color})` :
                              'Véhicule non renseigné'
                            }
                          </p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="flex items-center gap-2 text-green-600 mb-1">
                          <CheckCircle size={16} />
                          <span className="text-sm font-medium">Disponible</span>
                        </div>
                        {driver.vehicleInfo && (
                          <p className="text-xs text-gray-500">
                            {driver.vehicleInfo.seats} places • {
                              driver.vehicleInfo.type === 'sedan' ? 'Berline' :
                              driver.vehicleInfo.type === 'suv' ? 'SUV' :
                              driver.vehicleInfo.type === 'luxury' ? 'Luxe' :
                              'Monospace'
                            }
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {selectedDriver === driver.id && (
                      <div className="mt-4 pt-4 border-t border-purple-200">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Prix du trajet:</span>
                          <span className="font-bold text-purple-600 text-lg">
                            {estimatedPrice} TND
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};