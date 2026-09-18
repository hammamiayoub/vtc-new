import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  MapPin, 
  Clock, 
  Calculator, 
  Car, 
  MessageSquare,
  CheckCircle,
  User,
  Loader2,
  AlertCircle,
  Target,
  Route,
  LocateFixed,
} from 'lucide-react';
import { Button } from './ui/Button';
import { bookingSchema } from '../utils/validation';
import { BookingFormData, Driver } from '../types';
import { supabase } from '../lib/supabase';
import AddressAutocomplete from './AddressAutocomplete';
import { normalizeAddress, areAddressesSimilar } from '../utils/addressNormalization';
import { 
  calculateDistance, 
  calculateDrivingDistance,
  calculatePriceWithSurcharges,
  getVehicleMultiplier,
  getBillableOneWayDistanceKm,
  getProgressivePriceBreakdown,
  SHORT_TRIP_NON_TAXI_WARNING_KM,
  getCurrentPosition,
  getCityCoordinates,
  Coordinates,
  PriceSurcharges
} from '../utils/geolocation';
import { pushNotificationService } from '../utils/pushNotifications';
import { analytics } from '../utils/analytics';
import { DRIVER_SEARCH_RADIUS_KM } from '../utils/driverSearchDistance';
import { MAX_DRIVERS_TO_SHOW } from '../utils/booking/bookingSearchConstants';
import { enrichDriversWithMetadata } from '../utils/booking/enrichDriverSearchResults';
import { fetchRefusedDriverIds } from '../utils/booking/fetchRefusedDriverIds';
import { mapSearchEntryToDriver } from '../utils/booking/mapSearchDriverToClient';
import { DriverSearchFetchError, searchDriversForBooking } from '../utils/booking/searchDriversForBooking';
import { DriverSearchResultCard } from './DriverSearchResultCard';
import type { PendingQuote } from '../utils/pendingQuote';

interface BookingFormProps {
  clientId: string;
  onBookingSuccess: (bookingId: string) => void;
  initialQuote?: PendingQuote | null;
}

export const BookingForm: React.FC<BookingFormProps> = ({
  clientId,
  onBookingSuccess,
  initialQuote = null,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableDrivers, setAvailableDrivers] = useState<Driver[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<string | null>(null);
  const [estimatedPrice, setEstimatedPrice] = useState<number | null>(null);
  const [estimatedDistance, setEstimatedDistance] = useState<number | null>(null);
  const [baseDistance, setBaseDistance] = useState<number | null>(null);
  const [showDrivers, setShowDrivers] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isSearchingDrivers, setIsSearchingDrivers] = useState(false);
  const [driversSearchRefusalsExcluded, setDriversSearchRefusalsExcluded] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [pickupCoords, setPickupCoords] = useState<Coordinates | null>(
    initialQuote?.pickupCoords ?? null,
  );
  const [destinationCoords, setDestinationCoords] = useState<Coordinates | null>(
    initialQuote?.destinationCoords ?? null,
  );
  const [gettingLocation, setGettingLocation] = useState(false);
  
  // États locaux pour les valeurs des champs d'adresse
  const [pickupAddressValue, setPickupAddressValue] = useState(initialQuote?.pickupAddress ?? '');
  const [destinationAddressValue, setDestinationAddressValue] = useState(
    initialQuote?.destinationAddress ?? '',
  );
  const [restoredFromQuote, setRestoredFromQuote] = useState(!!initialQuote);

  // Gestion de la sélection des lieux
  const handlePickupPlaceSelect = (place: google.maps.places.PlaceResult) => {
    console.log('🔍 handlePickupPlaceSelect appelé avec:', place);
    
    if (place.geometry?.location) {
      const coords = {
        latitude: place.geometry.location.lat(),
        longitude: place.geometry.location.lng()
      };
      
      const newAddress = place.name?.trim() || place.formatted_address || '';
      
      // Mettre à jour les coordonnées et la valeur locale
      setPickupCoords(coords);
      setPickupAddressValue(newAddress);
      setValue('pickupAddress', newAddress);
      
      console.log('📍 Lieu de départ sélectionné:', place.formatted_address, coords);
      console.log('📍 Adresse normalisée:', normalizeAddress(newAddress));
      console.log('✅ Valeur du champ de départ mise à jour:', newAddress);
    } else {
      console.log('❌ Pas de géométrie dans le lieu sélectionné:', place);
    }
  };

  const handleDestinationPlaceSelect = (place: google.maps.places.PlaceResult) => {
    console.log('🔍 handleDestinationPlaceSelect appelé avec:', place);
    
    if (place.geometry?.location) {
      const coords = {
        latitude: place.geometry.location.lat(),
        longitude: place.geometry.location.lng()
      };
      
      const newAddress = place.name?.trim() || place.formatted_address || '';
      
      // Mettre à jour les coordonnées et la valeur locale
      setDestinationCoords(coords);
      setDestinationAddressValue(newAddress);
      setValue('destinationAddress', newAddress);
      
      console.log('📍 Lieu d\'arrivée sélectionné:', place.formatted_address, coords);
      console.log('📍 Adresse normalisée:', normalizeAddress(newAddress));
      console.log('✅ Valeur du champ d\'arrivée mise à jour:', newAddress);
    } else {
      console.log('❌ Pas de géométrie dans le lieu sélectionné:', place);
    }
  };
  const [priceSurcharges, setPriceSurcharges] = useState<PriceSurcharges | null>(null);
  const [isImmediateDeparture, setIsImmediateDeparture] = useState(false);

  // Options pour les types de véhicules
  const vehicleTypeOptions = [
    { value: 'sedan', label: 'Berline' },
    { value: 'taxi', label: 'Taxi' },
    { value: 'pickup', label: 'Pickup' },
    { value: 'van', label: 'Van' },
    { value: 'minibus', label: 'Minibus' },
    { value: 'bus', label: 'Bus' },
    { value: 'truck', label: 'Camion' },
    { value: 'utility', label: 'Utilitaire' },
    
  ];

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isValid }
  } = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
    mode: 'onChange',
    defaultValues: initialQuote
      ? {
          pickupAddress: initialQuote.pickupAddress,
          destinationAddress: initialQuote.destinationAddress,
          vehicleType: initialQuote.vehicleType ?? 'sedan',
        }
      : undefined,
  });

  useEffect(() => {
    if (!initialQuote) return;

    setPickupAddressValue(initialQuote.pickupAddress);
    setDestinationAddressValue(initialQuote.destinationAddress);
    setPickupCoords(initialQuote.pickupCoords ?? null);
    setDestinationCoords(initialQuote.destinationCoords ?? null);
    setValue('pickupAddress', initialQuote.pickupAddress, { shouldValidate: true });
    setValue('destinationAddress', initialQuote.destinationAddress, { shouldValidate: true });
    setValue('vehicleType', initialQuote.vehicleType ?? 'sedan', { shouldValidate: true });
    setBaseDistance(initialQuote.distanceKm);
    setEstimatedDistance(initialQuote.distanceKm);
    setEstimatedPrice(initialQuote.estimatedPrice);
    setRestoredFromQuote(true);
  }, [initialQuote, setValue]);

  const watchPickup = watch('pickupAddress');
  const watchDestination = watch('destinationAddress');
  const watchVehicleType = watch('vehicleType');
  const watchIsReturnTrip = watch('isReturnTrip');
  const watchScheduledTime = watch('scheduledTime');
  const getDriverEntryKey = (driver: Driver) => driver.driverVehicleId ?? driver.id;
  const selectedDriverData = availableDrivers.find(
    (driver) => getDriverEntryKey(driver) === selectedDriver,
  );
  const vipMultiplier = selectedDriverData?.vehicleInfo?.isVip ? 2.5 : 1;
  const driverToPickupKm =
    selectedDriverData?.distanceFromPickup != null &&
    selectedDriverData.distanceFromPickup !== Infinity &&
    Number.isFinite(selectedDriverData.distanceFromPickup)
      ? selectedDriverData.distanceFromPickup
      : undefined;

  /** Trajet trop court pour les véhicules hors taxi : message + pas de réservation tant que distance aller < seuil. */
  const isShortTripBlockedForNonTaxi =
    !!watchVehicleType &&
    watchVehicleType !== 'taxi' &&
    baseDistance !== null &&
    baseDistance < SHORT_TRIP_NON_TAXI_WARNING_KM;

  // Autocomplétion des adresses

  // Recalcul du prix et de la distance quand le trajet retour ou la date/heure change
  useEffect(() => {
    if (baseDistance && watchVehicleType !== undefined && watchScheduledTime) {
      // Calculer la distance finale (avec ou sans retour)
      const finalDistance = watchIsReturnTrip ? baseDistance * 2 : baseDistance;
      setEstimatedDistance(finalDistance);
      
      // Calculer les suppléments (nuit et week-end) avec le paramètre isReturnTrip
      const { surcharges, finalPrice } = calculatePriceWithSurcharges(
        baseDistance,
        watchVehicleType,
        watchScheduledTime,
        watchIsReturnTrip,
        vipMultiplier,
        driverToPickupKm,
      );
      
      // Utiliser directement le résultat de calculatePriceWithSurcharges
      setEstimatedPrice(finalPrice);
      setPriceSurcharges(surcharges);
    } else if (baseDistance && watchVehicleType !== undefined && !watchScheduledTime) {
      // Si pas de date/heure, calculer sans supplément mais avec le trajet retour
      const finalDistance = watchIsReturnTrip ? baseDistance * 2 : baseDistance;
      setEstimatedDistance(finalDistance);
      
      // Utiliser calculatePriceWithSurcharges même sans date pour gérer le trajet retour
      const { surcharges, finalPrice } = calculatePriceWithSurcharges(
        baseDistance,
        watchVehicleType,
        new Date(),
        watchIsReturnTrip,
        vipMultiplier,
        driverToPickupKm,
      );
      
      setEstimatedPrice(finalPrice);
      setPriceSurcharges(surcharges);
    }
  }, [watchVehicleType, baseDistance, watchIsReturnTrip, watchScheduledTime, vipMultiplier, driverToPickupKm]);

  // Départ immédiat : verrouiller la date/heure sur maintenant
  useEffect(() => {
    if (!isImmediateDeparture) return;
    const now = new Date();
    const nowValue = now.toISOString().slice(0, 16);
    setValue('scheduledTime', nowValue, { shouldValidate: true });
  }, [isImmediateDeparture, setValue]);

  // Calcul automatique de la distance et du prix avec coordonnées Google Maps
  useEffect(() => {
    const calculateRoute = async () => {
      // Vérifier que nous avons les coordonnées Google Maps
      if (!pickupCoords || !destinationCoords) {
        console.log('📍 En attente des coordonnées Google Maps...');
        setEstimatedDistance(null);
        setEstimatedPrice(null);
        setBaseDistance(null);
        return;
      }

      if (!watchVehicleType) {
        console.log('📍 En attente de la sélection du type de véhicule...');
        return;
      }

      setIsCalculating(true);
      
      try {
        console.log('📍 Calcul avec les coordonnées Google Maps:', {
          pickup: { lat: pickupCoords.latitude, lng: pickupCoords.longitude },
          destination: { lat: destinationCoords.latitude, lng: destinationCoords.longitude }
        });

            // Calculer la distance routière de base (sans retour)
            let distance = await calculateDrivingDistance(
          pickupCoords.latitude,
          pickupCoords.longitude,
          destinationCoords.latitude,
          destinationCoords.longitude
            );

            // Si la distance routière n'est pas disponible, utiliser la distance à vol d'oiseau
            if (distance === null) {
          console.log('📍 Distance routière non disponible, utilisation de la distance à vol d\'oiseau');
              distance = calculateDistance(
            pickupCoords.latitude,
            pickupCoords.longitude,
            destinationCoords.latitude,
            destinationCoords.longitude
          );
        }

        console.log('✅ Distance calculée:', distance, 'km');

            // Stocker la distance de base (sans retour)
            setBaseDistance(distance);
        
        // Calculer le prix avec le type de véhicule sélectionné
        const selectedVehicleType = watchVehicleType;
        console.log('🚗 Type de véhicule sélectionné:', selectedVehicleType);
        
        if (selectedVehicleType) {
          const priceResult = calculatePriceWithSurcharges(
            distance,
            selectedVehicleType,
            new Date(),
            watchIsReturnTrip || false,
            vipMultiplier,
            driverToPickupKm,
          );
          
          console.log('💰 Prix calculé:', priceResult);
          
          // Mettre à jour les états
          // Calculer la distance finale (avec ou sans retour)
          const finalDistance = watchIsReturnTrip ? distance * 2 : distance;
          setEstimatedDistance(finalDistance);
          setEstimatedPrice(priceResult.finalPrice);
          
          console.log('✅ Distance et prix mis à jour:', {
            distance: distance,
            price: priceResult.finalPrice,
            isReturnTrip: watchIsReturnTrip
          });
          } else {
          console.log('⚠️ Type de véhicule non sélectionné, prix non calculé');
          // Calculer la distance finale (avec ou sans retour)
          const finalDistance = watchIsReturnTrip ? distance * 2 : distance;
          setEstimatedDistance(finalDistance);
          setEstimatedPrice(null);
          }
        
        } catch (error) {
        console.error('❌ Erreur lors du calcul de la route:', error);
          setEstimatedDistance(null);
          setEstimatedPrice(null);
          setBaseDistance(null);
        } finally {
          setIsCalculating(false);
      }
    };

    calculateRoute();
  }, [pickupCoords, destinationCoords, watchVehicleType, watchIsReturnTrip, vipMultiplier, driverToPickupKm]);


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
        setPickupAddressValue(data.display_name);
        setPickupCoords(position);
      }
    } catch (error) {
      console.error('Erreur lors de la géolocalisation:', error);
      setFormError('Impossible d\'obtenir votre position. Veuillez saisir l\'adresse manuellement.');
    } finally {
      setGettingLocation(false);
    }
  };

  const searchAvailableDrivers = async () => {
    if (!pickupCoords) {
      setFormError('Veuillez sélectionner une adresse de départ valide depuis les suggestions (autocomplétion).');
      return;
    }

    if (isShortTripBlockedForNonTaxi) {
      setFormError(
        `Pour une distance aller inférieure à ${SHORT_TRIP_NON_TAXI_WARNING_KM} km avec ce type de véhicule, augmentez la distance du trajet ou choisissez le type « Taxi » pour les courses courtes.`,
      );
      return;
    }

    const scheduledTime = watch('scheduledTime');
    if (!scheduledTime) {
      setFormError('Veuillez d\'abord sélectionner une date et heure de départ');
      return;
    }

    const selectedVehicleType = watch('vehicleType');
    if (!selectedVehicleType) {
      setFormError('Veuillez sélectionner un type de véhicule');
      return;
    }

    setFormError(null);
    setIsSearchingDrivers(true);
    setShowDrivers(false);
    setSelectedDriver(null);
    setAvailableDrivers([]);
    setDriversSearchRefusalsExcluded(false);

    try {
      const refusedDriverIds = await fetchRefusedDriverIds(clientId);
      const { drivers, hasRefusalsExcluded, sortedDriverIds } = await searchDriversForBooking({
        scheduledTimeIso: scheduledTime,
        pickupCoords,
        vehicleType: selectedVehicleType,
        refusedDriverIds,
      });

      if (drivers.length === 0) {
        setDriversSearchRefusalsExcluded(hasRefusalsExcluded);
        setAvailableDrivers([]);
        setShowDrivers(true);
        return;
      }

      const mappedDrivers = drivers
        .slice(0, MAX_DRIVERS_TO_SHOW)
        .map(mapSearchEntryToDriver);
      const enrichedDrivers = await enrichDriversWithMetadata(mappedDrivers, sortedDriverIds);

      setAvailableDrivers(enrichedDrivers);
      setShowDrivers(true);
    } catch (error) {
      console.error('Erreur recherche chauffeurs:', error);
      setFormError(
        error instanceof DriverSearchFetchError
          ? error.userMessage
          : 'Une erreur est survenue lors de la recherche des chauffeurs',
      );
      setAvailableDrivers([]);
      setShowDrivers(true);
    } finally {
      setIsSearchingDrivers(false);
    }
  };

  const onSubmit = async (data: BookingFormData) => {
    if (!estimatedDistance || !estimatedPrice || !pickupCoords || !destinationCoords) {
      setFormError('Veuillez saisir des adresses valides pour calculer le prix');
      return;
    }

    if (isShortTripBlockedForNonTaxi) {
      setFormError(
        `Pour une distance aller inférieure à ${SHORT_TRIP_NON_TAXI_WARNING_KM} km avec ce type de véhicule, augmentez la distance du trajet ou choisissez le type « Taxi » pour les courses courtes.`,
      );
      return;
    }

    if (!selectedDriver) {
      setFormError('Veuillez sélectionner un chauffeur');
      return;
    }

    const selectedEntry = availableDrivers.find(
      (driver) => getDriverEntryKey(driver) === selectedDriver,
    );
    if (!selectedEntry) {
      setFormError('Chauffeur sélectionné introuvable, relancez la recherche');
      return;
    }

    setFormError(null);
    setIsSubmitting(true);
    
    try {
      const bookingData = {
        client_id: clientId,
        driver_id: selectedEntry.id,
        vehicle_id: selectedEntry.vehicleId ?? null,
        pickup_address: data.pickupAddress,
        pickup_latitude: pickupCoords.latitude,
        pickup_longitude: pickupCoords.longitude,
        destination_address: data.destinationAddress,
        destination_latitude: destinationCoords.latitude,
        destination_longitude: destinationCoords.longitude,
        distance_km: estimatedDistance,
        price_tnd: estimatedPrice,
        scheduled_time: data.scheduledTime,
        is_return_trip: data.isReturnTrip || false,
        notes: data.notes || null,
        status: 'pending'
      };

      console.log('📝 Données de réservation à insérer:', bookingData);
      console.log('👤 Chauffeur sélectionné ID:', selectedEntry.id);
      console.log('🧑‍💼 Client ID:', clientId);
      const { data: booking, error } = await supabase
        .from('bookings')
        .insert(bookingData)
        .select()
        .single();

      if (error) {
        console.error('Erreur lors de la création de la réservation:', error);
        console.error('Détails de l\'erreur:', error.message, error.code, error.details);
        setFormError('Erreur lors de la création de la réservation');
        return;
      }

      console.log('✅ Réservation créée avec succès:', booking);
      console.log('👤 Chauffeur assigné dans la DB:', booking.driver_id);
      console.log('📊 Statut de la réservation:', booking.status);
      
      // Tracker la conversion Google Ads
      console.log('📊 Tracking conversion Google Ads...');
      analytics.trackBookingCreated(clientId, estimatedPrice);
      
      // Tracker la conversion spécifique itinéraire
      console.log('🗺️ Tracking conversion itinéraire...');
      analytics.trackItineraryConversion();
      
      // Récupérer les données du client et chauffeur pour les notifications
      console.log('📋 Récupération des données client et chauffeur...');
      
      // Récupérer les données du client
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('first_name, last_name, email, phone')
        .eq('id', clientId)
        .single();

      if (clientError) {
        console.error('Erreur récupération client:', clientError);
      }

      // Récupérer les données du chauffeur
      const { data: driverData, error: driverError } = await supabase
        .from('drivers')
        .select('first_name, last_name, email, phone, vehicle_info')
        .eq('id', selectedEntry.id)
        .single();

      if (driverError) {
        console.error('Erreur récupération chauffeur:', driverError);
      }
      
      // Envoi des notifications email via Edge Function
      console.log('📧 === ENVOI D\'EMAILS VIA RESEND ===');
      
      try {
        // Appel à l'Edge Function pour envoyer les emails
        if (clientData && driverData) {
          console.log('🚀 Appel Edge Function resend-email...');
          
          const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/resend-email`;
          
          const emailResponse = await fetch(functionUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              bookingData: booking,
              clientData: clientData,
              driverData: driverData
            })
          });

          const emailResult = await emailResponse.json();
          
          if (emailResponse.ok && emailResult.success) {
            console.log('✅ Emails envoyés avec succès:', emailResult.message);
            console.log('📊 Détails:', emailResult.results);
          } else {
            console.error('❌ Erreur envoi emails:', emailResult.error);
            console.error('📊 Détails:', emailResult.details || emailResult);
            // Ne pas faire échouer la réservation si les emails échouent
          }
        } else {
          console.warn('⚠️ Données client ou chauffeur manquantes pour l\'envoi d\'emails');
        }

        console.log('📧 === FIN ENVOI EMAILS ===');
      } catch (emailError) {
        console.error('❌ Erreur lors de la simulation des emails:', emailError);
        // Ne pas faire échouer la réservation si les emails échouent
      }

      // Envoyer notification push au chauffeur assigné
      try {
        const driverData = selectedEntry;
        if (driverData) {
          await pushNotificationService.notifyDriverAssigned(
            driverData.firstName + ' ' + driverData.lastName,
            clientData?.first_name + ' ' + clientData?.last_name || 'Client',
            data.pickupAddress,
            new Date(data.scheduledTime).toLocaleDateString('fr-FR')
          );
          console.log('✅ Notification push envoyée au chauffeur');
        }
      } catch (notificationError) {
        console.error('❌ Erreur lors de l\'envoi de la notification push:', notificationError);
        // Ne pas faire échouer la réservation si la notification échoue
      }
      
      // Vérification immédiate de la réservation créée
      const { data: verifyBooking, error: verifyError } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', booking.id)
        .single();
      
      if (verifyError) {
        console.error('❌ Erreur lors de la vérification:', verifyError);
      } else {
        console.log('🔍 Vérification - Réservation dans la DB:', verifyBooking);
      }
      
      onBookingSuccess(booking.id);
      
    } catch (error) {
      console.error('Erreur lors de la réservation:', error);
      setFormError('Une erreur est survenue lors de la réservation');
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
    <div className="max-w-4xl mx-auto px-4 sm:px-0">
      <div className="bg-white rounded-xl shadow-sm p-8">
        <div className="mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            Réserver une course
          </h2>
          
          {/* Test Google Maps - À supprimer après vérification */}
         
          
          <p className="text-sm sm:text-base text-gray-600">
            Renseignez les détails de votre trajet en Tunisie
          </p>

          {restoredFromQuote && initialQuote && (
            <div className="mt-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 flex items-start gap-2">
              <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" aria-hidden="true" />
              <p>
                Votre estimation depuis l&apos;accueil a été reprise (
                <strong>{initialQuote.distanceKm.toFixed(1)} km</strong>
                {' · '}
                <strong>{initialQuote.estimatedPrice.toFixed(2)} TND</strong>
                ). Choisissez la date et recherchez un chauffeur pour confirmer.
              </p>
            </div>
          )}
        </div>

        {formError && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 flex items-start gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <p>{formError}</p>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* Adresses avec géolocalisation */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Point de départ */}
            <div> 
              <label className="block text-sm font-medium text-gray-700 mb-2 ">
                Point de départ
                <button
                  type="button"
                  onClick={useCurrentLocation}
                  disabled={gettingLocation}
                  className="absolute ml-2 margin-right-10 text-gray-900 hover:text-gray-700 disabled:opacity-50 z-10  bg-transparent"
                  title="Utiliser ma position actuelle"
                >
                  {gettingLocation ? (
                    <LocateFixed size={18} className="animate-pulse opacity-80" />
                  ) : (
                    <Target size={18} />
                  )}
                </button>
              </label>

              <div className="relative">
                <AddressAutocomplete
                  inputId="pickup-address"
                  value={pickupAddressValue}
                  onChange={(value) => {
                    setPickupAddressValue(value);
                    setValue('pickupAddress', value);
                  }}
                  onPlaceSelect={handlePickupPlaceSelect}
                  placeholder="Adresse de départ"
                  className={errors.pickupAddress ? 'ring-2 ring-red-500 rounded-lg' : ''}
                />

                {/* Bouton de géolocalisation à l'intérieur du champ */}
                
              </div>
              
              {errors.pickupAddress && (
                <p className="mt-2 text-sm text-red-600">{errors.pickupAddress.message}</p>
              )}
            </div>

            {/* Point d'arrivée */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Point d'arrivée
              </label>
              <AddressAutocomplete
                inputId="destination-address"
                value={destinationAddressValue}
                onChange={(value) => {
                  setDestinationAddressValue(value);
                  setValue('destinationAddress', value);
                }}
                onPlaceSelect={handleDestinationPlaceSelect}
                placeholder="Adresse d'arrivée"
                className={errors.destinationAddress ? 'ring-2 ring-red-500 rounded-lg' : ''}
              />
              
              {errors.destinationAddress && (
                <p className="mt-2 text-sm text-red-600">{errors.destinationAddress.message}</p>
              )}
            </div>
          </div>

          {/* Type de véhicule */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Car className="inline w-4 h-4 mr-2" />
              Type de véhicule souhaité
            </label>
            <select
              {...register('vehicleType')}
              className={`block w-full px-3 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 transition-all appearance-none ${
                errors.vehicleType ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              {vehicleTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {errors.vehicleType && (
              <p className="mt-2 text-sm text-red-600">{errors.vehicleType.message}</p>
            )}
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isImmediateDeparture}
              onChange={(e) => {
                const nextValue = e.target.checked;
                setIsImmediateDeparture(nextValue);
                if (!nextValue) {
                  setValue('scheduledTime', '', { shouldValidate: true });
                }
              }}
              className="w-5 h-5 text-gray-900 border-gray-300 rounded focus:ring-gray-900 focus:ring-2"
            />
            Départ immédiat
          </label>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Clock className="inline w-4 h-4 mr-2" />
              Date et heure de départ
            </label>
            <input
              {...register('scheduledTime')}
              type="datetime-local"
              min={getMinDateTime()}
              disabled={isImmediateDeparture}
              className={`block w-full px-3 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 transition-all ${
                errors.scheduledTime ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.scheduledTime && (
              <p className="mt-2 text-sm text-red-600">{errors.scheduledTime.message}</p>
            )}
          </div>

          {/* Trajet retour */}
          <div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                {...register('isReturnTrip')}
                type="checkbox"
                className="w-5 h-5 text-gray-900 border-gray-300 rounded focus:ring-gray-900 focus:ring-2"
              />
              <div>
                <span className="text-sm font-medium text-gray-700">
                  Trajet retour
                </span>
                <p className="text-xs text-gray-500">
                  Possible uniquement si le retour est dans la même journée
                </p>
              </div>
            </label>
          </div>

          {/* Calcul en cours */}
          {isCalculating && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <Loader2 size={24} className="text-gray-900 animate-spin" />
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                    Calcul du trajet en cours...
                  </h3>
                  <p className="text-sm sm:text-base text-gray-600">
                    Géolocalisation des adresses et calcul de la distance
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Estimation de prix */}
          {estimatedDistance && estimatedPrice && !isCalculating && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <Route className="w-6 h-6 text-gray-900" />
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                  Estimation du trajet
                  {watchIsReturnTrip && (
                    <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                      Trajet retour
                    </span>
                  )}
                </h3>
              </div>
              {vipMultiplier > 1 && (
                <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  Ce véhicule est marqué <strong>VIP</strong> : le prix est plus élevé qu’un véhicule classique.
                </div>
              )}
              {isShortTripBlockedForNonTaxi && (
                <div className="mb-4 rounded-lg border-2 border-amber-400 bg-amber-50 px-4 py-3 text-sm text-amber-950 flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 text-amber-600 mt-0.5" />
                  <p>
                    La distance aller ({baseDistance} km) est inférieure à {SHORT_TRIP_NON_TAXI_WARNING_KM} km pour ce type de véhicule. Augmentez la distance du trajet ou choisissez le type <strong>Taxi</strong> pour les courses courtes.
                  </p>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white rounded-lg p-4 text-center">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Route size={24} className="text-gray-900" />
                  </div>
                  <p className="text-sm text-gray-600 mb-1">
                    Distance {watchIsReturnTrip && '(aller-retour)'}
                  </p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">
                    {estimatedDistance} km
                  </p>
                </div>
                <div className="bg-white rounded-lg p-4 text-center">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Calculator size={24} className="text-gray-900" />
                  </div>
                  <p className="text-sm text-gray-600 mb-1">
                    Prix total {watchIsReturnTrip && '(avec retour)'}
                  </p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">
                    {estimatedPrice} TND
                  </p>
                </div>
                <div className="bg-white rounded-lg p-4 text-left">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Calculator size={24} className="text-green-600" />
                  </div>
                  <p className="text-sm text-gray-600 mb-1 text-center">Calcul</p>
                  <div className="text-xs sm:text-sm font-medium text-gray-900">
                    {(() => {
                      if (!baseDistance && !estimatedDistance) return '';
                      const selectedVehicleType = watch('vehicleType');
                      const vehicleMultiplier = getVehicleMultiplier(selectedVehicleType);
                      const vehicleTypeName = vehicleTypeOptions.find(opt => opt.value === selectedVehicleType)?.label || 'Standard';
                      const rawOneWay =
                        baseDistance ??
                        (watchIsReturnTrip ? (estimatedDistance ?? 0) / 2 : (estimatedDistance ?? 0));
                      const oneWayBillable = getBillableOneWayDistanceKm(rawOneWay, selectedVehicleType);
                      const effectiveDistance = watchIsReturnTrip
                        ? oneWayBillable * 2
                        : oneWayBillable;

                      const pricing = getProgressivePriceBreakdown(effectiveDistance, driverToPickupKm);
                      const totalWithMultiplier =
                        Math.round(pricing.subtotal * vehicleMultiplier * vipMultiplier * 100) / 100;

                      return (
                        <div className="mt-2 space-y-2">
                          <div className="text-gray-700 text-center">
                            {watchIsReturnTrip
                              ? `${oneWayBillable.toFixed(0)} km × 2 (retour)`
                              : `${effectiveDistance.toFixed(0)} km`}
                            {selectedVehicleType && selectedVehicleType !== 'taxi' && rawOneWay < oneWayBillable && (
                              <span className="block text-[11px] text-gray-500 mt-1">
                                (distance réelle {rawOneWay.toFixed(1)} km — minimum {oneWayBillable.toFixed(0)} km appliqué au tarif)
                              </span>
                            )}
                          </div>
                          <div className="space-y-1">
                            <div className="grid grid-cols-[72px_1fr] items-start gap-2 text-gray-700">
                              <span className="whitespace-nowrap text-[11px] sm:text-xs">Prise en charge</span>
                              <span className="tabular-nums text-[11px] sm:text-xs text-right">
                                {pricing.baseFare.toFixed(2)} TND
                                {driverToPickupKm != null && (
                                  <span className="block text-[10px] text-gray-500">
                                    (chauffeur ~{Math.round(driverToPickupKm)} km)
                                  </span>
                                )}
                              </span>
                            </div>
                            {pricing.rows.map((row, index) => (
                              <div key={index} className="grid grid-cols-[72px_1fr] items-start gap-2 text-gray-700">
                                <span className="whitespace-nowrap text-[11px] sm:text-xs">{row.label}</span>
                                <span className="tabular-nums text-[11px] sm:text-xs text-right break-words">
                                  {row.km.toFixed(1)} km × {row.rate.toFixed(2)} = {row.subtotal.toFixed(2)} TND
                                </span>
                              </div>
                            ))}
                          </div>
                          <div className="border-t border-gray-200 pt-2 space-y-1">
                            {pricing.appliedMinimum && (
                              <div className="flex items-center justify-between text-amber-700 text-[11px] sm:text-xs">
                                <span>Prix minimum appliqué</span>
                                <span className="tabular-nums font-semibold">{pricing.subtotal.toFixed(2)} TND</span>
                              </div>
                            )}
                            {!pricing.appliedMinimum && (
                              <div className="flex items-center justify-between text-gray-800">
                                <span>Base</span>
                                <span className="tabular-nums font-semibold">{pricing.subtotal.toFixed(2)} TND</span>
                              </div>
                            )}
                            {vehicleMultiplier > 1 && (
                              <div className="flex items-center justify-between text-gray-900 font-semibold">
                                <span>Multiplicateur ({vehicleTypeName})</span>
                                <span className="tabular-nums">×{vehicleMultiplier}</span>
                              </div>
                            )}
                            {vipMultiplier > 1 && (
                              <div className="flex items-center justify-between text-gray-900 font-semibold">
                                <span>VIP</span>
                                <span className="tabular-nums">×{vipMultiplier}</span>
                              </div>
                            )}
                            <div className="flex items-center justify-between text-gray-900 font-semibold">
                              <span>Total (hors suppléments)</span>
                              <span className="tabular-nums">{totalWithMultiplier.toFixed(2)} TND</span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
              
              {/* Suppléments de prix (nuit et week-end) */}
              {priceSurcharges && (priceSurcharges.isNightTime || priceSurcharges.isWeekend) && (
                <div className="mt-4 p-4 bg-yellow-50 border-2 border-yellow-300 rounded-lg">
                  <h4 className="text-sm font-semibold text-yellow-900 mb-2 flex items-center gap-2">
                    <Clock size={16} />
                    Suppléments applicables
                  </h4>
                  <div className="space-y-2">
                    {priceSurcharges.isNightTime && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-yellow-800">
                          🌙 Trajet de nuit (21h-6h)
                        </span>
                        <span className="font-bold text-yellow-900">
                          +{priceSurcharges.nightSurchargePercent}%
                        </span>
                      </div>
                    )}
                    {priceSurcharges.isWeekend && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-yellow-800">
                          📅 Week-end (Samedi/Dimanche)
                        </span>
                        <span className="font-bold text-yellow-900">
                          +{priceSurcharges.weekendSurchargePercent}%
                        </span>
                      </div>
                    )}
                    <div className="border-t-2 border-yellow-300 pt-2 mt-2">
                      <div className="flex items-center justify-between text-sm font-bold">
                        <span className="text-yellow-900">
                          Total des suppléments
                        </span>
                        <span className="text-yellow-900">
                          +{priceSurcharges.totalSurcharge.toFixed(2)} TND ({priceSurcharges.totalSurchargePercent}%)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          
          {/* Date et heure */}
          

          {/* Recherche de chauffeurs */}
          <div>
            <Button
              type="button"
              onClick={searchAvailableDrivers}
              loading={isSearchingDrivers}
              disabled={!isValid || !estimatedPrice || !pickupCoords || isShortTripBlockedForNonTaxi || isSearchingDrivers}
              className="w-full bg-black hover:bg-gray-800 text-white py-3 px-6 rounded-full font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {!isSearchingDrivers && <User className="w-5 h-5 mr-2" />}
              {isSearchingDrivers ? 'Recherche des chauffeurs en cours…' : 'Rechercher des chauffeurs disponibles'}
            </Button>

            {isSearchingDrivers && (
              <div className="mt-4 bg-gray-50 border border-gray-200 rounded-xl p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <Loader2 size={24} className="text-gray-900 animate-spin flex-shrink-0" />
                  <div>
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                      Recherche des chauffeurs disponibles
                    </h3>
                    <p className="text-sm sm:text-base text-gray-600">
                      Vérification des disponibilités, abonnements et distances dans un rayon de {DRIVER_SEARCH_RADIUS_KM} km…
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {!isValid && (
              <p className="mt-2 text-sm text-amber-600 flex items-center gap-2">
                <AlertCircle size={16} />
                Veuillez remplir tous les champs requis
              </p>
            )}
            
            {!estimatedPrice && isValid && (
              <p className="mt-2 text-sm text-amber-600 flex items-center gap-2">
                <AlertCircle size={16} />
                Veuillez saisir des adresses valides pour calculer le prix
              </p>
            )}
          </div>

          {/* Liste des chauffeurs disponibles */}
          {showDrivers && !isSearchingDrivers && (
            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Car className="w-5 h-5" />
                Chauffeurs disponibles ({availableDrivers.length}) — rayon {DRIVER_SEARCH_RADIUS_KM} km
              </h3>
              
              {availableDrivers.length === 0 ? (
                <div className="text-center py-8">
                  <Car className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-2">Aucun chauffeur disponible</p>
                  <p className="text-sm text-gray-500">
                    {driversSearchRefusalsExcluded
                      ? `Aucun chauffeur disponible dans un rayon de ${DRIVER_SEARCH_RADIUS_KM} km. Des chauffeurs précédemment sollicités ont refusé et sont temporairement exclus.`
                      : pickupCoords
                        ? `Aucun chauffeur trouvé dans un rayon de ${DRIVER_SEARCH_RADIUS_KM} km autour du point de départ. Essayez une autre date/heure ou modifiez l'adresse.`
                        : 'Essayez de modifier la date/heure ou les adresses'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                  {availableDrivers.map((driver) => {
                    const entryKey = getDriverEntryKey(driver);
                    const estimatedDriverPrice =
                      baseDistance && watchVehicleType
                        ? calculatePriceWithSurcharges(
                            baseDistance,
                            driver.vehicleInfo?.type || watchVehicleType,
                            watchScheduledTime || new Date(),
                            watchIsReturnTrip || false,
                            driver.vehicleInfo?.isVip ? 2.5 : 1,
                            driver.distanceFromPickup != null
                              && driver.distanceFromPickup !== Infinity
                              ? driver.distanceFromPickup
                              : undefined,
                          ).finalPrice
                        : null;

                    return (
                      <DriverSearchResultCard
                        key={entryKey}
                        driver={driver}
                        selected={selectedDriver === entryKey}
                        estimatedPrice={estimatedDriverPrice}
                        onSelect={() => setSelectedDriver(entryKey)}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Notes optionnelles */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <MessageSquare className="inline w-4 h-4 mr-2" />
              Notes (optionnel)
            </label>
            <textarea
              {...register('notes')}
              rows={3}
              placeholder="Instructions spéciales, numéro de vol, etc."
              className="block w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
            />
          </div>

          {/* Bouton de soumission */}
          <Button
            type="submit"
            disabled={isSubmitting || !selectedDriver || !estimatedPrice || isShortTripBlockedForNonTaxi}
            className="w-full bg-black hover:bg-gray-800 text-white py-4 px-6 rounded-full font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Réservation en cours...
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5 mr-2" />
                Confirmer la réservation ({estimatedPrice} TND)
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
};