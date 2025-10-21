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
  Star,
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
  calculateDrivingDistance,
  calculatePrice, 
  calculatePriceWithSurcharges,
  getPricePerKm,
  getVehicleMultiplier,
  getCurrentPosition,
  popularAddresses,
  calculateDistanceFromCity,
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
  const [pickupSuggestions, setPickupSuggestions] = useState<string[]>([]);
  const [destinationSuggestions, setDestinationSuggestions] = useState<string[]>([]);
  const [showPickupSuggestions, setShowPickupSuggestions] = useState(false);
  const [showDestinationSuggestions, setShowDestinationSuggestions] = useState(false);
  const [priceSurcharges, setPriceSurcharges] = useState<PriceSurcharges | null>(null);

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

  // Recalcul du prix et de la distance quand le trajet retour ou la date/heure change
  useEffect(() => {
    if (baseDistance && watchVehicleType !== undefined && watchScheduledTime) {
      // Calculer la distance finale (avec ou sans retour)
      const finalDistance = watchIsReturnTrip ? baseDistance * 2 : baseDistance;
      setEstimatedDistance(finalDistance);
      
      // Calculer le prix de base
      const basePrice = calculatePrice(baseDistance, watchVehicleType);
      
      // Appliquer le multiplicateur de trajet retour si nécessaire
      let priceBeforeSurcharges = watchIsReturnTrip ? basePrice * 1.8 : basePrice;
      
      // Calculer les suppléments (nuit et week-end)
      const { surcharges, finalPrice } = calculatePriceWithSurcharges(
        baseDistance,
        watchVehicleType,
        watchScheduledTime
      );
      
      // Appliquer aussi les suppléments au trajet retour si nécessaire
      if (watchIsReturnTrip) {
        priceBeforeSurcharges = basePrice * 1.8;
        const totalSurcharge = priceBeforeSurcharges * (surcharges.totalSurchargePercent / 100);
        const finalPriceWithReturnAndSurcharges = priceBeforeSurcharges + totalSurcharge;
        setEstimatedPrice(Math.round(finalPriceWithReturnAndSurcharges * 100) / 100);
        
        // Mettre à jour les suppléments pour refléter le prix avec retour
        setPriceSurcharges({
          ...surcharges,
          totalSurcharge: Math.round(totalSurcharge * 100) / 100
        });
      } else {
        setEstimatedPrice(finalPrice);
        setPriceSurcharges(surcharges);
      }
    } else if (baseDistance && watchVehicleType !== undefined && !watchScheduledTime) {
      // Si pas de date/heure, calculer sans supplément
      const finalDistance = watchIsReturnTrip ? baseDistance * 2 : baseDistance;
      setEstimatedDistance(finalDistance);
      
      const basePrice = calculatePrice(baseDistance, watchVehicleType);
      const finalPrice = watchIsReturnTrip ? basePrice * 1.8 : basePrice;
      
      setEstimatedPrice(Math.round(finalPrice * 100) / 100);
      setPriceSurcharges(null);
    }
  }, [watchVehicleType, baseDistance, watchIsReturnTrip, watchScheduledTime]);

  // Calcul automatique de la distance et du prix
  useEffect(() => {
    const calculateRoute = async () => {
      if (watchPickup && watchDestination && watchPickup.length > 3 && watchDestination.length > 3) {
        setIsCalculating(true);
        
        try {
          // Essayer d'abord de récupérer les coordonnées des villes prédéfinies
          const [pickupCoordsResult, destinationCoordsResult] = await Promise.all([
            getCityCoordinates(watchPickup),
            getCityCoordinates(watchDestination)
          ]);

          let pickupResult, destinationResult;

          // Si les coordonnées de ville ne sont pas trouvées, utiliser le géocodage
          if (pickupCoordsResult) {
            pickupResult = {
              coordinates: pickupCoordsResult,
              formattedAddress: watchPickup
            };
          } else {
            pickupResult = await geocodeAddress(watchPickup);
          }

          if (destinationCoordsResult) {
            destinationResult = {
              coordinates: destinationCoordsResult,
              formattedAddress: watchDestination
            };
          } else {
            destinationResult = await geocodeAddress(watchDestination);
          }

          if (pickupResult && destinationResult) {
            setPickupCoords(pickupResult.coordinates);
            setDestinationCoords(destinationResult.coordinates);

            // Calculer la distance routière de base (sans retour)
            let distance = await calculateDrivingDistance(
              pickupResult.coordinates.latitude,
              pickupResult.coordinates.longitude,
              destinationResult.coordinates.latitude,
              destinationResult.coordinates.longitude
            );

            // Si la distance routière n'est pas disponible, utiliser la distance à vol d'oiseau
            if (distance === null) {
              distance = calculateDistance(
                pickupResult.coordinates.latitude,
                pickupResult.coordinates.longitude,
                destinationResult.coordinates.latitude,
                destinationResult.coordinates.longitude
              );
            }

            // Stocker la distance de base (sans retour)
            setBaseDistance(distance);
          } else {
            setEstimatedDistance(null);
            setEstimatedPrice(null);
            setBaseDistance(null);
            setPickupCoords(null);
            setDestinationCoords(null);
          }
        } catch (error) {
          console.error('Erreur lors du calcul de la route:', error);
          setEstimatedDistance(null);
          setEstimatedPrice(null);
          setBaseDistance(null);
        } finally {
          setIsCalculating(false);
        }
      } else {
        setEstimatedDistance(null);
        setEstimatedPrice(null);
        setBaseDistance(null);
        setPickupCoords(null);
        setDestinationCoords(null);
      }
    };

    // Délai pour éviter trop d'appels API
    const timeoutId = setTimeout(calculateRoute, 1000);
    return () => clearTimeout(timeoutId);
  }, [watchPickup, watchDestination, watch]);

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
            .select('driver_id, make, model, year, color, license_plate, seats, type, photo_url')
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
                  photoUrl: v.photo_url
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
            // En cas d'erreur, on inclut le chauffeur par défaut
            driversWithValidSubscription.push(driver);
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
          } else {
            // Si pas de données, inclure par défaut
            driversWithValidSubscription.push(driver);
          }
        } catch (error) {
          console.error(`❌ Erreur inattendue pour ${driver.id}:`, error);
          // En cas d'erreur, on inclut le chauffeur par défaut
          driversWithValidSubscription.push(driver);
        }
      }
      
      console.log('✅ Chauffeurs avec quota valide:', driversWithValidSubscription.length);
      
      if (driversWithValidSubscription.length === 0) {
        console.warn('⚠️ Aucun chauffeur disponible (tous ont atteint leur quota)');
        setAvailableDrivers([]);
        setShowDrivers(true);
        return;
      }

      const formattedDrivers = driversWithValidSubscription.map(driver => ({
        id: driver.id,
        firstName: driver.first_name,
        lastName: driver.last_name,
        email: driver.email,
        phone: driver.phone,
        city: driver.city,
        licenseNumber: driver.license_number,
        vehicleInfo: driver.vehicle_info,
        status: driver.status,
        profilePhotoUrl: driver.profile_photo_url,
        createdAt: driver.created_at,
        updatedAt: driver.updated_at,
        bookingCount: lifetimeByDriver.get(driver.id)
      }));

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
                const calculatedDistance = await calculateDistanceFromCity(driver.city, pickupCoords);
                if (calculatedDistance !== null) {
                  distance = calculatedDistance;
                  console.log(`📏 Distance ${driver.firstName} ${driver.lastName} (${driver.city}): ${distance} km`);
                } else {
                  console.warn(`⚠️ Impossible de calculer la distance pour ${driver.city}`);
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

    // Vérification de la distance minimale
    if (estimatedDistance < 25) {
      alert(
        '⚠️ Distance minimale requise\n\n' +
        'Les réservations sont disponibles uniquement pour les trajets de 25 km et plus.\n\n' +
        `Distance actuelle : ${estimatedDistance} km\n\n` +
        'Pour les trajets courts, veuillez utiliser un taxi local ou un service de VTC urbain.'
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
    <div className="max-w-4xl mx-auto px-4 sm:px-0">
      <div className="bg-white rounded-xl shadow-sm p-8">
        <div className="mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            Réserver une course
          </h2>
          <p className="text-sm sm:text-base text-gray-600">
            Renseignez les détails de votre trajet en Tunisie
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* Adresses avec géolocalisation */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                  Le chauffeur vous attendra et vous ramènera au point de départ
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
                <div className="bg-white rounded-lg p-4 text-center">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Calculator size={24} className="text-green-600" />
                  </div>
                  <p className="text-sm text-gray-600 mb-1">Calcul</p>
                  <div className="text-xs sm:text-sm font-medium text-gray-900">
                    {(() => {
                      if (!estimatedDistance) return '';
                      const { price, discount } = getPricePerKm(estimatedDistance);
                      const selectedVehicleType = watch('vehicleType');
                      const vehicleMultiplier = getVehicleMultiplier(selectedVehicleType);
                      const vehicleTypeName = vehicleTypeOptions.find(opt => opt.value === selectedVehicleType)?.label || 'Standard';
                      
                      return (
                        <div>
                          <div>
                            {watchIsReturnTrip ? 
                              `${(estimatedDistance / 2).toFixed(1)} km × 2 (retour) × ${price.toFixed(2)} TND/km` :
                              `${estimatedDistance} km × ${price.toFixed(2)} TND/km`
                            }
                          </div>
                          {discount && <div className="text-green-600 font-semibold">{discount}</div>}
                          {vehicleMultiplier > 1 && (
                            <div className="text-blue-600 font-semibold">
                              ×{vehicleMultiplier} ({vehicleTypeName})
                            </div>
                          )}
                          {watchIsReturnTrip && (
                            <div className="text-orange-600 font-semibold">
                              ×1.8 (trajet retour)
                            </div>
                          )}
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

          {/* Date et heure */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Clock className="inline w-4 h-4 mr-2" />
              Date et heure de départ
            </label>
            <input
              {...register('scheduledTime')}
              type="datetime-local"
              min={getMinDateTime()}
              className={`block w-full px-3 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all ${
                errors.scheduledTime ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.scheduledTime && (
              <p className="mt-2 text-sm text-red-600">{errors.scheduledTime.message}</p>
            )}
          </div>

          {/* Recherche de chauffeurs */}
          <div>
            {/* Alerte si distance < 25km */}
            {estimatedDistance && estimatedDistance < 25 && (
              <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-amber-900 mb-1">Distance minimale non atteinte</h4>
                    <p className="text-sm text-amber-800 mb-2">
                      Les réservations sont disponibles uniquement pour les trajets de <strong>25 km et plus</strong>.
                    </p>
                    <p className="text-sm text-amber-700">
                      Distance actuelle : <strong>{estimatedDistance} km</strong>
                    </p>
                    <p className="text-xs text-amber-600 mt-2">
                      💡 Pour les trajets courts, nous vous recommandons d'utiliser un taxi local ou un service de VTC urbain.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <Button
              type="button"
              onClick={searchAvailableDrivers}
              disabled={!isValid || !estimatedPrice || (estimatedDistance !== null && estimatedDistance < 25)}
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
                                  {driver.vehicleInfo.type === 'limousine' && 'Limousine'}
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
            disabled={isSubmitting || !selectedDriver || !estimatedPrice}
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
