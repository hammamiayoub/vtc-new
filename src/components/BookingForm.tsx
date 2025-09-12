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
    
    // Debug: Vérifier l'utilisateur connecté
    const { data: { user }, error: userError } = await supabase.auth.getUser();
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
            const { data: testData, error: testError } = await supabase
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
      
      const { data: activeDrivers, error: driversError } = await supabase
        .from('drivers')
        .select('*')
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
      
      // Étape 4: Formater les données des chauffeurs
      const availableDriversData = activeDrivers.filter(driver => 
        availableDriverIds.has(driver.id)
      );
      
      console.log('✅ Chauffeurs finalement disponibles:', availableDriversData.length);

      const formattedDrivers = availableDriversData.map(driver => ({
        id: driver.id,
        firstName: driver.first_name,
        lastName: driver.last_name,
        email: driver.email,
        phone: driver.phone,
        licenseNumber: driver.license_number,
        vehicleInfo: driver.vehicle_info,
        status: driver.status,
        profilePhotoUrl: driver.profile_photo_url,
        createdAt: driver.created_at,
        updatedAt: driver.updated_at
      }));

      console.log('🔄 Formatage terminé - Chauffeurs disponibles à cette date/heure:', formattedDrivers.length);
      
      setAvailableDrivers(formattedDrivers);
      setShowDrivers(true);
      console.log('✅ Interface mise à jour avec', formattedDrivers.length, 'chauffeurs');
      
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
      
      // Envoi des notifications email via Edge Function
      console.log('📧 === ENVOI D\'EMAILS VIA RESEND ===');
      
      try {
        // Récupérer les données du client
        const { data: clientData, error: clientError } = await supabase
          .from('clients')
          .select('first_name, last_name, email, phone')
          .eq('id', clientId)
          .single();

        if (clientError) {
          console.error('Erreur récupération client pour email:', clientError);
        }

        // Récupérer les données du chauffeur
        const { data: driverData, error: driverError } = await supabase
          .from('drivers')
          .select('first_name, last_name, email, phone, vehicle_info')
          .eq('id', selectedDriver)
          .single();

        if (driverError) {
          console.error('Erreur récupération chauffeur pour email:', driverError);
        }

        // Appel à l'Edge Function pour envoyer les emails
        if (clientData && driverData) {
          console.log('🚀 Appel Edge Function send-booking-notification...');
          
          const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-booking-notification`;
          
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
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white rounded-lg p-4 text-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Route size={24} className="text-blue-600" />
                  </div>
                  <p className="text-sm text-gray-600 mb-1">Distance</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">
                    {estimatedDistance} km
                  </p>
                </div>
                <div className="bg-white rounded-lg p-4 text-center">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Calculator size={24} className="text-purple-600" />
                  </div>
                  <p className="text-sm text-gray-600 mb-1">Prix total</p>
                  <p className="text-xl sm:text-2xl font-bold text-purple-600">
                    {estimatedPrice} TND
                  </p>
                </div>
                <div className="bg-white rounded-lg p-4 text-center">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <CheckCircle size={24} className="text-green-600" />
                  </div>
                  <p className="text-sm text-gray-600 mb-1">Tarif</p>
                  <p className="text-base sm:text-lg font-bold text-gray-900">
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
            <Button
              type="button"
              onClick={searchAvailableDrivers}
              disabled={!isValid || !estimatedPrice}
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
                      className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                        selectedDriver === driver.id
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedDriver(driver.id)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                          {driver.profilePhotoUrl ? (
                            <img
                              src={driver.profilePhotoUrl}
                              alt={`${driver.firstName} ${driver.lastName}`}
                              className="w-12 h-12 rounded-full object-cover"
                            />
                          ) : (
                            <User className="w-6 h-6 text-gray-500" />
                          )}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">
                            {driver.firstName} {driver.lastName}
                          </h4>
                          <p className="text-sm text-gray-600">{driver.email}</p>
                          {driver.phone && (
                            <p className="text-sm text-gray-600">{driver.phone}</p>
                          )}
                          {driver.vehicleInfo && (
                            <div className="mt-2">
                              <p className="text-xs text-gray-500">
                                {driver.vehicleInfo.make} {driver.vehicleInfo.model} - {driver.vehicleInfo.color}
                              </p>
                            </div>
                          )}
                        </div>
                        {selectedDriver === driver.id && (
                          <CheckCircle className="w-6 h-6 text-purple-600" />
                        )}
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