import React, { useState, useEffect } from 'react';
import { User, Car, Clock, MapPin, LogOut, UserCircle, Bell, AlertCircle, Navigation, Phone, CheckCircle, XCircle, MessageSquare, FileText, Package } from 'lucide-react';
import { TransporteurRequests } from './TransporteurRequests';
import { Button } from './ui/Button';
import { DriverProfileForm } from './DriverProfileForm';
import { AvailabilityCalendar } from './AvailabilityCalendar';
import { ProfileModal } from './ProfileModal';
import { NotificationBell } from './NotificationBell';
import { DriverRatingDisplay } from './DriverRatingDisplay';
import { NotificationPermission } from './NotificationPermission';
import { Footer } from './Footer';
import { useDriverNotifications } from '../hooks/useNotifications';
import { pushNotificationService } from '../utils/pushNotifications';
import { VehicleImageUpload } from './ui/VehicleImageUpload';
import { DriverVehicles } from './DriverVehicles';
import { DriverSubscription } from './DriverSubscription';
import { uploadVehicleImage, deleteVehicleImage } from '../utils/imageUpload';
import { supabase } from '../lib/supabase';
import { analytics } from '../utils/analytics';
import { Driver, Booking, DriverAcceptedParcelTrip } from '../types';
import { fetchDriverAcceptedParcelTrips, completeParcelDelivery } from '../utils/parcelService';
import { DriverParcelTripCard } from './DriverParcelTripCard';
import { AppDownloadModal } from './AppDownloadModal';

interface DriverDashboardProps {
  onLogout: () => void;
}

export const DriverDashboard: React.FC<DriverDashboardProps> = ({ onLogout }) => {
  const [driver, setDriver] = useState<Driver | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [parcelTrips, setParcelTrips] = useState<DriverAcceptedParcelTrip[]>([]);
  const [completingParcelRequestId, setCompletingParcelRequestId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'availability' | 'vehicles' | 'bookings' | 'subscription' | 'parcel-requests'>('dashboard');
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [uploadingVehiclePhoto, setUploadingVehiclePhoto] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<{
    canAcceptMoreBookings: boolean;
    hasActiveSubscription?: boolean;
    subscriptionType?: 'free' | 'premium';
    subscriptionEndDate?: string | null;
    remainingFreeBookings?: number;
    lastPaidSubscriptionEnd?: string | null;
    hadPaidSubscription?: boolean;
  } | null>(null);
  const [isDownloadOpen, setIsDownloadOpen] = useState(false);
  const [showExpiredSubscriptionModal, setShowExpiredSubscriptionModal] = useState(false);

  // Hook pour les notifications
  const { unreadCount, hasNewBookings, markAsRead } = useDriverNotifications(driver?.id || '');

  const fetchDriverData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data: driverData, error } = await supabase
          .from('drivers')
          .select('*')
          .eq('id', user.id)
          .neq('status', 'deleted') // Exclure les comptes supprimés
          .single();

        if (error) {
          console.error('Erreur lors de la récupération des données:', error);
        } else {
          setDriver({
            id: driverData.id,
            firstName: driverData.first_name,
            lastName: driverData.last_name,
            email: driverData.email,
            phone: driverData.phone,
            city: driverData.city,
            licenseNumber: driverData.license_number,
            vehicleInfo: driverData.vehicle_info,
            status: driverData.status,
            driverType: driverData.driver_type || 'vtc',
            profilePhotoUrl: driverData.profile_photo_url,
            createdAt: driverData.created_at,
            updatedAt: driverData.updated_at
          });
        }
      }
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDriverData();
  }, []);

  // Show app download modal once per session (first load/refresh only)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const flagKey = 'td_app_modal_shown_session';
    const alreadyShown = window.sessionStorage.getItem(flagKey) === '1';
    if (alreadyShown) return;
    const t = setTimeout(() => {
      setIsDownloadOpen(true);
      window.sessionStorage.setItem(flagKey, '1');
    }, 600);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (driver?.id) {
      checkSubscriptionStatus();
    }
  }, [driver?.id]);

  const fetchSubscriptionStatus = async () => {
    if (!driver?.id) return null;

    try {
      const { data, error } = await supabase
        .rpc('get_driver_subscription_status', { p_driver_id: driver.id });

      if (error) {
        console.error('Erreur vérification statut abonnement:', error);
        return null;
      }

      let lastPaidSubscriptionEnd: string | null = null;
      let hadPaidSubscription = false;

      const { data: lastPaidSub } = await supabase
        .from('driver_subscriptions')
        .select('end_date')
        .eq('driver_id', driver.id)
        .eq('payment_status', 'paid')
        .order('end_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (lastPaidSub?.end_date) {
        lastPaidSubscriptionEnd = lastPaidSub.end_date;
        hadPaidSubscription = true;
      }

      if (data && data.length > 0) {
        return {
          canAcceptMoreBookings: data[0].can_accept_more_bookings,
          hasActiveSubscription: data[0].has_active_subscription,
          subscriptionType: data[0].subscription_type,
          subscriptionEndDate: data[0].subscription_end_date,
          remainingFreeBookings: data[0].remaining_free_bookings,
          lastPaidSubscriptionEnd,
          hadPaidSubscription
        };
      }
    } catch (error) {
      console.error('Erreur:', error);
    }

    return null;
  };

  const checkSubscriptionStatus = async () => {
    const status = await fetchSubscriptionStatus();
    if (status) {
      setSubscriptionStatus(status);
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined' || !subscriptionStatus || !driver?.id) return;

    const hasActiveSubscription = subscriptionStatus.hasActiveSubscription;
    const remainingFree = subscriptionStatus.remainingFreeBookings ?? 0;
    const lastEndDate = subscriptionStatus.lastPaidSubscriptionEnd
      ? new Date(subscriptionStatus.lastPaidSubscriptionEnd)
      : null;
    const activeEndDate = subscriptionStatus.subscriptionEndDate
      ? new Date(subscriptionStatus.subscriptionEndDate)
      : null;
    const now = new Date();

    const premiumExpired = subscriptionStatus.hadPaidSubscription && !hasActiveSubscription;
    const endDatePassed =
      (activeEndDate && activeEndDate < now) ||
      (lastEndDate && lastEndDate < now);
    const noFreeRidesLeft = remainingFree <= 0;
    const shouldShow = premiumExpired || endDatePassed || noFreeRidesLeft;

    const sessionKey = `td_driver_subscription_modal_${driver.id}`;
    const dismissed = window.sessionStorage.getItem(sessionKey) === 'dismissed';

    if (shouldShow && !dismissed) {
      setShowExpiredSubscriptionModal(true);
    } else if (!shouldShow) {
      setShowExpiredSubscriptionModal(false);
    }
  }, [subscriptionStatus, driver?.id]);

  useEffect(() => {
    const fetchBookings = async () => {
      if (driver) {
        console.log('=== DEBUT DIAGNOSTIC CHAUFFEUR ===');
        console.log('ID du chauffeur:', driver.id);
        
        try {
          // Vérifier l'utilisateur connecté
          const { data: { user } } = await supabase.auth.getUser();
          console.log('Utilisateur connecté:', user?.id);
          console.log('Correspondance user/driver:', user?.id === driver.id);
          
          // Récupérer les réservations du chauffeur avec les informations client
          console.log('📡 Récupération des réservations avec informations client...');
          
          const { data: bookingsData, error: bookingsError } = await supabase
            .from('bookings')
            .select('*')
            .eq('driver_id', driver.id)
            .order('created_at', { ascending: false });

          if (bookingsError) {
            console.error('Erreur récupération réservations:', bookingsError);
            setBookings([]);
            return;
          }

          console.log('Réservations récupérées:', bookingsData?.length || 0);

          if (!bookingsData || bookingsData.length === 0) {
            setBookings([]);
          } else {
          // Récupérer les informations des clients pour chaque réservation
          const bookingsWithClients = await Promise.all(
            bookingsData.map(async (booking) => {
              if (booking.client_id) {
                const { data: clientData, error: clientError } = await supabase
                  .from('clients')
                  .select('first_name, last_name, phone, email')
                  .eq('id', booking.client_id)
                  .maybeSingle();

                if (clientError) {
                  console.error('Erreur récupération client:', clientError);
                  return { ...booking, clients: null };
                }

                return { ...booking, clients: clientData };
              }
              return { ...booking, clients: null };
            })
          );

          console.log('Réservations avec clients:', bookingsWithClients.length);
          console.log('📊 Détails des réservations:', bookingsWithClients.map(b => ({
            id: b.id.slice(0, 8),
            status: b.status,
            client: b.clients ? `${b.clients.first_name} ${b.clients.last_name}` : 'Pas de client',
            phone: b.clients?.phone || 'Pas de téléphone',
            email: b.clients?.email || 'Pas d\'email'
          })));

          setBookings(bookingsWithClients);
          }

          const isTransporteur =
            driver.driverType === 'transporteur' || driver.driverType === 'both';
          if (isTransporteur) {
            try {
              const trips = await fetchDriverAcceptedParcelTrips(driver.id);
              setParcelTrips(trips);
            } catch (parcelErr) {
              console.error('Erreur récupération transports colis:', parcelErr);
              setParcelTrips([]);
            }
          } else {
            setParcelTrips([]);
          }
        } catch (error) {
          console.error('Erreur:', error);
        }
      }
    };

    fetchBookings();
  }, [driver]);

  useEffect(() => {
    if (activeTab !== 'bookings' || !driver?.id) return;
    const isTransporteur =
      driver.driverType === 'transporteur' || driver.driverType === 'both';
    if (!isTransporteur) return;

    fetchDriverAcceptedParcelTrips(driver.id)
      .then(setParcelTrips)
      .catch((err) => console.error('Erreur refresh colis (onglet courses):', err));
  }, [activeTab, driver?.id, driver?.driverType]);

  // Fonction pour rafraîchir les réservations après une action
  const refreshBookings = async () => {
    if (driver) {
      try {
        const { data: bookingsData, error: bookingsError } = await supabase
          .from('bookings')
          .select('*')
          .eq('driver_id', driver.id)
          .order('created_at', { ascending: false });

        if (bookingsError) {
          console.error('Erreur refresh réservations:', bookingsError);
          return;
        }

        if (!bookingsData || bookingsData.length === 0) {
          setBookings([]);
        } else {
          const bookingsWithClients = await Promise.all(
            bookingsData.map(async (booking) => {
              if (booking.client_id) {
                const { data: clientData, error: clientError } = await supabase
                  .from('clients')
                  .select('first_name, last_name, phone, email')
                  .eq('id', booking.client_id)
                  .maybeSingle();

                if (clientError) {
                  console.error('Erreur récupération client:', clientError);
                  return { ...booking, clients: null };
                }

                return { ...booking, clients: clientData };
              }
              return { ...booking, clients: null };
            })
          );

          setBookings(bookingsWithClients);
        }

        const isTransporteur =
          driver.driverType === 'transporteur' || driver.driverType === 'both';
        if (isTransporteur) {
          try {
            const trips = await fetchDriverAcceptedParcelTrips(driver.id);
            setParcelTrips(trips);
          } catch (parcelErr) {
            console.error('Erreur refresh transports colis:', parcelErr);
          }
        }
      } catch (error) {
        console.error('Erreur refresh:', error);
      }
    }
  };

  const updateBookingStatus = async (bookingId: string, newStatus: string) => {
    try {
      console.log('🔄 Mise à jour du statut:', { bookingId, newStatus });
      
      // Vérifier le quota si on accepte une nouvelle course
      if (newStatus === 'accepted') {
        const currentSubscriptionStatus = await fetchSubscriptionStatus();

        if (currentSubscriptionStatus && !currentSubscriptionStatus.canAcceptMoreBookings) {
          setSubscriptionStatus(currentSubscriptionStatus);
          alert(
            '❌ Limite de courses gratuites atteinte\n\n' +
            'Vous avez déjà accepté 3 courses avec votre compte gratuit.\n\n' +
            'Pour continuer à accepter des courses, veuillez souscrire à l\'abonnement Premium (35.70 TND/mois).\n\n' +
            'Rendez-vous dans l\'onglet "Abonnement" pour plus d\'informations.'
          );
          return;
        }
      }
      
      // Récupérer les détails de la réservation avant la mise à jour
      const booking = bookings.find(b => b.id === bookingId);
      if (!booking) {
        alert('Réservation non trouvée');
        return;
      }

      const { error } = await supabase
        .from('bookings')
        .update({ 
          status: newStatus,
          pickup_time: newStatus === 'in_progress' ? new Date().toISOString() : undefined,
          completion_time: newStatus === 'completed' ? new Date().toISOString() : undefined
        })
        .eq('id', bookingId);

      if (error) {
        console.error('Erreur lors de la mise à jour:', error);
        if (error.message?.includes('subscription_required')) {
          alert(
            '❌ Limite de courses gratuites atteinte\n\n' +
            'Vous avez déjà accepté 3 courses avec votre compte gratuit.\n\n' +
            'Pour continuer à accepter des courses, veuillez souscrire à l\'abonnement Premium (35.70 TND/mois).\n\n' +
            'Rendez-vous dans l\'onglet "Abonnement" pour plus d\'informations.'
          );
          await checkSubscriptionStatus();
        } else {
          alert('Erreur lors de la mise à jour du statut');
        }
        return;
      }

      console.log('✅ Statut mis à jour avec succès');
      
      // Rafraîchir le statut d'abonnement après acceptation
      if (newStatus === 'accepted') {
        await checkSubscriptionStatus();
      }
      
      // Envoyer notifications selon le statut
      if (newStatus === 'accepted' && booking.clients) {
        try {
          await pushNotificationService.notifyClientBookingAcceptedByDriver(
            booking.clients.first_name + ' ' + booking.clients.last_name,
            driver?.firstName + ' ' + driver?.lastName || 'Chauffeur',
            booking.pickupAddress,
            new Date(booking.scheduledTime).toLocaleDateString('fr-FR')
          );
          console.log('✅ Notification d\'acceptation envoyée au client');
          
          // Tracker la conversion itinéraire quand le chauffeur accepte
          console.log('🗺️ Tracking conversion itinéraire (acceptation chauffeur)...');
          analytics.trackItineraryConversion();
        } catch (notificationError) {
          console.error('❌ Erreur lors de l\'envoi de la notification:', notificationError);
        }

        // Envoyer email de notification d'acceptation
        try {
          console.log('📧 Envoi email d\'acceptation au client...');
          console.log('📊 Booking data brut:', booking);
          
          const emailPayload = {
            bookingData: {
              id: booking.id,
              pickup_address: booking.pickup_address,
              destination_address: booking.destination_address,
              scheduled_time: booking.scheduled_time,
              distance_km: booking.distance_km,
              price_tnd: booking.price_tnd,
              notes: booking.notes
            },
            clientData: {
              first_name: booking.clients.first_name,
              last_name: booking.clients.last_name,
              email: booking.clients.email
            },
            driverData: {
              first_name: driver?.firstName || '',
              last_name: driver?.lastName || '',
              phone: driver?.phone || '',
              vehicle_info: driver?.vehicleInfo || null
            },
            status: 'accepted'
          };
          
          console.log('📧 Payload complet envoyé:', emailPayload);
          
          const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-booking-status-notification`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(emailPayload)
          });

          if (response.ok) {
            console.log('✅ Email d\'acceptation envoyé avec succès');
          } else {
            console.error('❌ Erreur envoi email:', await response.text());
          }
        } catch (emailError) {
          console.error('❌ Erreur lors de l\'envoi de l\'email:', emailError);
        }
      } else if (newStatus === 'completed' && booking.clients) {
        try {
          await pushNotificationService.notifyClientBookingCompleted(
            booking.clients.first_name + ' ' + booking.clients.last_name,
            driver?.firstName + ' ' + driver?.lastName || 'Chauffeur',
            booking.pickupAddress
          );
          console.log('✅ Notification de fin de course envoyée au client');
        } catch (notificationError) {
          console.error('❌ Erreur lors de l\'envoi de la notification:', notificationError);
        }
      }
      
      // Rafraîchir les données après la mise à jour
      await refreshBookings();
    } catch (error) {
      console.error('Erreur:', error);
      alert('Une erreur est survenue');
    }
  };

  const canCancelBooking = (booking: { scheduled_time?: string; status: string }) => {
    try {
      if (!booking?.scheduled_time) return false;
      const scheduledMs = new Date(booking.scheduled_time).getTime();
      const nowMs = Date.now();
      const hoursUntil = (scheduledMs - nowMs) / 36e5;
      return hoursUntil >= 24 && (booking.status === 'pending' || booking.status === 'accepted');
    } catch {
      return false;
    }
  };

  const cancelBookingByDriver = async (bookingId: string) => {
    console.log('🚫🚫🚫 === FONCTION cancelBookingByDriver APPELÉE === 🚫🚫🚫');
    console.log('🚫 === DÉBUT ANNULATION PAR CHAUFFEUR ===');
    console.log('📋 Booking ID:', bookingId);
    
    // Récupérer les détails de la réservation pour vérifier le délai
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) {
      alert('Réservation non trouvée');
      return;
    }
    
    // Vérifier le délai de 24h
    if (!canCancelBooking(booking)) {
      const scheduledTime = new Date(booking.scheduled_time);
      const now = new Date();
      const hoursUntil = (scheduledTime.getTime() - now.getTime()) / 36e5;
      
      alert(
        `⚠️ Annulation impossible\n\n` +
        `Les réservations ne peuvent être annulées que si elles sont programmées dans plus de 24 heures.\n\n` +
        `Cette course est prévue dans ${Math.round(hoursUntil)} heure(s).\n\n` +
        `Pour annuler cette réservation, veuillez contacter directement le client par téléphone :\n` +
        `${booking.clients?.phone || 'Numéro non disponible'}\n\n` +
        `Client : ${booking.clients?.first_name} ${booking.clients?.last_name}`
      );
      return;
    }
    
    const confirmed = window.confirm(
      "Confirmer l'annulation de cette course ?\n\n" +
      "Cette action sera notifiée au client par email et notification push.\n\n" +
      "⚠️ L'annulation fréquente peut affecter votre réputation."
    );
    if (!confirmed) return;
    
    console.log('📊 Booking trouvé:', booking);
    
    try {

      const { error } = await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', bookingId);
      
      if (error) {
        alert("Impossible d'annuler la course: " + error.message);
        return;
      }

      console.log('✅ Statut mis à jour en "cancelled" dans la DB');

      // Envoyer notification push au client
      console.log('📍 Vérification client - clients:', !!booking.clients);
      
      if (booking.clients) {
        try {
          await pushNotificationService.notifyClientBookingCancelledByDriver(
            booking.clients.first_name + ' ' + booking.clients.last_name,
            driver?.firstName + ' ' + driver?.lastName || 'Chauffeur',
            booking.pickup_address
          );
          console.log('✅ Notification push envoyée au client');
        } catch (notificationError) {
          console.error('❌ Erreur lors de l\'envoi de la notification push:', notificationError);
        }
      } else {
        console.log('⚠️ Pas de données client chargées, notification push non envoyée');
      }

      // Envoyer emails d'annulation via send-booking-status-notification
      // Toujours envoyer, même si booking.clients n'est pas chargé
      console.log('📧 === TENTATIVE ENVOI EMAILS ===');
      console.log('Booking clients:', booking.clients);
      console.log('Booking client_id:', booking.client_id);
      console.log('Driver email:', driver?.email);
      
      try {
        console.log('📧 Préparation emails d\'annulation...');
        console.log('📊 Booking data brut:', booking);
        
        // Récupérer les données complètes du client depuis la DB
        let clientEmail = '';
        let clientFirstName = '';
        let clientLastName = '';
        
        if (booking.client_id) {
          const { data: clientData, error: clientError } = await supabase
            .from('clients')
            .select('email, first_name, last_name')
            .eq('id', booking.client_id)
            .maybeSingle();

          if (clientError) {
            console.error('❌ Erreur récupération données client:', clientError);
          } else if (clientData) {
            clientEmail = clientData.email || '';
            clientFirstName = clientData.first_name || '';
            clientLastName = clientData.last_name || '';
            console.log('✅ Email client récupéré:', clientEmail);
          }
        } else {
          console.error('❌ Aucun client_id dans le booking');
        }
        
        if (!clientEmail) {
          console.error('❌ Impossible de récupérer l\'email du client, emails non envoyés');
        } else {
          const emailPayload = {
            bookingData: {
              id: booking.id,
              pickup_address: booking.pickup_address,
              destination_address: booking.destination_address,
              scheduled_time: booking.scheduled_time,
              distance_km: booking.distance_km,
              price_tnd: booking.price_tnd,
              notes: booking.notes,
              booking_url: window.location.origin + '/client-login'
            },
            clientData: {
              first_name: clientFirstName,
              last_name: clientLastName,
              email: clientEmail
            },
            driverData: {
              first_name: driver?.firstName || '',
              last_name: driver?.lastName || '',
              email: driver?.email || '',
              phone: driver?.phone || '',
              vehicle_info: driver?.vehicleInfo || null
            },
            status: 'cancelled',
            cancelledBy: 'driver'
          };

          console.log('📧 Payload envoyé:', emailPayload);
          console.log('📧 URL fonction:', `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-booking-status-notification`);

          const emailResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-booking-status-notification`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(emailPayload)
          });

          console.log('📡 Réponse HTTP status:', emailResponse.status);
          
          const emailResult = await emailResponse.json();
          console.log('📡 Réponse JSON:', emailResult);
          
          if (emailResponse.ok && emailResult.success) {
            console.log('✅ Emails d\'annulation envoyés:', emailResult.message);
            console.log('📊 Résultats:', emailResult.results);
          } else {
            console.error('❌ Erreur envoi emails d\'annulation:', emailResult.error);
            console.error('📊 Détails:', emailResult);
          }
        }
      } catch (emailError) {
        console.error('❌ Erreur lors de l\'envoi des emails d\'annulation:', emailError);
        console.error('❌ Stack trace:', emailError);
      }

      // Rafraîchir les données
      await refreshBookings();
    } catch (error) {
      console.error('Erreur:', error);
      alert('Une erreur est survenue');
    }
  };

  const handleVehiclePhotoUpload = async (file: File) => {
    if (!driver) return;
    
    setUploadingVehiclePhoto(true);
    try {
      await uploadVehicleImage(file, driver.id);
      // Recharger les données du chauffeur pour voir la nouvelle photo
      window.location.reload();
    } catch (error) {
      console.error('Erreur upload photo véhicule:', error);
      alert('Erreur lors de l\'upload de la photo du véhicule');
    } finally {
      setUploadingVehiclePhoto(false);
    }
  };

  const handleVehiclePhotoDelete = async () => {
    if (!driver?.vehicleInfo?.photoUrl) return;
    
    try {
      await deleteVehicleImage(driver.vehicleInfo.photoUrl, driver.id);
      // Recharger les données du chauffeur
      window.location.reload();
    } catch (error) {
      console.error('Erreur suppression photo véhicule:', error);
      alert('Erreur lors de la suppression de la photo du véhicule');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    onLogout();
  };

  const handleProfileComplete = () => {
    setShowProfileForm(false);
    // Refresh driver data
    window.location.reload();
  };

  // Profil à compléter si info perso incomplètes (le véhicule est géré séparément)
  const needsProfileCompletion = !driver?.phone || !driver?.licenseNumber || !driver?.city;

  const pendingBookings = bookings.filter(b => b.status === 'pending');
  const acceptedBookings = bookings
    .filter(b => b.status === 'accepted')
    .sort((a, b) => new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime());
  const completedBookings = bookings.filter(b => b.status === 'completed');
  const totalEarnings = completedBookings.reduce((sum, booking) => sum + booking.price_tnd, 0);

  const activeParcelTrips = parcelTrips
    .filter((t) => t.request.status === 'accepted')
    .sort((a, b) => a.request.desiredDate.localeCompare(b.request.desiredDate));
  const completedParcelTrips = parcelTrips
    .filter((t) => t.request.status === 'completed')
    .sort((a, b) => {
      const aDate = a.request.completedAt || a.request.desiredDate;
      const bDate = b.request.completedAt || b.request.desiredDate;
      return bDate.localeCompare(aDate);
    });

  const reloadParcelTrips = async () => {
    if (!driver?.id) return;
    const isTransporteur =
      driver.driverType === 'transporteur' || driver.driverType === 'both';
    if (!isTransporteur) {
      setParcelTrips([]);
      return;
    }
    const trips = await fetchDriverAcceptedParcelTrips(driver.id);
    setParcelTrips(trips);
  };

  useEffect(() => {
    if (!driver?.id) return;
    const isTransporteur =
      driver.driverType === 'transporteur' || driver.driverType === 'both';
    if (!isTransporteur) return;

    const channel = supabase
      .channel(`driver-parcel-trips-${driver.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'parcel_quote_proposals',
          filter: `driver_id=eq.${driver.id}`,
        },
        () => {
          fetchDriverAcceptedParcelTrips(driver.id)
            .then(setParcelTrips)
            .catch((err) => console.error('Realtime colis (proposals):', err));
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'parcel_quote_requests',
        },
        () => {
          fetchDriverAcceptedParcelTrips(driver.id)
            .then(setParcelTrips)
            .catch((err) => console.error('Realtime colis (requests):', err));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [driver?.id, driver?.driverType]);

  const handleCompleteParcelDelivery = async (requestId: string) => {
    if (
      !window.confirm(
        'Confirmer que la livraison a bien été effectuée ? Cette action clôture le transport.'
      )
    ) {
      return;
    }
    setCompletingParcelRequestId(requestId);
    try {
      await completeParcelDelivery(requestId);
      await reloadParcelTrips();
    } catch (err) {
      console.error('Erreur clôture livraison colis:', err);
      alert(
        err instanceof Error
          ? err.message
          : 'Impossible de confirmer la livraison. Réessayez ou contactez le support.'
      );
    } finally {
      setCompletingParcelRequestId(null);
    }
  };
  const historyBookings = bookings.filter(
    (b) => !['pending', 'accepted', 'in_progress'].includes(b.status)
  );
  const showParcelInBookings =
    driver?.driverType === 'transporteur' || driver?.driverType === 'both';
  const totalTripsCount = bookings.length + (showParcelInBookings ? parcelTrips.length : 0);

  console.log('📊 Statistiques chauffeur:', {
    totalBookings: bookings.length,
    pendingBookings: pendingBookings.length,
    completedBookings: completedBookings.length,
    driverId: driver?.id
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <Clock size={12} />
            En attente d'acceptation
          </span>
        );
      case 'accepted':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <Clock size={12} />
            Programmée
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <Car size={12} />
            En cours
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle size={12} />
            Terminée
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircle size={12} />
            Annulée
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            {status}
          </span>
        );
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const premiumExpired =
    Boolean(subscriptionStatus?.hadPaidSubscription && !subscriptionStatus?.hasActiveSubscription);
  const quotaDepleted = (subscriptionStatus?.remainingFreeBookings ?? 1) <= 0;
  const expirationDateString = subscriptionStatus?.subscriptionEndDate
    ? new Date(subscriptionStatus.subscriptionEndDate).toLocaleDateString('fr-FR')
    : subscriptionStatus?.lastPaidSubscriptionEnd
      ? new Date(subscriptionStatus.lastPaidSubscriptionEnd).toLocaleDateString('fr-FR')
      : null;
  const subscriptionModalMessage = premiumExpired
    ? `${
        expirationDateString
          ? `Votre abonnement Premium a expiré le ${expirationDateString}.`
          : 'Votre dernier abonnement Premium est arrivé à expiration.'
      } Souscrivez à un nouvel abonnement pour continuer à recevoir des courses.`
    : 'Vous avez utilisé vos 3 courses gratuites. Souscrivez à l\'abonnement Premium pour continuer à recevoir des courses.';

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <AppDownloadModal isOpen={isDownloadOpen} onClose={() => setIsDownloadOpen(false)} />
      {/* Header */}
      <header className="bg-black border-b border-gray-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 sm:h-20">
            <div className="flex items-center gap-3">
              <div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white tracking-tight">TuniDrive</h1>
                <p className="text-sm sm:text-base lg:text-lg text-white hidden sm:block">Espace Chauffeur</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-4">
              <NotificationBell
                unreadCount={unreadCount}
                hasNewNotifications={hasNewBookings}
                onClick={() => {
                  markAsRead();
                  setActiveTab('bookings');
                }}
                className="text-gray-300 hover:text-white hover:bg-gray-800"
              />
              <button
                onClick={() => setShowProfileModal(true)}
                className="p-2 text-gray-300 hover:text-white rounded-lg hover:bg-gray-800 transition-colors"
                title="Mon profil"
              >
                <UserCircle size={22} />
              </button>
              <Button onClick={handleLogout} className="flex items-center gap-1 sm:gap-2 bg-white border-2 border-gray-300 text-gray-900 hover:bg-gray-50 rounded-lg font-medium transition-all duration-200 text-sm sm:text-base px-2 sm:px-4">
                <LogOut size={14} className="sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Déconnexion</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-2 sm:space-x-8 overflow-x-auto">
            <button
              onClick={() => { setActiveTab('dashboard'); setShowProfileForm(false); }}
              className={`py-3 sm:py-4 px-2 sm:px-1 border-b-2 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap ${
                activeTab === 'dashboard'
                  ? 'border-black text-black'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Tableau de bord
            </button>
            <button
              onClick={() => { setActiveTab('availability'); setShowProfileForm(false); }}
              className={`py-3 sm:py-4 px-2 sm:px-1 border-b-2 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap ${
                activeTab === 'availability'
                  ? 'border-black text-black'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Mes disponibilités
            </button>
            <button
              onClick={() => { setActiveTab('vehicles'); setShowProfileForm(false); }}
              className={`py-3 sm:py-4 px-2 sm:px-1 border-b-2 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap ${
                activeTab === 'vehicles'
                  ? 'border-black text-black'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Mes véhicules
            </button>
            <button
              onClick={() => { setActiveTab('bookings'); setShowProfileForm(false); }}
              className={`py-3 sm:py-4 px-2 sm:px-1 border-b-2 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap ${
                activeTab === 'bookings'
                  ? 'border-black text-black'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Mes courses ({totalTripsCount})
              {pendingBookings.length > 0 && (
                <span className="ml-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-600 rounded-full">
                  {pendingBookings.length}
                </span>
              )}
            </button>
            {(driver?.driverType === 'transporteur' || driver?.driverType === 'both') && (
              <button
                onClick={() => { setActiveTab('parcel-requests'); setShowProfileForm(false); }}
                className={`py-3 sm:py-4 px-2 sm:px-1 border-b-2 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap flex items-center gap-1 ${
                  activeTab === 'parcel-requests'
                    ? 'border-black text-black'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Mes devis de colis
              </button>
            )}
            <button
              onClick={() => { setActiveTab('subscription'); setShowProfileForm(false); }}
              className={`py-3 sm:py-4 px-2 sm:px-1 border-b-2 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap ${
                activeTab === 'subscription'
                  ? 'border-black text-black'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Mon abonnement
            </button>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 w-full">
        {/* Notification Permission */}
        <NotificationPermission />

        {/* Alerte abonnement si limite proche ou atteinte */}
        {driver && subscriptionStatus && !subscriptionStatus.canAcceptMoreBookings && (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-xl p-6 mb-8">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-gradient-to-r from-amber-500 to-orange-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <AlertCircle className="text-white" size={24} />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-amber-900 mb-2">
                  ⚠️ Limite mensuelle atteinte
                </h3>
                <p className="text-amber-800 mb-4">
                  Vous avez accepté vos 3 courses gratuites. Vous ne pouvez plus accepter de nouvelles courses.
                </p>
                <p className="text-amber-900 font-semibold mb-4">
                  💡 Passez à l'abonnement Premium pour continuer à recevoir des courses !
                </p>
                <div className="flex gap-3">
                  <Button
                    onClick={() => setActiveTab('subscription')}
                    className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold"
                  >
                    Voir l'abonnement Premium
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Profile Completion Alert */}
        {needsProfileCompletion && !showProfileForm && activeTab === 'dashboard' && (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 mb-8">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-6 h-6 text-gray-700 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-2">
                  Complétez votre profil
                </h3>
                <p className="text-gray-700 mb-4">
                  Pour commencer à recevoir des courses, vous devez compléter vos informations
                  personnelles.
                </p>
                <Button
                  onClick={() => setShowProfileForm(true)}
                  className="bg-black hover:bg-gray-800 text-white"
                >
                  Compléter mon profil
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Profile Form */}
        {showProfileForm && driver && activeTab === 'dashboard' && (
          <div className="mb-8">
            <DriverProfileForm
              driverId={driver.id}
              initialDriverType={driver.driverType}
              onProfileComplete={handleProfileComplete}
            />
          </div>
        )}

        {/* Contenu conditionnel basé sur l'onglet actif */}
        {!showProfileForm && activeTab === 'dashboard' && (
          <>
            {showExpiredSubscriptionModal && (
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center px-4">
                <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="w-6 h-6 text-red-600" />
                    <h3 className="text-xl font-bold text-gray-900">Abonnement expiré</h3>
                  </div>
                  <p className="text-gray-700">{subscriptionModalMessage}</p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                      className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700"
                      onClick={() => {
                        if (typeof window !== 'undefined' && driver) {
                          window.sessionStorage.setItem(`td_driver_subscription_modal_${driver.id}`, 'dismissed');
                        }
                        setShowExpiredSubscriptionModal(false);
                        setActiveTab('subscription');
                      }}
                    >
                      Voir l'abonnement
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        if (typeof window !== 'undefined' && driver) {
                          window.sessionStorage.setItem(`td_driver_subscription_modal_${driver.id}`, 'dismissed');
                        }
                        setShowExpiredSubscriptionModal(false);
                      }}
                    >
                      Plus tard
                    </Button>
                  </div>
                </div>
              </div>
            )}
            {/* Welcome Section */}
            <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                {driver?.profilePhotoUrl ? (
                  <img
                    src={driver.profilePhotoUrl}
                    alt="Photo de profil"
                    className="w-16 h-16 rounded-2xl object-cover"
                  />
                ) : (
                  <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center flex-shrink-0">
                    <User size={32} className="text-gray-700" />
                  </div>
                )}
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                    Bienvenue, {driver?.firstName} {driver?.lastName}
                  </h2>
                  <p className="text-sm sm:text-base text-gray-600">Tableau de bord chauffeur</p>
                </div>
              </div>
              {/* Directive légale pour les chauffeurs */}
              <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="text-yellow-900 font-semibold mb-2">
                  Responsabilités et obligations des chauffeurs indépendants
                </h4>
                <p className="text-yellow-900 text-sm mb-2">
                  Les prestations de transport sont entièrement exécutées sous la responsabilité des chauffeurs indépendants, lesquels :
                </p>
                <ul className="list-disc pl-5 text-yellow-900 text-sm space-y-1">
                  <li>
                    Sont tenus de disposer de toutes les autorisations légales nécessaires à l'exercice du transport de personnes à titre onéreux (permis, autorisations, assurance, etc.) conformément à la réglementation tunisienne ;
                  </li>
                  <li>
                    Ils assument seuls les obligations liées à la sécurité, la conformité des véhicules et le respect du code de la route.
                  </li>
                </ul>
                
                {/* Lien vers le document légal */}
                <div className="mt-4 pt-3 border-t border-yellow-300">
                  <a 
                    href="/Cadre Légal – Transport De Personnes Par Des Particuliers En Tunisie.pdf"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-yellow-800 hover:text-yellow-900 font-medium text-sm transition-colors"
                  >
                    <FileText size={16} />
                    Consulter le cadre légal du transport de personnes en Tunisie
                  </a>
                </div>
              </div>
            </div>

            {/* Status and Stats Cards */}
            <div className="mb-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                      driver?.status === 'active' ? 'bg-green-100' : 'bg-gray-100'
                    }`}>
                      <Clock size={24} className={driver?.status === 'active' ? 'text-green-600' : 'text-gray-700'} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 text-sm sm:text-base">Statut</h3>
                      <p className="text-sm text-gray-600">
                        {driver?.status === 'active' ? 'Actif' : 'En attente'}
                      </p>
                    </div>
                  </div>
                  <div className={`border rounded-lg p-4 ${
                    driver?.status === 'active' 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-orange-50 border-orange-200'
                  }`}>
                    <p className={`text-sm ${
                      driver?.status === 'active' ? 'text-green-800' : 'text-orange-800'
                    }`}>
                      {driver?.status === 'active' 
                        ? 'Votre compte est actif et vous pouvez recevoir des courses.'
                        : 'Votre compte est en cours de validation. Vous recevrez un email une fois approuvé.'
                      }
                    </p>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                      <Car size={24} className="text-gray-700" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 text-sm sm:text-base">Nouvelles demandes</h3>
                      <p className="text-sm text-gray-600">À traiter</p>
                    </div>
                  </div>
                  <p className="text-2xl sm:text-3xl font-bold text-gray-900">{pendingBookings.length}</p>
                  {pendingBookings.length > 0 && (
                    <p className="text-xs sm:text-sm text-gray-700 font-medium mt-1">
                      {pendingBookings.length} course{pendingBookings.length > 1 ? 's' : ''} en attente
                    </p>
                  )}
                </div>

                <div className="bg-white rounded-xl shadow-sm p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                      <MapPin size={24} className="text-gray-700" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 text-sm sm:text-base">Courses terminées</h3>
                      <p className="text-sm text-gray-600">Total</p>
                    </div>
                  </div>
                  <p className="text-2xl sm:text-3xl font-bold text-gray-900">{completedBookings.length}</p>
                  <p className="text-xs sm:text-sm text-gray-700 font-medium mt-1">
                    {totalEarnings.toFixed(2)} TND gagnés
                  </p>
                </div>

                {/* Carte des notes */}
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                      <MessageSquare size={24} className="text-yellow-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 text-sm sm:text-base">Notes clients</h3>
                      <p className="text-sm text-gray-600">Évaluation</p>
                    </div>
                  </div>
                  {driver && (
                    <DriverRatingDisplay 
                      driverId={driver.id} 
                      showDetails={false}
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Validation Process Guide */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl shadow-sm p-6 mb-8">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-blue-600" />
                Processus de validation du compte chauffeur
              </h3>
              <div className="space-y-4">
                <div className="bg-white rounded-lg p-4 border border-blue-200">
                  <h4 className="font-semibold text-gray-900 mb-2">📋 Étapes de validation</h4>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                        1
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Complétion du profil</p>
                        <p className="text-sm text-gray-600">Renseignez toutes vos informations personnelles et véhicule</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                        2
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Vérification des documents</p>
                        <p className="text-sm text-gray-600">Nos équipes vérifient votre permis de conduire et les documents du véhicule</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                        3
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Validation administrative</p>
                        <p className="text-sm text-gray-600">Un administrateur valide votre compte (24-48h)</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                        4
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Configuration des disponibilités</p>
                        <p className="text-sm text-gray-600">Définissez vos créneaux de disponibilité pour recevoir des courses</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <h4 className="font-semibold text-amber-900 mb-2 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    💡 Conseil important pour recevoir des courses
                  </h4>
                  <p className="text-sm text-amber-800 mb-3">
                    Pour maximiser vos chances de recevoir des courses, nous vous recommandons fortement de :
                  </p>
                  <ul className="text-sm text-amber-800 space-y-1 ml-4">
                    <li>• <strong>Saisir des disponibilités sur des plages étendues</strong> (semaines ou mois)</li>
                    <li>• Définir des créneaux réguliers et récurrents</li>
                    <li>• Être disponible aux heures de pointe (7h-9h, 17h-19h)</li>
                    <li>• Maintenir vos disponibilités à jour</li>
                  </ul>
                  <p className="text-xs text-amber-700 mt-2">
                    Plus vous êtes disponible, plus vous aurez de chances de recevoir des demandes de course !
                  </p>
                </div>
              </div>
            </div>

            {/* Next Steps */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">Prochaines étapes</h3>
              <div className="space-y-4">
                <div className={`flex items-center gap-4 p-4 rounded-lg ${
                  needsProfileCompletion ? 'bg-gray-50 border border-gray-200' : 'bg-green-50 border border-green-200'
                }`}>
                  <div className={`w-8 h-8 text-white rounded-full flex items-center justify-center text-sm font-bold ${
                    needsProfileCompletion ? 'bg-gray-700' : 'bg-green-600'
                  }`}>
                    1
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900">Compléter le profil</h4>
                    <p className="text-sm text-gray-600">
                      {needsProfileCompletion 
                        ? 'Ajoutez vos informations personnelles'
                        : 'Profil complété ✓'
                      }
                    </p>
                  </div>
                  {needsProfileCompletion && (
                    <Button
                      onClick={() => setShowProfileForm(true)}
                      size="sm"
                      className="bg-black hover:bg-gray-800 text-white"
                    >
                      Compléter
                    </Button>
                  )}
                </div>
                
                <div className={`flex items-center gap-4 p-4 rounded-lg ${
                  driver?.status === 'active' ? 'bg-green-50 border border-green-200' : 'bg-orange-50 border border-orange-200'
                }`}>
                  <div className={`w-8 h-8 text-white rounded-full flex items-center justify-center text-sm font-bold ${
                    driver?.status === 'active' ? 'bg-green-600' : 'bg-orange-500'
                  }`}>
                    2
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-medium text-gray-900">Validation du compte</h4>
                    <p className="text-sm text-gray-600">
                      {driver?.status === 'active' ? 'Compte validé ✓' : 'En attente - Un administrateur doit valider votre compte'}
                    </p>
                  </div>
                </div>

                <div className={`flex items-center gap-4 p-4 rounded-lg ${
                  driver?.status === 'active' ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50 border border-gray-200'
                }`}>
                  <div className={`w-8 h-8 text-white rounded-full flex items-center justify-center text-sm font-bold ${
                    driver?.status === 'active' ? 'bg-blue-600' : 'bg-gray-400'
                  }`}>
                    3
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900">Définir vos disponibilités</h4>
                    <p className="text-sm text-gray-600">
                      {driver?.status === 'active' 
                        ? 'Configurez vos créneaux pour recevoir des courses'
                        : 'Disponible après validation du compte'
                      }
                    </p>
                  </div>
                  {driver?.status === 'active' && (
                    <Button
                      onClick={() => setActiveTab('availability')}
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      Configurer
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Ancienne section "Mon véhicule" supprimée (remplacée par gestion multi-véhicules) */}

          </>
        )}

        {/* Onglet Disponibilités */}
        {!showProfileForm && activeTab === 'availability' && driver && (
          <div className="w-full">
            <AvailabilityCalendar driverId={driver.id} />
          </div>
        )}

        {/* Onglet Mes véhicules */}
        {!showProfileForm && activeTab === 'vehicles' && driver && (
          <div className="w-full">
            <DriverVehicles driverId={driver.id} />
          </div>
        )}

        {/* Onglet Abonnement */}
        {!showProfileForm && activeTab === 'subscription' && driver && (
          <div className="w-full">
            <div className="mb-6">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                Gestion de l'abonnement
              </h2>
              <p className="text-gray-600">
                Gérez votre abonnement et suivez votre quota mensuel de courses
              </p>
            </div>
            <DriverSubscription driverId={driver.id} />
          </div>
        )}

        {/* Onglet Demandes de transport de colis */}
        {!showProfileForm && activeTab === 'parcel-requests' && driver && (
          <div className="w-full">
            <div className="mb-6">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                Demandes de transport de colis
              </h2>
              <p className="text-gray-600">
                Consultez les demandes éligibles et envoyez vos propositions de prix
              </p>
            </div>
            <TransporteurRequests driverId={driver.id} />
          </div>
        )}

        {/* Onglet Courses */}
        {!showProfileForm && activeTab === 'bookings' && (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-900 space-y-2">
              <h3 className="text-base font-semibold text-blue-950">Tutoriel rapide</h3>
              <p><strong>Accepter / Refuser :</strong> dans “Nouvelles demandes”, utilisez les boutons <em>Accepter</em> ou <em>Refuser</em>. Si le délai est dépassé, contactez le client.</p>
              <p><strong>Démarrer :</strong> une fois la course acceptée, appuyez sur <em>Commencer</em> quand vous êtes prêt à prendre en charge le client.</p>
              <p><strong>Terminer :</strong> après avoir déposé le client, marquez la course comme terminée via le bouton prévu dans les actions.</p>
              {showParcelInBookings && (
                <p>
                  <strong>Colis :</strong> lorsqu&apos;un client accepte votre devis, le transport apparaît ci-dessous.
                  Une fois la marchandise livrée, cliquez sur <em>Livraison effectuée</em> pour archiver le trajet.
                </p>
              )}
            </div>
            {/* Nouvelles demandes - Statut 'pending' */}
            {pendingBookings.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-900 flex items-center gap-2">
                    <Bell className="w-5 h-5 text-blue-600" />
                    Nouvelles demandes ({pendingBookings.length})
                  </h3>
                  <p className="text-sm sm:text-base text-gray-600">Courses en attente de votre confirmation</p>
                </div>
                <div className="divide-y divide-gray-200">
                  {pendingBookings.map((booking) => (
                    <div key={booking.id} className="p-6">
                      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            {getStatusBadge(booking.status)}
                            <span className="text-sm text-gray-500">
                              Réservé pour le {new Date(booking.scheduled_time).toLocaleString('fr-FR', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <MapPin size={16} className="text-green-600" />
                              <span className="font-medium text-gray-900">{booking.pickup_address}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Navigation size={16} className="text-red-600" />
                              <span className="text-sm text-gray-600">Arrivée:</span>
                              <span className="font-medium text-gray-900">{booking.destination_address}</span>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                              <span>{booking.distanceKm} km</span>
                              <span className="font-bold text-green-600">{booking.price_tnd} TND</span>
                            </div>
                            {booking.notes && (
                              <div className="bg-gray-50 rounded-lg p-3 mt-2">
                                <p className="text-sm text-gray-700">
                                  <strong>Notes du client:</strong> {booking.notes}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="lg:ml-6 flex flex-col sm:flex-row lg:flex-col gap-2">
                          {booking.status === 'pending' && (
                            <>
                              <Button
                                onClick={() => updateBookingStatus(booking.id, 'accepted')}
                                className="bg-black hover:bg-gray-800 text-white flex items-center gap-2"
                                size="sm"
                              >
                                <CheckCircle size={16} />
                                Accepter
                              </Button>
                              {canCancelBooking(booking) ? (
                                <Button
                                  onClick={() => cancelBookingByDriver(booking.id)}
                                  variant="outline"
                                  className="border-red-300 text-red-600 hover:bg-red-50 flex items-center gap-2"
                                  size="sm"
                                >
                                  <XCircle size={16} />
                                  Refuser
                                </Button>
                              ) : (
                                <div className="text-xs text-gray-500 bg-amber-50 border border-amber-200 rounded-lg p-2">
                                  <p className="font-medium text-amber-800">⚠️ Délai d'annulation dépassé</p>
                                  <p className="mt-1">Contactez le client par téléphone</p>
                                  {booking.clients?.phone && (
                                    <p className="font-semibold text-amber-900 mt-1">{booking.clients.phone}</p>
                                  )}
                                </div>
                              )}
                            </>
                          )}
                          {booking.status === 'accepted' && (
                            <>
                              <Button
                                onClick={() => updateBookingStatus(booking.id, 'in_progress')}
                                className="bg-black hover:bg-gray-800 text-white flex items-center gap-2"
                                size="sm"
                              >
                                <Car size={16} />
                                Commencer
                              </Button>
                              {(() => {
                                const canCancel = canCancelBooking(booking);
                                console.log(`🔍 Booking ${booking.id.slice(0, 8)} - canCancelBooking:`, canCancel, 'scheduled:', booking.scheduled_time);
                                return canCancel;
                              })() ? (
                                <Button
                                  onClick={() => cancelBookingByDriver(booking.id)}
                                  variant="outline"
                                  className="border-red-300 text-red-600 hover:bg-red-50 flex items-center gap-2"
                                  size="sm"
                                >
                                  <XCircle size={16} />
                                  Annuler
                                </Button>
                              ) : (
                                <div className="text-xs text-gray-500 bg-amber-50 border border-amber-200 rounded-lg p-2">
                                  <p className="font-medium text-amber-800">⚠️ Délai d'annulation dépassé</p>
                                  <p className="mt-1">Contactez le client par téléphone</p>
                                  {booking.clients?.phone && (
                                    <p className="font-semibold text-amber-900 mt-1">{booking.clients.phone}</p>
                                  )}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                      
                      {/* Informations client */}
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                        <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2 text-sm sm:text-base">
                          <User size={16} />
                          Informations client
                        </h4>
                        {booking.clients ? (
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div>
                              <p className="font-medium text-blue-900">
                                {booking.clients.first_name} {booking.clients.last_name}
                              </p>
                              {booking.clients.phone && (
                                <p className="text-sm text-blue-700">
                                  Tél: {booking.clients.phone}
                                </p>
                              )}
                            </div>
                            {booking.clients.phone && (
                              <div className="flex gap-2">
                                <a
                                  href={`tel:${booking.clients.phone}`}
                                  className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                                  title="Appeler le client"
                                >
                                  <Phone size={16} />
                                </a>
                                <a
                                  href={`sms:${booking.clients.phone}`}
                                  className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                  title="Envoyer un SMS"
                                >
                                  <MessageSquare size={16} />
                                </a>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-center py-4">
                            <User size={32} className="text-blue-400 mx-auto mb-2" />
                            <p className="text-blue-700 font-medium">
                              Informations client en cours de chargement...
                            </p>
                            <p className="text-sm text-blue-600 mt-1">
                              Les données client seront disponibles sous peu
                            </p>
                          </div>
                        )}
                      </div>
                      
                      {/* Détails de la course */}
                      <div className="bg-gray-50 rounded-lg p-4 mt-4">
                        <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2 text-sm sm:text-base">
                          <MapPin size={16} />
                          Détails de la course
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">Distance:</span>
                            <span className="ml-2 font-medium">{booking.distance_km} km</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Prix:</span>
                            <span className="ml-2 font-bold text-green-600">{booking.price_tnd} TND</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Réservé le:</span>
                            <span className="ml-2 font-medium">
                              {new Date(booking.created_at).toLocaleDateString('fr-FR')}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600">ID:</span>
                            <span className="ml-2 font-mono text-xs">{booking.id.slice(0, 8)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Courses programmées (accepted) en premier */}
            {acceptedBookings.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-900 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-blue-600" />
                    Courses programmées ({acceptedBookings.length})
                  </h3>
                  <p className="text-sm sm:text-base text-gray-600">Prochaines courses à venir</p>
                </div>
                <div className="divide-y divide-gray-200">
                  {acceptedBookings.map((booking) => (
                    <div key={booking.id} className="p-6">
                      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            {getStatusBadge(booking.status)}
                            <span className="text-sm text-gray-500">
                              Prévue le {new Date(booking.scheduled_time).toLocaleString('fr-FR', {
                                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
                              })}
                            </span>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <MapPin size={16} className="text-green-600" />
                              <span className="font-medium text-gray-900">{booking.pickup_address}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Navigation size={16} className="text-red-600" />
                              <span className="text-sm text-gray-600">Arrivée:</span>
                              <span className="font-medium text-gray-900">{booking.destination_address}</span>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                              <span>{booking.distance_km} km</span>
                              <span className="font-bold text-green-600">{booking.pricetnd} TND</span>
                            </div>
                          </div>
                        </div>
                        <div className="lg:ml-6 flex flex-col sm:flex-row lg:flex-col gap-2">
                          <Button
                            onClick={() => updateBookingStatus(booking.id, 'in_progress')}
                            className="bg-black hover:bg-gray-800 text-white flex items-center gap-2"
                            size="sm"
                          >
                            <Car size={16} />
                            Démarrer la course
                          </Button>
                          {canCancelBooking(booking) ? (
                            <Button
                              onClick={() => cancelBookingByDriver(booking.id)}
                              variant="outline"
                              className="border-red-300 text-red-600 hover:bg-red-50 flex items-center gap-2"
                              size="sm"
                            >
                              <XCircle size={16} />
                              Annuler
                            </Button>
                          ) : (
                            <div className="text-xs text-gray-500 bg-amber-50 border border-amber-200 rounded-lg p-2">
                              <p className="font-medium text-amber-800">⚠️ Délai d'annulation dépassé</p>
                              <p className="mt-1">Contactez le client par téléphone</p>
                              {booking.clients?.phone && (
                                <p className="font-semibold text-amber-900 mt-1">{booking.clients.phone}</p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Transports colis programmés */}
            {showParcelInBookings && activeParcelTrips.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-900 flex items-center gap-2">
                    <Package className="w-5 h-5 text-gray-700" />
                    Transports colis en cours ({activeParcelTrips.length})
                  </h3>
                  <p className="text-sm sm:text-base text-gray-600">
                    Devis acceptés — à livrer puis à clôturer avec le bouton dédié
                  </p>
                </div>
                <div className="divide-y divide-gray-200">
                  {activeParcelTrips.map((trip) => (
                    <DriverParcelTripCard
                      key={trip.proposalId}
                      trip={trip}
                      variant="active"
                      onMarkDelivered={handleCompleteParcelDelivery}
                      isCompleting={completingParcelRequestId === trip.request.id}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Courses en cours */}
            {bookings.filter(b => b.status === 'in_progress').length > 0 && (
              <div className="bg-white rounded-xl shadow-sm">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-900 flex items-center gap-2">
                    <Car className="w-5 h-5 text-green-600" />
                    Courses en cours ({bookings.filter(b => b.status === 'in_progress').length})
                  </h3>
                  <p className="text-sm sm:text-base text-gray-600">Courses que vous avez commencées</p>
                </div>
                <div className="divide-y divide-gray-200">
                  {bookings.filter(b => b.status === 'in_progress').map((booking) => (
                    <div key={booking.id} className="p-6">
                      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            {getStatusBadge(booking.status)}
                            <span className="text-sm text-gray-500">
                              Commencée le {booking.pickup_time ? 
                                new Date(booking.pickup_time).toLocaleString('fr-FR') : 
                                'Maintenant'
                              }
                            </span>
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <MapPin size={14} className="text-green-600" />
                              <span className="text-sm text-gray-900">{booking.pickup_address}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Navigation size={14} className="text-red-600" />
                              <span className="text-sm text-gray-900">{booking.destination_address}</span>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-gray-600 mt-2">
                              <span>{booking.distance_km} km</span>
                              <span className="font-bold text-green-600">{booking.price_tnd} TND</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex-shrink-0"><Button
                          onClick={() => updateBookingStatus(booking.id, 'completed')}
                          className="bg-black hover:bg-gray-800 text-white flex items-center gap-2"
                          size="sm"
                        >
                          <CheckCircle size={16} />
                          Terminer la course
                        </Button></div>
                      </div>
                      {/* Informations client */}
                      {booking.clients && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                          <h4 className="font-medium text-blue-900 mb-2 text-sm sm:text-base">Informations client</h4>
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div>
                              <p className="font-medium text-blue-900">
                                {booking.clients.first_name} {booking.clients.last_name}
                              </p>
                              {booking.clients.phone && (
                                <p className="text-sm text-blue-700">
                                  Tél: {booking.clients.phone}
                                </p>
                              )}
                            </div>
                            {booking.clients.phone && (
                              <div className="flex gap-2">
                                <a
                                  href={`tel:${booking.clients.phone}`}
                                  className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                                  title="Appeler le client"
                                >
                                  <Phone size={16} />
                                </a>
                                <a
                                  href={`sms:${booking.clients.phone}`}
                                  className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                  title="Envoyer un SMS"
                                >
                                  <MessageSquare size={16} />
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Historique */}
            <div className="bg-white rounded-xl shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900">Historique</h3>
                <p className="text-sm sm:text-base text-gray-600">
                  Courses VTC terminées ou annulées et transports colis passés
                </p>
              </div>
              
              {historyBookings.length === 0 &&
              (!showParcelInBookings || completedParcelTrips.length === 0) ? (
                <div className="text-center py-12">
                  <Car size={48} className="text-gray-400 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-gray-900 mb-2">Aucun historique</h4>
                  <p className="text-gray-500">
                    Vos courses et transports colis acceptés apparaîtront ici.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {showParcelInBookings &&
                    completedParcelTrips.map((trip) => (
                      <DriverParcelTripCard key={trip.proposalId} trip={trip} variant="completed" />
                    ))}
                  {historyBookings.map((booking) => (
                    <div key={booking.id} className="p-6">
                      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            {getStatusBadge(booking.status)}
                            <span className="text-sm text-gray-500">
                              {new Date(booking.scheduled_time).toLocaleString('fr-FR')}
                            </span>
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <MapPin size={14} className="text-green-600" />
                              <span className="text-sm text-gray-900">{booking.pickup_address}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Navigation size={14} className="text-red-600" />
                              <span className="text-sm text-gray-900">{booking.destination_address}</span>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-gray-600 mt-2">
                              <span>{booking.distance_km} km</span>
                              <span className="font-bold text-green-600">{booking.price_tnd} TND</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal de profil */}
        {driver && (
          <ProfileModal
            isOpen={showProfileModal}
            onClose={() => setShowProfileModal(false)}
            user={driver}
            userType="driver"
            onProfileDeleted={handleLogout}
            onProfileUpdated={fetchDriverData}
          />
        )}
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
};
