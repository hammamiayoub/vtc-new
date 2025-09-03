import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  MapPin, 
  Navigation, 
  Clock, 
  Calculator, 
  Car, 
  MessageSquare,
  CheckCircle,
  User,
  Loader2,
  AlertCircle,
  Target,
  Route
} from 'lucide-react';
import { Button } from './ui/Button';
import { bookingSchema } from '../utils/validation';
import { BookingFormData, Driver } from '../types';
import { supabase } from '../lib/supabase';
import { 
  geocodeAddress, 
  calculateDistance, 
  calculatePrice, 
  getCurrentPosition,
  popularAddresses,
  Coordinates 
} from '../utils/geolocation';

interface BookingFormProps {
  clientId: string;
  onBookingSuccess: (bookingId: string) => void;
}

export const BookingForm: React.FC<BookingFormProps> = ({ clientId, onBookingSuccess }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableDrivers, setAvailableDrivers] = useState<Driver[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<string | null>(null);
  const [estimatedPrice, setEstimatedPrice] = useState<number | null>(null);
  const [estimatedDistance, setEstimatedDistance] = useState<number | null>(null);
  const [showDrivers, setShowDrivers] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [pickupCoords, setPickupCoords] = useState<Coordinates | null>(null);
  const [destinationCoords, setDestinationCoords] = useState<Coordinates | null>(null);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [pickupSuggestions, setPickupSuggestions] = useState<string[]>([]);
  const [destinationSuggestions, setDestinationSuggestions] = useState<string[]>([]);
  const [showPickupSuggestions, setShowPickupSuggestions] = useState(false);
  const [showDestinationSuggestions, setShowDestinationSuggestions] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isValid }
  } = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
    mode: 'onChange'
  });

  const watchPickup = watch('pickupAddress');
  const watchDestination = watch('destinationAddress');

  // Autocomplétion des adresses
  useEffect(() => {
    if (watchPickup && watchPickup.length > 2) {
      const filtered = popularAddresses.filter(addr => 
        addr.toLowerCase().includes(watchPickup.toLowerCase())
      );
      setPickupSuggestions(filtered.slice(0, 5));
      setShowPickupSuggestions(true);
    } else {
      setShowPickupSuggestions(false);
    }
  }, [watchPickup]);

  useEffect(() => {
    if (watchDestination && watchDestination.length > 2) {
      const filtered = popularAddresses.filter(addr => 
        addr.toLowerCase().includes(watchDestination.toLowerCase())
      );
      setDestinationSuggestions(filtered.slice(0, 5));
      setShowDestinationSuggestions(true);
    } else {
      setShowDestinationSuggestions(false);
    }
  }, [watchDestination]);

  // Calcul automatique de la distance et du prix
  useEffect(() => {
    const calculateRoute = async () => {
      if (watchPickup && watchDestination && watchPickup.length > 5 && watchDestination.length > 5) {
        setIsCalculating(true);
        
        try {
          // Géocoder les adresses
          const [pickupResult, destinationResult] = await Promise.all([
            geocodeAddress(watchPickup),
            geocodeAddress(watchDestination)
          ]);

          if (pickupResult && destinationResult) {
            setPickupCoords(pickupResult.coordinates);
            setDestinationCoords(destinationResult.coordinates);

            // Calculer la distance
            const distance = calculateDistance(
              pickupResult.coordinates.latitude,
              pickupResult.coordinates.longitude,
              destinationResult.coordinates.latitude,
              destinationResult.coordinates.longitude
            );

            // Calculer le prix
            const price = calculatePrice(distance);

            setEstimatedDistance(distance);
            setEstimatedPrice(price);
          } else {
            setEstimatedDistance(null);
            setEstimatedPrice(null);
            setPickupCoords(null);
            setDestinationCoords(null);
          }
        } catch (error) {
          console.error('Erreur lors du calcul de la route:', error);
          setEstimatedDistance(null);
          setEstimatedPrice(null);
        } finally {
          setIsCalculating(false);
        }
      } else {
        setEstimatedDistance(null);
        setEstimatedPrice(null);
        setPickupCoords(null);
        setDestinationCoords(null);
      }
    };

    // Délai pour éviter trop d'appels API
    const timeoutId = setTimeout(calculateRoute, 1000);
    return () => clearTimeout(timeoutId);
  }, [watchPickup, watchDestination]);

  const useCurrentLocation = async () => {
    setGettingLocation(true);
    try {
      const position = await getCurrentPosition();
      
      // Géocodage inverse pour obtenir l'adresse
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.latitude}&lon=${position.longitude}&countrycodes=tn`
      );
      
      if (response.ok) {
        const data = await response.json();
        setValue('pickupAddress', data.display_name);
        setPickupCoords(position);
      }
    } catch (error) {
      console.error('Erreur lors de la géolocalisation:', error);
      alert('Impossible d\'obtenir votre position. Veuillez saisir l\'adresse manuellement.');
    } finally {
      setGettingLocation(false);
    }
  };

  const searchAvailableDrivers = async () => {
    console.log('🔍 Début de la recherche des chauffeurs disponibles...');
    
    try {
      // Étape 1: Récupérer tous les chauffeurs actifs
      console.log('📡 Étape 1: Récupération des chauffeurs actifs...');
      
      const { data: activeDrivers, error: driversError } = await supabase
        .from('drivers')
        .select('*')
        .eq('status', 'active');
      
      if (driversError) {
        console.error('❌ Erreur lors de la récupération des chauffeurs:', driversError);
        console.error('Détails de l\'erreur:', driversError);
        return;
      }
      
      console.log('📊 Chauffeurs actifs trouvés:', activeDrivers?.length || 0);
      
      if (!activeDrivers || activeDrivers.length === 0) {
        console.warn('⚠️ Aucun chauffeur actif trouvé');
        setAvailableDrivers([]);
        setShowDrivers(true);
        return;
      }
      
      // Étape 2: Récupérer TOUTES les disponibilités
      console.log('📅 Étape 2: Récupération de toutes les disponibilités...');
      
      const { data: allAvailabilities, error: availabilityError } = await supabase
        .from('driver_availability')
        .select('driver_id, is_available');
      
      if (availabilityError) {
        console.error('❌ Erreur lors de la récupération des disponibilités:', availabilityError);
        console.error('Détails de l\'erreur:', availabilityError);
        // Continuer même en cas d'erreur pour voir les chauffeurs
        console.log('⚠️ Continuons sans filtrer par disponibilités...');
      }
      
      console.log('📊 Toutes les disponibilités récupérées:', allAvailabilities?.length || 0);
      
      // Étape 3: Filtrer les disponibilités actives
      const activeAvailabilities = allAvailabilities?.filter(av => av.is_available === true) || [];
      console.log('✅ Disponibilités actives:', activeAvailabilities.length);
      
      // Étape 4: Identifier les chauffeurs avec disponibilités
      const driversWithAvailability = new Set(activeAvailabilities.map(av => av.driver_id));
      console.log('👥 Chauffeurs avec disponibilités:', driversWithAvailability.size);
      
      if (driversWithAvailability.size === 0) {
        console.warn('⚠️ Aucun chauffeur avec disponibilités actives trouvé');
        console.log('🔍 Affichage de tous les chauffeurs actifs pour debug...');
        
        // Pour le debug, afficher tous les chauffeurs actifs
        const formattedDrivers = activeDrivers.map(driver => ({
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
        return;
      }
      
      // Étape 5: Filtrer les chauffeurs qui ont des disponibilités
      const availableDriversData = activeDrivers.filter(driver => 
        driversWithAvailability.has(driver.id)
      );
      
      console.log('✅ Chauffeurs avec disponibilités:', availableDriversData.length);

      const formattedDrivers = availableDriversData.map(driver => ({
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

      console.log('🔄 Formatage terminé - Chauffeurs disponibles:', formattedDrivers.length);
      
      setAvailableDrivers(formattedDrivers);
      setShowDrivers(true);
      console.log('✅ Interface mise à jour avec', formattedDrivers.length, 'chauffeurs');
      
    } catch (error) {
      console.error('💥 Erreur inattendue:', error);
      console.error('Stack trace:', error);
    }
  };

  const onSubmit = async (data: BookingFormData) => {
    if (!estimatedDistance || !estimatedPrice || !pickupCoords || !destinationCoords) {
      alert('Veuillez saisir des adresses valides pour calculer le prix');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const bookingData = {
        client_id: clientId,
        pickup_address: data.pickupAddress,
        pickup_latitude: pickupCoords.latitude,
        pickup_longitude: pickupCoords.longitude,
        destination_address: data.destinationAddress,
        destination_latitude: destinationCoords.latitude,
        destination_longitude: destinationCoords.longitude,
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
        alert('Erreur lors de la création de la réservation');
        return;
      }

      onBookingSuccess(booking.id);
      
    } catch (error) {
      console.error('Erreur lors de la réservation:', error);
      alert('Une erreur est survenue lors de la réservation');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getMinDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 30); // Minimum 30 minutes à l'avance
    return now.toISOString().slice(0, 16);
  };

  const selectSuggestion = (address: string, type: 'pickup' | 'destination') => {
    if (type === 'pickup') {
      setValue('pickupAddress', address);
      setShowPickupSuggestions(false);
    } else {
      setValue('destinationAddress', address);
      setShowDestinationSuggestions(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm p-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Réserver une course
          </h2>
          <p className="text-gray-600">
            Renseignez les détails de votre trajet en Tunisie
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* Adresses avec géolocalisation */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Point de départ */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Point de départ
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MapPin className="h-5 w-5 text-green-600" />
                </div>
                <input
                  {...register('pickupAddress')}
                  type="text"
                  placeholder="Adresse de départ (ex: Avenue Habib Bourguiba, Tunis)"
                  className={`block w-full pl-10 pr-12 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all ${
                    errors.pickupAddress ? 'border-red-500' : 'border-gray-300'
                  }`}
                  onFocus={() => setShowPickupSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowPickupSuggestions(false), 200)}
                />
                <button
                  type="button"
                  onClick={useCurrentLocation}
                  disabled={gettingLocation}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-blue-600 hover:text-blue-700"
                  title="Utiliser ma position actuelle"
                >
                  {gettingLocation ? (
                    <Loader2 size={20} className="animate-spin" />
                  ) : (
                    <Target size={20} />
                  )}
                </button>
              </div>
              
              {/* Suggestions pour le départ */}
              {showPickupSuggestions && pickupSuggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {pickupSuggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => selectSuggestion(suggestion, 'pickup')}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                    >
                      <div className="flex items-center gap-2">
                        <MapPin size={16} className="text-gray-400" />
                        <span className="text-sm text-gray-900">{suggestion}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              
              {errors.pickupAddress && (
                <p className="mt-2 text-sm text-red-600">{errors.pickupAddress.message}</p>
              )}
            </div>

            {/* Point d'arrivée */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Point d'arrivée
              </label>
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
                  onFocus={() => setShowDestinationSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowDestinationSuggestions(false), 200)}
                />
              </div>
              
              {/* Suggestions pour l'arrivée */}
              {showDestinationSuggestions && destinationSuggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {destinationSuggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => selectSuggestion(suggestion, 'destination')}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                    >
                      <div className="flex items-center gap-2">
                        <Navigation size={16} className="text-gray-400" />
                        <span className="text-sm text-gray-900">{suggestion}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              
              {errors.destinationAddress && (
                <p className="mt-2 text-sm text-red-600">{errors.destinationAddress.message}</p>
              )}
            </div>
          </div>

          {/* Calcul en cours */}
          {isCalculating && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
              <div className="flex items-center gap-3">
                <Loader2 size={24} className="text-blue-600 animate-spin" />
                <div>
                  <h3 className="text-lg font-semibold text-blue-900">
                    Calcul du trajet en cours...
                  </h3>
                  <p className="text-blue-700">
                    Géolocalisation des adresses et calcul de la distance
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Estimation de prix */}
          {estimatedDistance && estimatedPrice && !isCalculating && (
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <Route className="w-6 h-6 text-purple-600" />
                <h3 className="text-lg font-semibold text-purple-900">
                  Estimation du trajet
                </h3>
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-white rounded-lg p-4 text-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Route size={24} className="text-blue-600" />
                  </div>
                  <p className="text-sm text-gray-600 mb-1">Distance</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {estimatedDistance} km
                  </p>
                </div>
                <div className="bg-white rounded-lg p-4 text-center">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Calculator size={24} className="text-purple-600" />
                  </div>
                  <p className="text-sm text-gray-600 mb-1">Prix total</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {estimatedPrice} TND
                  </p>
                </div>
                <div className="bg-white rounded-lg p-4 text-center">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <CheckCircle size={24} className="text-green-600" />
                  </div>
                  <p className="text-sm text-gray-600 mb-1">Tarif</p>
                  <p className="text-lg font-bold text-gray-900">
                    2,5 TND/km
                  </p>
                </div>
              </div>
              
              {pickupCoords && destinationCoords && (
                <div className="mt-4 p-3 bg-white rounded-lg">
                  <p className="text-xs text-gray-500">
                    <strong>Coordonnées:</strong> Départ ({pickupCoords.latitude.toFixed(4)}, {pickupCoords.longitude.toFixed(4)}) 
                    → Arrivée ({destinationCoords.latitude.toFixed(4)}, {destinationCoords.longitude.toFixed(4)})
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Message d'erreur si adresses non trouvées */}
          {watchPickup && watchDestination && watchPickup.length > 5 && watchDestination.length > 5 && 
           !isCalculating && !estimatedDistance && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-6">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-6 h-6 text-orange-600" />
                <div>
                  <h3 className="text-lg font-semibold text-orange-900">
                    Adresses non trouvées
                  </h3>
                  <p className="text-orange-700">
                    Veuillez vérifier les adresses saisies. Assurez-vous qu'elles sont en Tunisie.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Heure et notes */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Heure de départ souhaitée
              </label>
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
              </div>
              {errors.scheduledTime && (
                <p className="mt-2 text-sm text-red-600">{errors.scheduledTime.message}</p>
              )}
              <p className="mt-2 text-xs text-gray-500">
                Réservation minimum 30 minutes à l'avance
              </p>
            </div>

            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes ou instructions (optionnel)
              </label>
              <div className="relative">
                <div className="absolute top-3 left-3 pointer-events-none">
                  <MessageSquare className="h-5 w-5 text-gray-400" />
                </div>
                <textarea
                  {...register('notes')}
                  placeholder="Instructions spéciales, numéro d'étage, code d'accès..."
                  rows={3}
                  className={`block w-full pl-10 pr-3 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all resize-none ${
                    errors.notes ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
              </div>
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
                disabled={!isValid || !estimatedPrice || isCalculating}
                className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700"
              >
                <Car size={20} />
                Rechercher des chauffeurs disponibles
              </Button>
            ) : (
              <>
                <Button
                  type="button"
                  onClick={() => {
                    setSelectedDriver(null);
                    setAvailableDrivers([]);
                    setShowDrivers(false);
                  }}
                  variant="outline"
                  className="flex items-center justify-center gap-2"
                >
                  Nouvelle recherche
                </Button>
                <Button
                  type="submit"
                  loading={isSubmitting}
                  disabled={!isValid || isSubmitting || !estimatedPrice || !selectedDriver}
                  className="flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700"
                >
                  <CheckCircle size={20} />
                  {isSubmitting ? 'Réservation en cours...' : 'Confirmer la réservation'}
                </Button>
              </>
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
                <p className="text-gray-500 mb-4">
                  Vérifiez la console pour plus de détails sur la recherche.
                </p>
                <Button
                  onClick={searchAvailableDrivers}
                  className="mt-4 bg-blue-600 hover:bg-blue-700"
                >
                  Actualiser la recherche
                </Button>
              </div>
            ) : (
              <div className="grid gap-4">
                {availableDrivers.map((driver) => (
                  <div 
                    key={driver.id}
                    className={`border rounded-xl p-6 cursor-pointer transition-all duration-200 ${
                      selectedDriver === driver.id
                        ? 'border-purple-500 bg-purple-50 shadow-md ring-2 ring-purple-200'
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
                          {driver.phone && (
                            <p className="text-xs text-gray-500">
                              Tél: {driver.phone}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="flex items-center gap-2 text-green-600 mb-1">
                          <CheckCircle size={16} />
                          <span className="text-sm font-medium">Créneaux définis</span>
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
                        <div className="bg-white rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-gray-600">Distance du trajet:</span>
                            <span className="font-semibold text-gray-900">{estimatedDistance} km</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Prix total:</span>
                            <span className="font-bold text-purple-600 text-xl">
                              {estimatedPrice} TND
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-2 text-center">
                            Tarif: 2,5 TND par kilomètre
                          </p>
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