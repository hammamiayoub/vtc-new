import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Badge } from './ui/Badge';
import { TabBar } from './ui/TabBar';
import { BookingStatusBadge } from './ui/StatusBadge';
import { DashboardSkeleton, Skeleton, SkeletonRow } from './ui/Skeleton';
import { MapPin, Clock, User, LogOut, UserCircle, Car, Plus, Package } from 'lucide-react';
import { ParcelQuoteForm } from './ParcelQuoteForm';
import { ParcelQuoteList } from './ParcelQuoteList';
import { ParcelQuoteDetail } from './ParcelQuoteDetail';
import { Button } from './ui/Button';
import { supabase } from '../lib/supabase';
import { Client, Booking } from '../types';
import { getVehicleMultiplier } from '../utils/geolocation';
import {
  RIDE_DEFAULT_PICKUP_FARE_TND,
  getDriverPickupFareSummaryText,
  RIDE_DISTANCE_TIERS,
  RIDE_MIN_PRICE_TND,
} from '../utils/ridePricing';
import { BookingForm } from './BookingForm';
import { BookingConfirmation } from './BookingConfirmation';
import { ProfileModal } from './ProfileModal';
import { NotificationBell } from './NotificationBell';
import { RatingModal } from './RatingModal';
import { Footer } from './Footer';
import { NotificationPermission, NotificationStatus } from './NotificationPermission';
import { useClientNotifications } from '../hooks/useNotifications';
import { pushNotificationService } from '../utils/pushNotifications';
import { AppDownloadModal } from './AppDownloadModal';
import { LanguageSwitch, useLocale } from '../i18n/locale';
import {
  clearPendingQuote,
  getPendingQuote,
  type PendingQuote,
} from '../utils/pendingQuote';

interface ClientDashboardProps {
  onLogout: () => void;
}

export const ClientDashboard: React.FC<ClientDashboardProps> = ({ onLogout }) => {
  const { locale } = useLocale();
  const en = locale === 'en';
  const dateLocale = en ? 'en-GB' : 'fr-FR';
  const money = (amount: number) =>
    en ? amount.toFixed(2) : amount.toFixed(2).replace('.', ',');
  const initialPendingQuote = getPendingQuote();
  const [client, setClient] = useState<Client | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'new-booking' | 'bookings' | 'confirmation' | 'new-parcel' | 'parcel-requests'
  >(initialPendingQuote ? 'new-booking' : 'dashboard');
  const [showBookingForm, setShowBookingForm] = useState(!!initialPendingQuote);
  const [pendingQuote, setPendingQuote] = useState<PendingQuote | null>(initialPendingQuote);
  const [selectedParcelRequestId, setSelectedParcelRequestId] = useState<string | null>(null);
  const [parcelRefreshKey, setParcelRefreshKey] = useState(0);
  const [confirmationBookingId, setConfirmationBookingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookingsLoading, setBookingsLoading] = useState(true);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [selectedBookingForRating, setSelectedBookingForRating] = useState<Booking | null>(null);
  const [ratedBookings, setRatedBookings] = useState<Set<string>>(new Set());
  const [isDownloadOpen, setIsDownloadOpen] = useState(false);

  // Hook pour les notifications
  const { unreadCount, hasNewBookings, markAsRead, refreshNotifications } = useClientNotifications(client?.id || '');

  const fetchClientData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data: clientData, error } = await supabase
          .from('clients')
          .select('*')
          .eq('id', user.id)
          .neq('status', 'deleted') // Exclure les comptes supprimés
          .maybeSingle();

        if (error) {
          console.error('Erreur lors de la récupération des données client:', error);
        } else if (clientData) {
          setClient({
            id: clientData.id,
            firstName: clientData.first_name,
            lastName: clientData.last_name,
            email: clientData.email,
            phone: clientData.phone,
            city: clientData.city,
            status: clientData.status,
            profilePhotoUrl: clientData.profile_photo_url,
            createdAt: clientData.created_at,
            updatedAt: clientData.updated_at
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
    fetchClientData();
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

  // Dernière requête lancée : une réponse plus ancienne qui arrive en retard ne doit pas écraser la liste.
  const bookingsRequestRef = useRef(0);

  /** Source unique de la liste des réservations (avec le chauffeur associé). */
  const refreshBookings = useCallback(async () => {
    if (!client?.id) return;
    const requestId = ++bookingsRequestRef.current;
    try {
      const { data: bookingsData, error } = await supabase
        .from('bookings')
        .select(`
          *,
          drivers(
            first_name,
            last_name,
            phone
          )
        `)
        .eq('client_id', client.id)
        .order('created_at', { ascending: false });

      if (requestId !== bookingsRequestRef.current) return;
      if (error) {
        console.error('Erreur lors de la récupération des réservations:', error);
      } else {
        setBookings(bookingsData || []);
      }
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      if (requestId === bookingsRequestRef.current) setBookingsLoading(false);
    }
  }, [client?.id]);

  useEffect(() => {
    refreshBookings();
  }, [refreshBookings]);

  // Filet de sécurité si le temps réel n'est pas disponible : on se resynchronise quand l'utilisateur
  // revient sur l'onglet du navigateur, puis toutes les 30 s tant que la page est visible.
  useEffect(() => {
    if (!client?.id) return;
    const refreshIfVisible = () => {
      if (document.visibilityState === 'visible') refreshBookings();
    };
    document.addEventListener('visibilitychange', refreshIfVisible);
    window.addEventListener('focus', refreshIfVisible);
    const interval = window.setInterval(refreshIfVisible, 30000);
    return () => {
      document.removeEventListener('visibilitychange', refreshIfVisible);
      window.removeEventListener('focus', refreshIfVisible);
      window.clearInterval(interval);
    };
  }, [client?.id, refreshBookings]);

  // Charger les réservations déjà notées
  useEffect(() => {
    if (client?.id) {
      loadRatedBookings();
    }
  }, [client?.id]);

  // Realtime updates: auto-refresh bookings on INSERT/UPDATE for this client
  useEffect(() => {
    if (!client?.id) return;
    let refreshTimer: number | undefined;
    // Le payload temps réel ne contient pas le chauffeur (jointure) : on relit la liste juste après.
    const scheduleRefresh = () => {
      window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(refreshBookings, 300);
    };
    const channel = supabase
      .channel(`bookings-client-${client.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'bookings', filter: `client_id=eq.${client.id}` },
        (payload: any) => {
          setBookings((prev) => [payload.new, ...prev.filter((b) => b.id !== payload.new.id)]);
          scheduleRefresh();
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'bookings', filter: `client_id=eq.${client.id}` },
        (payload: any) => {
          setBookings((prev) => prev.map((b) => (b.id === payload.new.id ? { ...b, ...payload.new } : b)));
          scheduleRefresh();
        }
      )
      .subscribe();

    return () => {
      window.clearTimeout(refreshTimer);
      supabase.removeChannel(channel);
    };
  }, [client?.id, refreshBookings]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    onLogout();
  };

  const handleBookingSuccess = (bookingId: string) => {
    clearPendingQuote();
    setPendingQuote(null);
    setShowBookingForm(false);
    setConfirmationBookingId(bookingId);
    setActiveTab('confirmation');
    refreshBookings();
  };

  const handleParcelSuccess = (requestId: string) => {
    setParcelRefreshKey((k) => k + 1);
    setSelectedParcelRequestId(requestId);
    setActiveTab('parcel-requests');
  };

  const handleBackFromConfirmation = () => {
    setConfirmationBookingId(null);
    setActiveTab('dashboard');
    refreshBookings();
  };

  const canCancelBooking = (
    booking: { scheduled_time?: string; status: Booking['status'] }
  ) => {
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

  const cancelBooking = async (bookingId: string) => {
    const confirmed = window.confirm(
      en ? 'Cancel this booking?' : "Confirmer l'annulation de votre réservation ?",
    );
    if (!confirmed) return;
    
    console.log('🚫 === DÉBUT ANNULATION PAR CLIENT ===');
    console.log('📋 Booking ID:', bookingId);
    
    try {
      // Récupérer les détails de la réservation avant l'annulation
      const booking = bookings.find(b => b.id === bookingId);
      console.log('📊 Booking trouvé:', booking);
      
      if (!booking) {
        alert(en ? 'Booking not found' : 'Réservation non trouvée');
        return;
      }

      const { error } = await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', bookingId);
      
      if (error) {
        alert((en ? 'Could not cancel the booking: ' : "Impossible d'annuler la réservation: ") + error.message);
        return;
      }

      console.log('✅ Statut mis à jour en "cancelled" dans la DB');

      // Rafraîchir localement
      setBookings((prev) => prev.map((b) => (b.id === bookingId ? { ...b, status: 'cancelled' } : b)));

      // Envoyer notification au chauffeur si assigné
      console.log('📍 Vérification chauffeur assigné - driverId:', booking.driverId, 'drivers:', !!booking.drivers);
      
      if (booking.driverId && booking.drivers) {
        try {
          await pushNotificationService.notifyDriverBookingCancelledByClient(
            booking.drivers.first_name + ' ' + booking.drivers.last_name,
            client?.firstName + ' ' + client?.lastName || 'Client',
            booking.pickup_address
          );
          console.log('✅ Notification push envoyée au chauffeur');
        } catch (notificationError) {
          console.error('❌ Erreur lors de l\'envoi de la notification push:', notificationError);
        }
      } else {
        console.log('⚠️ Pas de chauffeur assigné, notification push non envoyée');
      }

      // Envoyer emails d'annulation via send-booking-status-notification
      // Toujours envoyer au moins l'email au client
      console.log('📧 === TENTATIVE ENVOI EMAILS ===');
      console.log('Booking driverId:', booking.driverId);
      console.log('Booking drivers:', booking.drivers);
      console.log('Client email:', client?.email);
      
      try {
        console.log('📧 Préparation emails d\'annulation...');
        console.log('📊 Booking data brut:', booking);
        
        // Récupérer l'email du chauffeur si assigné
        let driverEmail = '';
        let driverFirstName = '';
        let driverLastName = '';
        let driverPhone = '';
        
        console.log('🔍 Vérification driver_id:', booking.driver_id);
        
        if (booking.driver_id) {
          console.log('✅ Chauffeur assigné, récupération des données...');
          const { data: driverData, error: driverError } = await supabase
            .from('drivers')
            .select('email, first_name, last_name, phone')
            .eq('id', booking.driver_id)
            .maybeSingle();

          console.log('📊 Données chauffeur récupérées:', driverData);
          
          if (driverError) {
            console.error('❌ Erreur récupération données chauffeur:', driverError);
          } else if (driverData) {
            driverEmail = driverData.email || '';
            driverFirstName = driverData.first_name || '';
            driverLastName = driverData.last_name || '';
            driverPhone = driverData.phone || '';
            console.log('✅ Email chauffeur récupéré:', driverEmail);
          } else {
            console.log('⚠️ Aucune donnée chauffeur trouvée dans la DB');
          }
        } else {
          console.log('⚠️ Aucun driver_id dans le booking');
        }

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
            first_name: client?.firstName || '',
            last_name: client?.lastName || '',
            email: client?.email || ''
          },
          driverData: {
            first_name: driverFirstName || 'Chauffeur',
            last_name: driverLastName || '',
            email: driverEmail,
            phone: driverPhone,
            vehicle_info: null
          },
          status: 'cancelled',
          cancelledBy: 'client'
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
      } catch (emailError) {
        console.error('❌ Erreur lors de l\'envoi des emails d\'annulation:', emailError);
        console.error('❌ Stack trace:', emailError);
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      alert("Erreur lors de l'annulation: " + message);
    }
  };

  // Fonction pour charger les réservations déjà notées
  const loadRatedBookings = async () => {
    if (!client?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('ratings')
        .select('booking_id')
        .eq('client_id', client.id);
      
      if (!error && data) {
        const ratedIds = new Set(data.map(rating => rating.booking_id));
        setRatedBookings(ratedIds);
        console.log('📊 Réservations déjà notées:', Array.from(ratedIds));
      }
    } catch (error) {
      console.error('❌ Erreur lors du chargement des notes:', error);
    }
  };

  const canRateBooking = (booking: Booking) => {
    if (booking.status !== 'completed') {
      return false;
    }
    
    // Vérifier si la réservation a déjà été notée
    return !ratedBookings.has(booking.id);
  };

  const handleRateBooking = (booking: Booking) => {
    const canRate = canRateBooking(booking);
    if (canRate) {
      setSelectedBookingForRating(booking);
      setShowRatingModal(true);
    }
  };

  const handleRatingSubmitted = async () => {
    console.log('🔄 Rafraîchissement des réservations après notation...');
    
    // Ajouter la réservation à la liste des réservations notées
    if (selectedBookingForRating) {
      setRatedBookings(prev => new Set([...prev, selectedBookingForRating.id]));
      console.log('✅ Réservation ajoutée à la liste des réservations notées:', selectedBookingForRating.id);
    }
    
    // Rafraîchir la liste des réservations
    await refreshBookings();
  };

  const handleTabChange = (id: string) => {
    setActiveTab(id as typeof activeTab);
    setShowBookingForm(id === 'new-booking');
    if (id === 'new-parcel') setSelectedParcelRequestId(null);
    if (id === 'dashboard' || id === 'bookings') refreshBookings();
  };

  if (loading) {
    return (
      <DashboardSkeleton />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppDownloadModal isOpen={isDownloadOpen} onClose={() => setIsDownloadOpen(false)} />
      {/* Header */}
      <header className="bg-black border-b border-gray-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 sm:h-20">
            <div className="flex items-center gap-3">
              <div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white tracking-tight">TuniDrive</h1>
                <p className="text-sm sm:text-base lg:text-lg text-white hidden sm:block">
                  {en ? 'Rider account' : 'Espace Client'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-4">
              <LanguageSwitch />
              <NotificationBell
                unreadCount={unreadCount}
                hasNewNotifications={hasNewBookings}
                onClick={() => {
                  markAsRead();
                  setActiveTab('bookings');
                }}
                className="text-gray-300 hover:text-white hover:bg-gray-800 transition-colors"
              />
              <button
                onClick={() => setShowProfileModal(true)}
                className="p-2 text-gray-300 hover:text-white  hover:bg-gray-800 transition-colors"
                title={en ? 'My profile' : 'Mon profil'}
              >
                <UserCircle size={22} />
              </button>
              <Button onClick={handleLogout} className="flex items-center gap-1 sm:gap-2 bg-white border-2 border-gray-300 text-gray-900 hover:bg-gray-50 rounded-lg font-medium transition-all duration-200 text-sm sm:text-base px-2 sm:px-4">
                <LogOut size={14} className="sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">{en ? 'Log out' : 'Déconnexion'}</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <TabBar
        ariaLabel={en ? 'Dashboard sections' : 'Sections du tableau de bord'}
        activeId={activeTab}
        onChange={handleTabChange}
        tabs={[
          { id: 'dashboard', label: en ? 'Overview' : 'Tableau de bord' },
          { id: 'new-booking', label: en ? 'New booking' : 'Nouvelle réservation' },
          {
            id: 'bookings',
            label: `${en ? 'My bookings' : 'Mes réservations'}${bookingsLoading ? '' : ` (${bookings.length})`}`,
          },
          { id: 'new-parcel', label: en ? 'Ship parcels' : 'Expédier mes colis' },
          { id: 'parcel-requests', label: en ? 'Parcel quotes' : 'Mes devis colis' },
        ]}
      />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Notification Permission */}
        <NotificationPermission />
        
        {/* Page de confirmation */}
        {activeTab === 'confirmation' && confirmationBookingId && (
          <BookingConfirmation 
            bookingId={confirmationBookingId}
            onBack={handleBackFromConfirmation}
          />
        )}

        {/* Formulaire de réservation */}
        {showBookingForm && client && activeTab !== 'confirmation' && activeTab !== 'new-parcel' && activeTab !== 'parcel-requests' && (
          <BookingForm
            clientId={client.id}
            onBookingSuccess={handleBookingSuccess}
            initialQuote={pendingQuote}
          />
        )}

        {activeTab === 'new-parcel' && client && (
          <ParcelQuoteForm clientId={client.id} onSuccess={handleParcelSuccess} />
        )}

        {activeTab === 'parcel-requests' && client && (
          selectedParcelRequestId ? (
            <ParcelQuoteDetail
              requestId={selectedParcelRequestId}
              onBack={() => setSelectedParcelRequestId(null)}
              onAccepted={() => setParcelRefreshKey((k) => k + 1)}
            />
          ) : (
            <ParcelQuoteList
              clientId={client.id}
              onSelectRequest={setSelectedParcelRequestId}
              refreshKey={parcelRefreshKey}
            />
          )
        )}

        {/* Dashboard principal */}
        {!showBookingForm && activeTab === 'dashboard' && activeTab !== 'confirmation' && (
          <>
            {/* Welcome Section */}
            <div className="bg-white rounded-xl shadow-sm p-4 sm:p-4 sm:p-6 mb-6 sm:mb-8">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                {client?.profilePhotoUrl ? (
                  <img
                    src={client.profilePhotoUrl}
                    alt={en ? 'Profile photo' : 'Photo de profil'}
                    className="w-16 h-16 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <User size={32} className="text-gray-700" />
                  </div>
                )}
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                    {en ? 'Welcome' : 'Bienvenue'}, {client?.firstName} {client?.lastName}
                  </h2>
                  <p className="text-sm sm:text-base text-gray-600">
                    {en ? 'Rider account — book a ride' : 'Espace client - Réservation de courses'}
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-4 sm:p-6 mb-6 sm:mb-8">
              <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Plus size={24} className="text-gray-700" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{en ? 'New ride' : 'Nouvelle course'}</h3>
                    <p className="text-sm text-gray-600">{en ? 'Book now' : 'Réserver maintenant'}</p>
                  </div>
                </div>
                <Button
                  className="w-full bg-black hover:bg-gray-800"
                  onClick={() => {
                    setActiveTab('new-booking');
                    setShowBookingForm(true);
                  }}
                >
                  {en ? 'Book a ride' : 'Réserver une course'}
                </Button>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Clock size={24} className="text-gray-700" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{en ? 'My rides' : 'Mes courses'}</h3>
                    <p className="text-sm text-gray-600">{en ? 'History' : 'Historique'}</p>
                  </div>
                </div>
                {bookingsLoading ? (
                  <Skeleton className="h-7 w-10 mb-2" />
                ) : (
                  <p className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">{bookings.length}</p>
                )}
                <p className="text-sm text-gray-500">{en ? 'Booked rides' : 'Courses réservées'}</p>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Car size={24} className="text-gray-700" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{en ? 'Current ride' : 'Course en cours'}</h3>
                    <p className="text-sm text-gray-600">{en ? 'Current status' : 'Statut actuel'}</p>
                  </div>
                </div>
                {bookings.find(b => b.status === 'in_progress') ? (
                  <p className="text-sm text-success-600 font-medium">{en ? 'Ride in progress' : 'Course en cours'}</p>
                ) : (
                  <p className="text-sm text-gray-500">{en ? 'No ride in progress' : 'Aucune course en cours'}</p>
                )}
              </div>
            </div>

            {/* Section Tarifs - Optimisée pour mobile */}
            <div className="bg-white rounded-xl shadow-sm p-4 sm:p-4 sm:p-6 mb-6 sm:mb-8">
              <div className="flex items-center gap-3 mb-4 sm:mb-6">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                  <Car size={20} className="text-gray-700 sm:w-6 sm:h-6" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900">{en ? 'Fares' : 'Tarifs'}</h3>
                  <p className="text-xs sm:text-sm text-gray-600">
                    {en ? 'TuniDrive fare grid' : 'Grille tarifaire TuniDrive'}
                  </p>
                </div>
              </div>
              
              <div className="space-y-3 sm:space-y-4">
                {/* Tarif de base - Optimisé mobile */}
                <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                  <h4 className="font-semibold text-gray-900 mb-2 sm:mb-3 text-sm sm:text-base">
                    {en ? 'Pickup fee by driver distance' : 'Prise en charge variable'}
                  </h4>
                  <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm mb-3">
                    <p className="text-gray-600">{getDriverPickupFareSummaryText()}</p>
                    <p className="text-gray-500 text-[11px]">
                      {en ? 'Estimate before a driver is assigned: ' : 'Estimation avant chauffeur : '}
                      {money(RIDE_DEFAULT_PICKUP_FARE_TND)} TND
                    </p>
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-2 sm:mb-3 text-sm sm:text-base">
                    {en ? 'Price per kilometre' : 'Tarif au kilomètre'}
                  </h4>
                  <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
                    {RIDE_DISTANCE_TIERS.map((tier) => (
                      <div key={tier.label} className="flex justify-between items-center py-1">
                        <span className="text-gray-700 flex-1 pr-2">{tier.label}</span>
                        <span className="font-medium text-gray-900 text-right whitespace-nowrap">
                          {money(tier.rate)} TND/km
                        </span>
                      </div>
                    ))}
                    <div className="flex justify-between items-center py-1 pt-2 border-t border-gray-200">
                      <span className="text-gray-700 flex-1 pr-2 font-medium">{en ? 'Minimum fare' : 'Prix minimum'}</span>
                      <span className="font-semibold text-gray-900 text-right whitespace-nowrap">
                        {money(RIDE_MIN_PRICE_TND)} TND
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Info bonus - Optimisé mobile */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 sm:p-4">
                  <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">
                    <strong>{en ? 'Good to know:' : 'Bon à savoir :'}</strong>{' '}
                    {en
                      ? 'The longer the trip (one way or return), the lower the per-kilometre rate. The tiers apply automatically to the total distance.'
                      : "Plus votre trajet est long (aller ou aller-retour), plus vous économisez ! Les remises s'appliquent automatiquement selon la distance totale."}
                  </p>
                </div>
                
                
              </div>
            </div>
          </>
        )}

        {/* Liste des réservations */}
        {!showBookingForm && activeTab === 'bookings' && activeTab !== 'confirmation' && (
          <div className="bg-white rounded-xl shadow-sm">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900">{en ? 'My bookings' : 'Mes réservations'}</h3>
              <p className="text-sm sm:text-base text-gray-600">{en ? 'Your ride history' : 'Historique de vos courses'}</p>
            </div>

            {bookingsLoading ? (
              <div className="divide-y divide-gray-200">
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
              </div>
            ) : bookings.length === 0 ? (
              <div className="text-center py-12">
                <MapPin size={48} className="text-gray-400 mx-auto mb-4" />
                <h4 className="text-lg font-medium text-gray-900 mb-2">{en ? 'No bookings yet' : 'Aucune réservation'}</h4>
                <p className="text-gray-500 mb-6">
                  {en ? 'You have not booked a ride yet.' : "Vous n'avez pas encore effectué de réservation."}
                </p>
                <Button
                  className="bg-black hover:bg-gray-800"
                  onClick={() => {
                    setActiveTab('new-booking');
                    setShowBookingForm(true);
                  }}
                >
                  {en ? 'Book my first ride' : 'Réserver ma première course'}
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {bookings.map((booking) => (
                  <div key={booking.id} className="p-4 sm:p-6">
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-3">
                          <MapPin size={16} className="text-success-600" />
                          <span className="text-sm text-gray-500">
                            {en ? 'Scheduled for ' : 'Programmée pour le '}{new Date(booking.scheduled_time).toLocaleString(dateLocale, {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                          <span className="font-bold text-gray-900 text-sm sm:text-base">{booking.price_tnd} TND</span>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-success-500 rounded-full"></div>
                            <span className="text-sm text-gray-700">{booking.pickup_address}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-danger-500 rounded-full"></div>
                            <span className="text-sm text-gray-700">{booking.destination_address}</span>
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-2 sm:gap-4">
                          <p className="font-semibold text-gray-900">{booking.distance_km} km</p>
                          {<BookingStatusBadge status={booking.status} />}
                          {canCancelBooking(booking) ? (
                            <Button
                              variant="outline"
                              size="sm"
                              aria-label={en ? 'Cancel booking' : 'Annuler la réservation'}
                              className="border-danger-300 text-danger-600 hover:bg-danger-50 order-3 w-full sm:w-auto mt-2 sm:mt-0"
                              onClick={() => cancelBooking(booking.id)}
                            >
                              {en ? 'Cancel' : 'Annuler'}
                            </Button>
                          ) : (booking.status === 'pending' || booking.status === 'accepted') && (
                            <div className="text-xs text-gray-500 bg-warning-50 border border-warning-200 rounded-lg p-2 order-3 w-full sm:w-auto mt-2 sm:mt-0">
                              <p className="font-medium text-warning-800">
                                {en ? 'Cancellation window has passed (24h)' : "Délai d'annulation dépassé (24h)"}
                              </p>
                              <p className="mt-1">{en ? 'Contact the driver directly' : 'Contactez le chauffeur directement'}</p>
                              {booking.drivers?.phone && (
                                <p className="font-semibold text-warning-900 mt-1">{booking.drivers.phone}</p>
                              )}
                            </div>
                          )}
                          {canRateBooking(booking) ? (
                            <Button
                              variant="outline"
                              size="sm"
                              aria-label={en ? 'Rate the driver' : 'Noter le chauffeur'}
                              className="border-gray-300 text-gray-900 hover:bg-gray-50 order-4 w-full sm:w-auto mt-2 sm:mt-0"
                              onClick={() => handleRateBooking(booking)}
                            >
                              {en ? 'Rate' : 'Noter'}
                            </Button>
                          ) : booking.status === 'completed' && ratedBookings.has(booking.id) ? (
                            <Badge tone="success" className="order-4 sm:w-auto mt-2 sm:mt-0">
                              {en ? 'Rated' : 'Notée'}
                            </Badge>
                          ) : null}
                        </div>
                        {booking.notes && (
                          <p className="mt-2 text-sm text-gray-600 italic">
                            {en ? 'Note:' : 'Note:'} {booking.notes}
                          </p>
                        )}
                        <p className="mt-2 text-xs text-gray-500">
                          {en ? 'Booked on ' : 'Réservé le '}{new Date(booking.created_at).toLocaleDateString(dateLocale)}
                        </p>
                      </div>
                      <div className="lg:ml-4 flex-shrink-0">
                        {booking.drivers ? (
                          <div className="lg:text-right">
                            <p className="text-sm font-medium text-gray-900">
                              {booking.drivers.first_name} {booking.drivers.last_name}
                            </p>
                            <p className="text-xs text-gray-500">{en ? 'Assigned driver' : 'Chauffeur assigné'}</p>
                            {booking.drivers.phone && (
                              <a
                                href={`tel:${booking.drivers.phone}`}
                                className="focus-ring mt-1 inline-flex min-h-[44px] items-center gap-1.5 rounded-lg text-sm font-medium text-gray-900 underline underline-offset-2 lg:min-h-0"
                              >
                                {en ? 'Call' : 'Appeler'} {booking.drivers.phone}
                              </a>
                            )}
                          </div>
                        ) : booking.driverId ? (
                          <div className="lg:text-right">
                            <p className="text-sm font-medium text-gray-900">{en ? 'Assigned driver' : 'Chauffeur assigné'}</p>
                            <p className="text-xs text-gray-500">{en ? 'Loading…' : 'En cours de chargement...'}</p>
                          </div>
                        ) : (
                          <div className="lg:text-right">
                            <p className="text-sm text-gray-500">{en ? 'No driver assigned' : 'Aucun chauffeur assigné'}</p>
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

        {/* Modal de profil */}
        {client && (
          <ProfileModal
            isOpen={showProfileModal}
            onClose={() => setShowProfileModal(false)}
            user={client}
            userType="client"
            onProfileDeleted={handleLogout}
            onProfileUpdated={fetchClientData}
          />
        )}

        {/* Modal de notation */}
        {selectedBookingForRating && (
          <RatingModal
            isOpen={showRatingModal}
            onClose={() => {
              setShowRatingModal(false);
              setSelectedBookingForRating(null);
            }}
            booking={selectedBookingForRating}
            onRatingSubmitted={handleRatingSubmitted}
          />
        )}
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
};
