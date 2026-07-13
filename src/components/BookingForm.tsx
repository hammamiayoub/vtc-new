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
  Star,
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
  const [baseDistance, setBaseDistance] = useState<number | null>(null);
  const [showDrivers, setShowDrivers] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [pickupCoords, setPickupCoords] = useState<Coordinates | null>(null);
  const [destinationCoords, setDestinationCoords] = useState<Coordinates | null>(null);
  const [gettingLocation, setGettingLocation] = useState(false);
  
  // États locaux pour les valeurs des champs d'adresse
  const [pickupAddressValue, setPickupAddressValue] = useState('');
  const [destinationAddressValue, setDestinationAddressValue] = useState('');

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
    mode: 'onChange'
  });

  const watchPickup = watch('pickupAddress');
  const watchDestination = watch('destinationAddress');
  const watchVehicleType = watch('vehicleType');
  const watchIsReturnTrip = watch('isReturnTrip');
  const watchScheduledTime = watch('scheduledTime');
  const selectedDriverData = availableDrivers.find(driver => driver.id === selectedDriver);
  const vipMultiplier = selectedDriverData?.vehicleInfo?.isVip ? 2.5 : 1;

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
        vipMultiplier
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
        new Date(), // Date actuelle
        watchIsReturnTrip,
        vipMultiplier
      );
      
      setEstimatedPrice(finalPrice);
      setPriceSurcharges(surcharges);
    }
  }, [watchVehicleType, baseDistance, watchIsReturnTrip, watchScheduledTime, vipMultiplier]);

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
            new Date(), // Date actuelle pour les surcharges
            watchIsReturnTrip || false,
            vipMultiplier
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
  }, [pickupCoords, destinationCoords, watchVehicleType, watchIsReturnTrip, vipMultiplier]);


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
      alert('Impossible d\'obtenir votre position. Veuillez saisir l\'adresse manuellement.');
    } finally {
      setGettingLocation(false);
    }
  };

  const searchAvailableDrivers = async () => {
    console.log('🔍 Début de la recherche des chauffeurs disponibles...');

    if (isShortTripBlockedForNonTaxi) {
      alert(
        `Pour une distance aller inférieure à ${SHORT_TRIP_NON_TAXI_WARNING_KM} km avec ce type de véhicule, augmentez la distance du trajet ou choisissez le type « Taxi » pour les courses courtes.`
      );
      return;
    }
    
    // Debug: Vérifier l'utilisateur connecté
    const { data: { user } } = await supabase.auth.getUser();
    console.log('👤 Utilisateur connecté:', user?.id);
    console.log('👤 Email utilisateur:', user?.email);
    
    if (!user) {
      console.error('❌ Aucun utilisateur connecté');
      alert('Vous devez être connecté pour rechercher des chauffeurs');
      return;
    }
    
    // Vérifier si c'est un client
    const { data: clientData, error: clientError } = await supabase
      .from('clients')
      .select('id, first_name, last_name')
      .eq('id', user.id)
      .maybeSingle();
    
    console.log('🧑‍💼 Données client:', clientData);
    console.log('🧑‍💼 Erreur client:', clientError);
    
    // Vérifier qu'une date est sélectionnée
    const scheduledTime = watch('scheduledTime');
    if (!scheduledTime) {
      alert('Veuillez d\'abord sélectionner une date et heure de départ');
      return;
    }
    
    const selectedDate = new Date(scheduledTime);
    const selectedDateString = selectedDate.toISOString().split('T')[0]; // Format YYYY-MM-DD
    const selectedTimeString = selectedDate.toTimeString().slice(0, 5); // Format HH:MM
    
    console.log('📅 Date sélectionnée:', selectedDateString);
    console.log('🕐 Heure sélectionnée:', selectedTimeString);
    console.log('📝 Valeur brute scheduledTime:', scheduledTime);
    console.log('📅 Date complète:', selectedDate);
    
    try {
      // Debug: Vérifier toutes les disponibilités existantes
      console.log('🔍 Debug: Récupération de TOUTES les disponibilités...');
      
      // Test 1: Requête simple sans filtre
      const { data: allAvailabilities, error: allError } = await supabase
        .from('driver_availability')
        .select('*');
      
      if (allError) {
        console.error('❌ Erreur récupération toutes disponibilités:', allError);
        console.error('❌ Code erreur:', allError.code);
        console.error('❌ Message:', allError.message);
        console.error('❌ Détails:', allError.details);
        console.error('❌ Hint:', allError.hint);
      } else {
        console.log('📊 Toutes les disponibilités dans la DB:', allAvailabilities?.length || 0);
      }

      // Test 2: Vérifier les permissions avec une requête spécifique
      console.log('🔍 Test permissions sur driver_availability...');
      const { data: permissionTest, error: permissionError } = await supabase
        .from('driver_availability')
        .select('id, driver_id, date, start_time, end_time, is_available')
        .limit(5);
      
      if (permissionError) {
        console.error('❌ Erreur de permissions:', permissionError);
        console.error('❌ Code:', permissionError.code);
        console.error('❌ Message:', permissionError.message);
        console.error('❌ Détails:', permissionError.details);
        console.error('❌ Hint:', permissionError.hint);
        
        // Vérifier si c'est un problème RLS
        if (permissionError.code === 'PGRST116' || permissionError.message.includes('row-level security')) {
          console.error('🚨 PROBLÈME RLS DÉTECTÉ: Le client n\'a pas les permissions pour voir les disponibilités');
          alert('Erreur de permissions: impossible de voir les disponibilités des chauffeurs');
          return;
        }
      } else {
        console.log('✅ Permissions OK - Disponibilités récupérées:', permissionTest?.length || 0);
        if (permissionTest && permissionTest.length > 0) {
          console.log('📋 Exemples de disponibilités:', permissionTest.slice(0, 2));
        } else {
          console.log('🔍 Aucune disponibilité trouvée - Vérifions le contenu complet de la table...');
          
          // Test avec une requête très large pour voir toutes les données
          const { data: allData, error: allError } = await supabase
            .from('driver_availability')
            .select('*')
            .limit(10);
          
          console.log('📊 Toutes les données de driver_availability (10 premières):', allData);
          if (allError) {
            console.error('❌ Erreur récupération toutes données:', allError);
          }
          
          // Test avec différents formats de date
          const testDates = [
            selectedDateString, // 2025-09-12
            selectedDate.toISOString().split('T')[0], // Au cas où
            selectedDate.toLocaleDateString('en-CA'), // Format YYYY-MM-DD
            selectedDate.toLocaleDateString('fr-FR').split('/').reverse().join('-') // DD/MM/YYYY -> YYYY-MM-DD
          ];
          
          console.log('🔍 Test avec différents formats de date:', testDates);
          
          for (const testDate of testDates) {
            const { data: testData } = await supabase
              .from('driver_availability')
              .select('*')
              .eq('date', testDate)
              .limit(5);
            
            console.log(`📅 Test date "${testDate}":`, testData?.length || 0, 'résultats');
            if (testData && testData.length > 0) {
              console.log('📋 Données trouvées:', testData);
            }
          }
        }
      }
      
      // Test 3: Recherche par date si les permissions sont OK
      if (!permissionError && permissionTest) {
        console.log('🔍 Test recherche par date:', selectedDateString);
        const { data: dateTest, error: dateError } = await supabase
          .from('driver_availability')
          .select('*')
          .eq('date', selectedDateString);
        
        console.log('📊 Résultats pour la date:', dateTest?.length || 0);
        if (dateError) {
          console.error('❌ Erreur recherche par date:', dateError);
        }
      }

      // Si on arrive ici et qu'il n'y a pas de disponibilités, c'est probablement normal
      if (!permissionError) {
        console.log('✅ Pas de problème de permissions - Continuons la recherche normale...');
      }

      // Étape 1: Récupération des disponibilités pour la date sélectionnée
      console.log('📅 Étape 1: Récupération des disponibilités pour le', selectedDateString);
      
      const { data: dateAvailabilities, error: availabilityError } = await supabase
        .from('driver_availability')
        .select('driver_id, start_time, end_time, is_available')
        .eq('date', selectedDateString)
        .eq('is_available', true);
      
      if (availabilityError) {
        console.error('❌ Erreur lors de la récupération des disponibilités:', availabilityError);
        console.error('Détails de l\'erreur:', availabilityError);
        setAvailableDrivers([]);
        setShowDrivers(true);
        return;
      }
      
      console.log('📊 Disponibilités pour cette date:', dateAvailabilities?.length || 0);
      console.log('📋 Détail des disponibilités pour cette date:', dateAvailabilities);
      
      if (!dateAvailabilities || dateAvailabilities.length === 0) {
        console.warn('⚠️ Aucune disponibilité trouvée pour cette date');
        console.log('🔍 Vérification: recherche avec date exacte:', selectedDateString);
        
        // Test avec une requête plus large pour debug
        const { data: debugAvailabilities } = await supabase
          .from('driver_availability')
          .select('*')
          .gte('date', selectedDateString)
          .lte('date', selectedDateString);
        
        console.log('🔍 Debug - Requête avec gte/lte:', debugAvailabilities?.length || 0);
        console.log('🔍 Debug - Données:', debugAvailabilities);
        
        setAvailableDrivers([]);
        setShowDrivers(true);
        return;
      }
      
      // Étape 2: Filtrer par heure (vérifier que l'heure demandée est dans les créneaux)
      console.log('🕐 Étape 2: Filtrage par heure...');
      const availableDriverIds = new Set();
      
      dateAvailabilities.forEach(availability => {
        const startTime = availability.start_time; // Format HH:MM
        const endTime = availability.end_time;     // Format HH:MM
        
        console.log(`🔍 Chauffeur ${availability.driver_id}: ${startTime} - ${endTime} vs ${selectedTimeString}`);
        
        // Vérifier si l'heure demandée est dans le créneau
        if (selectedTimeString >= startTime && selectedTimeString <= endTime) {
          availableDriverIds.add(availability.driver_id);
          console.log(`✅ Chauffeur ${availability.driver_id} disponible à ${selectedTimeString}`);
        } else {
          console.log(`❌ Chauffeur ${availability.driver_id} non disponible à ${selectedTimeString}`);
        }
      });
      
      console.log('👥 Chauffeurs disponibles à cette heure:', availableDriverIds.size);
      
      if (availableDriverIds.size === 0) {
        console.warn('⚠️ Aucun chauffeur disponible à cette heure');
        setAvailableDrivers([]);
        setShowDrivers(true);
        return;
      }
      
      // Étape 3: Récupérer les données des chauffeurs disponibles
      console.log('📡 Étape 3: Récupération des données des chauffeurs disponibles...');
      
      // Récupérer le type de véhicule sélectionné
      const selectedVehicleType = watch('vehicleType');
      console.log('🚗 Type de véhicule sélectionné:', selectedVehicleType);
      
      const { data: activeDrivers, error: driversError } = await supabase
        .from('drivers')
        .select('id, first_name, last_name, email, phone, city, license_number, vehicle_info, status, profile_photo_url, created_at, updated_at')
        .eq('status', 'active')
        .in('id', Array.from(availableDriverIds));
      
      if (driversError) {
        console.error('❌ Erreur lors de la récupération des chauffeurs:', driversError);
        setAvailableDrivers([]);
        setShowDrivers(true);
        return;
      }
      
      console.log('📊 Chauffeurs actifs récupérés:', activeDrivers?.length || 0);
      
      if (!activeDrivers || activeDrivers.length === 0) {
        console.warn('⚠️ Aucun chauffeur actif trouvé parmi les disponibles');
        setAvailableDrivers([]);
        setShowDrivers(true);
        return;
      }
      
      // Étape 4: Formater les données des chauffeurs et filtrer par type de véhicule
      let availableDriversData = activeDrivers.filter(driver => 
        availableDriverIds.has(driver.id)
      );

      // Filtrer par type de véhicule si spécifié
      if (selectedVehicleType) {
        console.log('🔍 Filtrage par type de véhicule (compat JSON + table vehicles):', selectedVehicleType);
        
        // 1) Filtrer via l'ancien JSON vehicle_info si présent
        const matchViaVehicleInfo = new Set(
          availableDriversData
            .filter(driver => driver.vehicle_info && driver.vehicle_info.type === selectedVehicleType)
            .map(d => d.id)
        );

        // 2) Rechercher dans la table vehicles pour TOUS les chauffeurs disponibles
        const allDriverIds = availableDriversData.map(d => d.id);
        const vehiclesByDriver = new Map();
        
        if (allDriverIds.length > 0) {
          const { data: vehiclesRows, error: vehiclesErr } = await supabase
            .from('vehicles')
            .select('driver_id, make, model, year, color, license_plate, seats, type, photo_url, is_vip')
            .in('driver_id', allDriverIds)
            .eq('type', selectedVehicleType)
            .is('deleted_at', null);
          
          if (vehiclesErr) {
            console.warn('⚠️ Erreur lookup vehicles:', vehiclesErr);
          } else if (vehiclesRows && vehiclesRows.length > 0) {
            // Stocker le premier véhicule correspondant pour chaque chauffeur
            vehiclesRows.forEach(v => {
              if (!vehiclesByDriver.has(v.driver_id)) {
                vehiclesByDriver.set(v.driver_id, {
                  make: v.make,
                  model: v.model,
                  year: v.year,
                  color: v.color,
                  licensePlate: v.license_plate,
                  seats: v.seats,
                  type: v.type,
                  photoUrl: v.photo_url,
                  isVip: v.is_vip ?? false
                });
              }
              matchViaVehicleInfo.add(v.driver_id);
            });
            console.log('✅ Chauffeurs avec véhicule de type', selectedVehicleType, 'dans la table vehicles:', vehiclesRows.length);
          }
        }

        // 3) Filtrer pour ne garder que les chauffeurs qui ont au moins un véhicule du type demandé
        availableDriversData = availableDriversData.filter(d => matchViaVehicleInfo.has(d.id));
        
        // 4) Remplacer vehicle_info par le véhicule correspondant si disponible dans la table vehicles
        availableDriversData = availableDriversData.map(driver => {
          const matchingVehicle = vehiclesByDriver.get(driver.id);
          if (matchingVehicle) {
            // Si on a trouvé un véhicule correspondant dans la table vehicles, l'utiliser
            return { ...driver, vehicle_info: matchingVehicle };
          } else if (driver.vehicle_info && driver.vehicle_info.type === selectedVehicleType) {
            // Sinon, garder le vehicle_info si son type correspond
            return driver;
          }
          return driver;
        });
        
        console.log('📊 Chauffeurs après filtrage par type:', availableDriversData.length);
      }
      
      // Étape 4.5: Vérifier le quota d'abonnement de chaque chauffeur
      console.log('🔍 Étape 4.5: Vérification des quotas d\'abonnement...');
      const driversWithValidSubscription = [];
      const lifetimeByDriver = new Map<string, number>();
      
      for (const driver of availableDriversData) {
        try {
          const { data: subscriptionData, error: subscriptionError } = await supabase
            .rpc('get_driver_subscription_status', { p_driver_id: driver.id });
          
          if (subscriptionError) {
            console.warn(`⚠️ Erreur vérification abonnement pour ${driver.id}:`, subscriptionError);
            continue;
          }
          
          if (subscriptionData && subscriptionData.length > 0) {
            const status = subscriptionData[0];
            console.log(`📊 Chauffeur ${driver.first_name} ${driver.last_name}:`, {
              type: status.subscription_type,
              courses: status.monthly_accepted_bookings,
              canAccept: status.can_accept_more_bookings
            });
            if (typeof status.lifetime_accepted_bookings === 'number') {
              lifetimeByDriver.set(driver.id, status.lifetime_accepted_bookings);
            }
            
            // Inclure uniquement si le chauffeur peut accepter plus de courses
            if (status.can_accept_more_bookings) {
              driversWithValidSubscription.push(driver);
              console.log(`✅ Chauffeur ${driver.first_name} ${driver.last_name} peut accepter des courses`);
            } else {
              console.log(`❌ Chauffeur ${driver.first_name} ${driver.last_name} a atteint son quota (${status.monthly_accepted_bookings} courses)`);
            }
          }
        } catch (error) {
          console.error(`❌ Erreur inattendue pour ${driver.id}:`, error);
        }
      }
      
      console.log('✅ Chauffeurs avec quota valide:', driversWithValidSubscription.length);
      
      if (driversWithValidSubscription.length === 0) {
        console.warn('⚠️ Aucun chauffeur disponible (tous ont atteint leur quota)');
        setAvailableDrivers([]);
        setShowDrivers(true);
        return;
      }

      const formattedDrivers = driversWithValidSubscription.map(driver => {
        const legacyVehicleInfo = driver.vehicle_info as any;
        const normalizedVehicleInfo = legacyVehicleInfo
          ? {
              ...legacyVehicleInfo,
              isVip: legacyVehicleInfo.isVip ?? legacyVehicleInfo.is_vip ?? false
            }
          : undefined;
        return {
          id: driver.id,
          firstName: driver.first_name,
          lastName: driver.last_name,
          email: driver.email,
          phone: driver.phone,
          city: driver.city,
          licenseNumber: driver.license_number,
          vehicleInfo: normalizedVehicleInfo,
          status: driver.status,
          profilePhotoUrl: driver.profile_photo_url,
          createdAt: driver.created_at,
          updatedAt: driver.updated_at,
          bookingCount: lifetimeByDriver.get(driver.id)
        };
      });

      // Étape 5: Trier les chauffeurs en priorisant la photo véhicule, puis proximité
      console.log('📍 Étape 5: Tri (photo véhicule d\'abord, puis proximité)...');
      
      if (pickupCoords) {
        console.log('📍 Coordonnées du point de départ:', pickupCoords);
        
        // Calculer la distance pour chaque chauffeur
        const driversWithDistance = await Promise.all(
          formattedDrivers.map(async (driver) => {
            let distance = Infinity; // Distance par défaut si on ne peut pas calculer
            
            if (driver.city) {
              try {
                // Calculer la distance entre la ville du chauffeur et le point de départ
                // Utiliser des coordonnées approximatives pour les villes
                const cityCoords = getCityCoordinates(driver.city);
                if (cityCoords) {
                  const calculatedDistance = calculateDistance(
                    cityCoords.latitude,
                    cityCoords.longitude,
                    pickupCoords.latitude,
                    pickupCoords.longitude
                  );
                if (calculatedDistance !== null) {
                  distance = calculatedDistance;
                  console.log(`📏 Distance ${driver.firstName} ${driver.lastName} (${driver.city}): ${distance} km`);
                } else {
                  console.warn(`⚠️ Impossible de calculer la distance pour ${driver.city}`);
                  }
                }
              } catch (error) {
                console.error(`❌ Erreur calcul distance pour ${driver.city}:`, error);
              }
            } else {
              console.warn(`⚠️ Ville non renseignée pour ${driver.firstName} ${driver.lastName}`);
            }
            
            return {
              ...driver,
              distanceFromPickup: distance
            };
          })
        );
        
        // Récupérer les notes moyennes pour les chauffeurs disponibles
        try {
          const driverIds = driversWithDistance.map(d => d.id);
          if (driverIds.length > 0) {
            const { data: ratingRows, error: ratingErr } = await supabase
              .from('driver_rating_stats')
              .select('driver_id, average_rating, total_ratings')
              .in('driver_id', driverIds);
            if (ratingErr) {
              console.warn('⚠️ Erreur récupération notes chauffeurs:', ratingErr);
            }
            const ratingsByDriver = new Map<string, { average_rating: any; total_ratings: number }>();
            (ratingRows || []).forEach(r => {
              ratingsByDriver.set(r.driver_id, {
                average_rating: r.average_rating,
                total_ratings: r.total_ratings
              });
            });
            // Attacher les notes aux objets chauffeurs
            for (let i = 0; i < driversWithDistance.length; i++) {
              const d = driversWithDistance[i];
              const stats = ratingsByDriver.get(d.id);
              if (stats) {
                (d as any).averageRating = typeof stats.average_rating === 'number' ? stats.average_rating : parseFloat(stats.average_rating);
                (d as any).totalRatings = stats.total_ratings;
              }
            }
            // Fallback: récupérer un nombre approximatif de courses depuis bookings si pas fourni par l'abonnement
            const driversMissingCount = driversWithDistance.filter((d: any) => typeof d.bookingCount !== 'number');
            if (driversMissingCount.length > 0) {
              const driverIds = driversMissingCount.map(d => d.id);
              const { data: bookingCounts, error: bookingErr } = await supabase
                .from('bookings')
                .select('driver_id')
                .in('driver_id', driverIds)
                .in('status', ['accepted','in_progress','completed']);
              if (bookingErr) {
                console.warn('⚠️ Erreur récupération compte bookings:', bookingErr);
              }
              const countsByDriver = new Map<string, number>();
              (bookingCounts || []).forEach((row: any) => {
                const current = countsByDriver.get(row.driver_id) || 0;
                countsByDriver.set(row.driver_id, current + 1);
              });
              for (let i = 0; i < driversWithDistance.length; i++) {
                const d = driversWithDistance[i] as any;
                if (typeof d.bookingCount !== 'number') {
                  d.bookingCount = countsByDriver.get(d.id) || 0;
                }
              }
            }
          }
        } catch (err) {
          console.warn('⚠️ Impossible d\'attacher les notes aux chauffeurs:', err);
        }
        
        // Trier par distance croissante (le plus proche en premier)
        const sortedDrivers = driversWithDistance.sort((a: any, b: any) => {
          // 1) Priorité aux chauffeurs avec photo de véhicule
          const aPhoto = !!a.vehicleInfo?.photoUrl;
          const bPhoto = !!b.vehicleInfo?.photoUrl;
          if (aPhoto !== bPhoto) return aPhoto ? -1 : 1;
          // 2) Puis meilleure note moyenne
          const aRating = typeof a.averageRating === 'number' ? a.averageRating : -1;
          const bRating = typeof b.averageRating === 'number' ? b.averageRating : -1;
          if (aRating !== bRating) return bRating - aRating;
          // 3) Enfin, proximité (distance)
          if (a.distanceFromPickup === Infinity && b.distanceFromPickup !== Infinity) return 1;
          if (a.distanceFromPickup !== Infinity && b.distanceFromPickup === Infinity) return -1;
          return a.distanceFromPickup - b.distanceFromPickup;
        });
        
        console.log('📊 Chauffeurs triés par distance:', sortedDrivers.map(d => ({
          name: `${d.firstName} ${d.lastName}`,
          city: d.city,
          distance: d.distanceFromPickup === Infinity ? 'Non calculée' : `${d.distanceFromPickup} km`
        })));
        
        setAvailableDrivers(sortedDrivers);
      } else {
        console.log('⚠️ Pas de coordonnées de départ');
        // Attacher les notes même sans coordonnées pour afficher le badge
        let driversWithRatings: any[] = [...formattedDrivers];
        try {
          const driverIds = driversWithRatings.map(d => d.id);
          if (driverIds.length > 0) {
            const { data: ratingRows, error: ratingErr } = await supabase
              .from('driver_rating_stats')
              .select('driver_id, average_rating, total_ratings')
              .in('driver_id', driverIds);
            if (ratingErr) {
              console.warn('⚠️ Erreur récupération notes chauffeurs (no pickup):', ratingErr);
            }
            const ratingsByDriver = new Map<string, { average_rating: any; total_ratings: number }>();
            (ratingRows || []).forEach(r => {
              ratingsByDriver.set(r.driver_id, {
                average_rating: r.average_rating,
                total_ratings: r.total_ratings
              });
            });
            driversWithRatings = driversWithRatings.map(d => {
              const stats = ratingsByDriver.get(d.id);
              if (!stats) return d;
              return {
                ...d,
                averageRating: typeof stats.average_rating === 'number' ? stats.average_rating : parseFloat(stats.average_rating),
                totalRatings: stats.total_ratings
              };
            });
            // Fallback: récupérer un nombre approximatif de courses depuis bookings si pas fourni par l'abonnement
            const missingCountIds = driversWithRatings.filter((d: any) => typeof d.bookingCount !== 'number').map((d: any) => d.id);
            if (missingCountIds.length > 0) {
              const { data: bookingCounts, error: bookingErr } = await supabase
                .from('bookings')
                .select('driver_id')
                .in('driver_id', missingCountIds)
                .in('status', ['accepted','in_progress','completed']);
              if (bookingErr) {
                console.warn('⚠️ Erreur récupération compte bookings (no pickup):', bookingErr);
              }
              const countsByDriver = new Map<string, number>();
              (bookingCounts || []).forEach((row: any) => {
                const current = countsByDriver.get(row.driver_id) || 0;
                countsByDriver.set(row.driver_id, current + 1);
              });
              driversWithRatings = driversWithRatings.map((d: any) => (
                typeof d.bookingCount === 'number' ? d : { ...d, bookingCount: countsByDriver.get(d.id) || 0 }
              ));
            }
          }
        } catch (err) {
          console.warn('⚠️ Impossible d\'attacher les notes (no pickup):', err);
        }

        // Tri: photo véhicule -> note -> nom
        console.log('🔢 Tri (photo véhicule d\'abord, puis note, puis nom)');
        const sortedDrivers = driversWithRatings.sort((a: any, b: any) => {
          const aPhoto = !!a.vehicleInfo?.photoUrl;
          const bPhoto = !!b.vehicleInfo?.photoUrl;
          if (aPhoto !== bPhoto) return aPhoto ? -1 : 1;
          const aRating = typeof a.averageRating === 'number' ? a.averageRating : -1;
          const bRating = typeof b.averageRating === 'number' ? b.averageRating : -1;
          if (aRating !== bRating) return bRating - aRating;
          const aName = `${a.firstName} ${a.lastName}`;
          const bName = `${b.firstName} ${b.lastName}`;
          return aName.localeCompare(bName);
        });
        setAvailableDrivers(sortedDrivers);
      }
      
      setShowDrivers(true);
      console.log('✅ Interface mise à jour avec', formattedDrivers.length, 'chauffeurs triés par proximité');
      
    } catch (error) {
      console.error('💥 Erreur inattendue:', error);
      console.error('Stack trace:', error);
      setAvailableDrivers([]);
      setShowDrivers(true);
    }
  };

  const onSubmit = async (data: BookingFormData) => {
    if (!estimatedDistance || !estimatedPrice || !pickupCoords || !destinationCoords) {
      alert('Veuillez saisir des adresses valides pour calculer le prix');
      return;
    }

    if (isShortTripBlockedForNonTaxi) {
      alert(
        `Pour une distance aller inférieure à ${SHORT_TRIP_NON_TAXI_WARNING_KM} km avec ce type de véhicule, augmentez la distance du trajet ou choisissez le type « Taxi » pour les courses courtes.`
      );
      return;
    }

    if (!selectedDriver) {
      alert('Veuillez sélectionner un chauffeur');
      return;
    }
    setIsSubmitting(true);
    
    try {
      const bookingData = {
        client_id: clientId,
        driver_id: selectedDriver,
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
      console.log('👤 Chauffeur sélectionné ID:', selectedDriver);
      console.log('🧑‍💼 Client ID:', clientId);
      const { data: booking, error } = await supabase
        .from('bookings')
        .insert(bookingData)
        .select()
        .single();

      if (error) {
        console.error('Erreur lors de la création de la réservation:', error);
        console.error('Détails de l\'erreur:', error.message, error.code, error.details);
        alert('Erreur lors de la création de la réservation');
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
        .eq('id', selectedDriver)
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
        const driverData = availableDrivers.find(d => d.id === selectedDriver);
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
        </div>

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
                  className="absolute ml-2 margin-right-10 text-blue-600 hover:text-blue-700 disabled:opacity-50 z-10  bg-transparent"
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
              className={`block w-full px-3 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all appearance-none ${
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
              className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500 focus:ring-2"
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
              className={`block w-full px-3 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all ${
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
                className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500 focus:ring-2"
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
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <Loader2 size={24} className="text-blue-600 animate-spin" />
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-blue-900">
                    Calcul du trajet en cours...
                  </h3>
                  <p className="text-sm sm:text-base text-blue-700">
                    Géolocalisation des adresses et calcul de la distance
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Debug: Affichage des valeurs */}
          {console.log('🔍 Debug section calcul:', {
            estimatedDistance,
            estimatedPrice,
            isCalculating,
            pickupCoords,
            destinationCoords,
            watchVehicleType
          })}

          {/* Estimation de prix */}
          {estimatedDistance && estimatedPrice && !isCalculating && (
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <Route className="w-6 h-6 text-purple-600" />
                <h3 className="text-base sm:text-lg font-semibold text-purple-900">
                  Estimation du trajet
                  {watchIsReturnTrip && (
                    <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                      Trajet retour
                    </span>
                  )}
                </h3>
              </div>
              {vipMultiplier > 1 && (
                <div className="mb-4 rounded-lg border border-purple-200 bg-purple-50 px-4 py-3 text-sm text-purple-800">
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
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Route size={24} className="text-blue-600" />
                  </div>
                  <p className="text-sm text-gray-600 mb-1">
                    Distance {watchIsReturnTrip && '(aller-retour)'}
                  </p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">
                    {estimatedDistance} km
                  </p>
                </div>
                <div className="bg-white rounded-lg p-4 text-center">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Calculator size={24} className="text-purple-600" />
                  </div>
                  <p className="text-sm text-gray-600 mb-1">
                    Prix total {watchIsReturnTrip && '(avec retour)'}
                  </p>
                  <p className="text-xl sm:text-2xl font-bold text-purple-600">
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

                      const pricing = getProgressivePriceBreakdown(effectiveDistance);
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
                              <div className="flex items-center justify-between text-blue-600 font-semibold">
                                <span>Multiplicateur ({vehicleTypeName})</span>
                                <span className="tabular-nums">×{vehicleMultiplier}</span>
                              </div>
                            )}
                            {vipMultiplier > 1 && (
                              <div className="flex items-center justify-between text-purple-700 font-semibold">
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
              disabled={!isValid || !estimatedPrice || isShortTripBlockedForNonTaxi}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <User className="w-5 h-5 mr-2" />
              Rechercher des chauffeurs disponibles
            </Button>
            
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
          {showDrivers && (
            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Car className="w-5 h-5" />
                Chauffeurs disponibles ({availableDrivers.length})
              </h3>
              
              {availableDrivers.length === 0 ? (
                <div className="text-center py-8">
                  <Car className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-2">Aucun chauffeur disponible</p>
                  <p className="text-sm text-gray-500">
                    Essayez de modifier la date/heure ou les adresses
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {availableDrivers.map((driver) => (
                    <div
                      key={driver.id}
                      className={`border-2 rounded-lg p-3 sm:p-4 cursor-pointer transition-all ${
                        selectedDriver === driver.id
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedDriver(driver.id)}
                    >
                      {/* Photo du véhicule en grand */}
                      {driver.vehicleInfo?.photoUrl && (
                        <div className="w-full h-36 sm:h-40 bg-gray-100 rounded-lg overflow-hidden mb-3">
                          <img
                            src={driver.vehicleInfo.photoUrl}
                            alt={`${driver.vehicleInfo.make} ${driver.vehicleInfo.model}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      
                      {/* Informations chauffeur */}
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                          {driver.profilePhotoUrl ? (
                            <img
                              src={driver.profilePhotoUrl}
                              alt={`${driver.firstName} ${driver.lastName}`}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <User className="w-6 h-6 text-gray-500" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1 flex-wrap">
                                <h4 className="font-medium text-gray-900 text-sm sm:text-base flex-shrink-0">
                                {driver.firstName} {driver.lastName}
                              </h4>
                                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-semibold flex-shrink-0 ${
                                  typeof (driver as any).averageRating === 'number' && (driver as any).totalRatings > 0
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-gray-100 text-gray-600'
                                }`}>
                                  <Star size={10} className={
                                    typeof (driver as any).averageRating === 'number' && (driver as any).totalRatings > 0
                                      ? 'text-yellow-500'
                                      : 'text-gray-400'
                                  } />
                                  {typeof (driver as any).averageRating === 'number' && (driver as any).totalRatings > 0
                                    ? (driver as any).averageRating.toFixed(1)
                                    : 'Nouveau'}
                                </span>
                                {typeof driver.bookingCount === 'number' && driver.bookingCount > 0 && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[9px] sm:text-[10px] font-semibold flex-shrink-0">
                                    ~{Math.max(1, Math.round(driver.bookingCount / 5) * 5)} courses
                                  </span>
                                )}
                              </div>
                              {driver.city && (
                                <p className="text-xs sm:text-sm text-gray-600 flex items-center gap-1 flex-wrap">
                                  <MapPin size={12} className="flex-shrink-0" />
                                  <span>{driver.city}</span>
                                  {typeof driver.distanceFromPickup === 'number' && driver.distanceFromPickup > 0 && driver.distanceFromPickup !== Infinity && (
                                    <span className="text-blue-600 font-medium">
                                      • {driver.distanceFromPickup} km
                                    </span>
                                  )}
                                </p>
                              )}
                            </div>
                            {selectedDriver === driver.id && (
                              <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600 flex-shrink-0" />
                            )}
                          </div>
                          
                      {/* Informations véhicule */}
                      {driver.vehicleInfo && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-2">
                          <div className="flex items-center gap-2 mb-1">
                            <Car size={12} className="text-blue-600 flex-shrink-0" />
                            <p className="text-xs font-semibold text-blue-900 truncate">
                              {driver.vehicleInfo.make} {driver.vehicleInfo.model}
                            </p>
                            {driver.vehicleInfo.isVip && (
                              <span className="ml-auto inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-semibold bg-purple-100 text-purple-700">
                                VIP
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-1 text-[10px] sm:text-xs text-blue-700">
                            <span className="bg-blue-100 px-1.5 py-0.5 rounded">{driver.vehicleInfo.color}</span>
                            <span className="bg-blue-100 px-1.5 py-0.5 rounded">
                              {driver.vehicleInfo.type === 'sedan' && 'Berline'}
                              {driver.vehicleInfo.type === 'pickup' && 'Pickup'}
                              {driver.vehicleInfo.type === 'van' && 'Van'}
                              {driver.vehicleInfo.type === 'minibus' && 'Minibus'}
                              {driver.vehicleInfo.type === 'bus' && 'Bus'}
                              {driver.vehicleInfo.type === 'truck' && 'Camion'}
                              {driver.vehicleInfo.type === 'utility' && 'Utilitaire'}
                              {driver.vehicleInfo.type === 'taxi' && 'Taxi'}
                            </span>
                            {driver.vehicleInfo.seats && (
                              <span className="bg-blue-100 px-1.5 py-0.5 rounded">{driver.vehicleInfo.seats} places</span>
                            )}
                          </div>
                        </div>
                      )}
                          
                          {/* Badge de proximité pour le chauffeur le plus proche */}
                          {typeof driver.distanceFromPickup === 'number' && driver.distanceFromPickup !== Infinity && driver.distanceFromPickup > 0 && driver.distanceFromPickup <= 10 && (
                            <div className="mt-2 inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                              <MapPin size={12} />
                              Chauffeur proche
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
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
              className="block w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
            />
          </div>

          {/* Bouton de soumission */}
          <Button
            type="submit"
            disabled={isSubmitting || !selectedDriver || !estimatedPrice || isShortTripBlockedForNonTaxi}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white py-4 px-6 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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