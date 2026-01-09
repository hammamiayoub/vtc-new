import React, { useState, useEffect } from 'react';
import { MapPin, Clock, User, LogOut, UserCircle, Car, Plus, CheckCircle, XCircle } from 'lucide-react';
import { Button } from './ui/Button';
import { supabase } from '../lib/supabase';
import { Client, Booking } from '../types';
import { getVehicleMultiplier } from '../utils/geolocation';
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

interface ClientDashboardProps {
  onLogout: () => void;
}

export const ClientDashboard: React.FC<ClientDashboardProps> = ({ onLogout }) => {
  const [client, setClient] = useState<Client | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'new-booking' | 'bookings' | 'confirmation'>('dashboard');
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [confirmationBookingId, setConfirmationBookingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    const fetchBookings = async () => {
      if (client) {
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

          if (error) {
            console.error('Erreur lors de la récupération des réservations:', error);
          } else {
            setBookings(bookingsData || []);
          }
        } catch (error) {
          console.error('Erreur:', error);
        }
      }
    };

    fetchBookings();
  }, [client]);

  // Charger les réservations déjà notées
  useEffect(() => {
    if (client?.id) {
      loadRatedBookings();
    }
  }, [client?.id]);

  // Realtime updates: auto-refresh bookings on INSERT/UPDATE for this client
  useEffect(() => {
    if (!client?.id) return;
    const channel = supabase
      .channel(`bookings-client-${client.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'bookings', filter: `client_id=eq.${client.id}` },
        (payload: any) => {
          setBookings((prev) => [payload.new, ...prev.filter((b) => b.id !== payload.new.id)]);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'bookings', filter: `client_id=eq.${client.id}` },
        (payload: any) => {
          setBookings((prev) => prev.map((b) => (b.id === payload.new.id ? { ...b, ...payload.new } : b)));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [client?.id]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    onLogout();
  };

  const handleBookingSuccess = (bookingId: string) => {
    setShowBookingForm(false);
    setConfirmationBookingId(bookingId);
    setActiveTab('confirmation');
  };

  const handleBackFromConfirmation = () => {
    setConfirmationBookingId(null);
    setActiveTab('dashboard');
    // Rafraîchir les réservations
    if (client) {
      const fetchBookings = async () => {
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

          if (!error) {
            setBookings(bookingsData || []);
          }
        } catch (error) {
          console.error('Erreur:', error);
        }
      };
      fetchBookings();
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
            <Clock size={12} />
            En attente d'acceptation
          </span>
        );
      case 'accepted':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <Car size={12} />
            Acceptée
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <MapPin size={12} />
            En cours
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircle size={12} />
            Annulée
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle size={12} />
            Terminée
          </span>
        );
      default:
        return null;
    }
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
    const confirmed = window.confirm("Confirmer l'annulation de votre réservation ?");
    if (!confirmed) return;
    
    console.log('🚫 === DÉBUT ANNULATION PAR CLIENT ===');
    console.log('📋 Booking ID:', bookingId);
    
    try {
      // Récupérer les détails de la réservation avant l'annulation
      const booking = bookings.find(b => b.id === bookingId);
      console.log('📊 Booking trouvé:', booking);
      
      if (!booking) {
        alert("Réservation non trouvée");
        return;
      }

      const { error } = await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', bookingId);
      
      if (error) {
        alert("Impossible d'annuler la réservation: " + error.message);
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
    if (client) {
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

        if (!error) {
          setBookings(bookingsData || []);
          console.log('✅ Réservations rafraîchies avec succès');
        } else {
          console.error('❌ Erreur lors du rafraîchissement:', error);
        }
      } catch (error) {
        console.error('❌ Erreur lors du rafraîchissement:', error);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
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
                <p className="text-sm sm:text-base lg:text-lg text-white hidden sm:block">Espace Client</p>
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
                className="text-gray-300 hover:text-white hover:bg-gray-800 transition-colors"
              />
              <button
                onClick={() => setShowProfileModal(true)}
                className="p-2 text-gray-300 hover:text-white  hover:bg-gray-800 transition-colors"
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
              onClick={() => {
                setActiveTab('dashboard');
                setShowBookingForm(false);
              }}
              className={`py-3 sm:py-4 px-2 sm:px-1 border-b-2 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap ${
                activeTab === 'dashboard'
                  ? 'border-black text-black'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Tableau de bord
            </button>
            <button
              onClick={() => {
                setActiveTab('new-booking');
                setShowBookingForm(true);
              }}
              className={`py-3 sm:py-4 px-2 sm:px-1 border-b-2 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap ${
                activeTab === 'new-booking'
                  ? 'border-black text-black'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Nouvelle réservation
            </button>
            <button
              onClick={() => {
                setActiveTab('bookings');
                setShowBookingForm(false);
              }}
              className={`py-3 sm:py-4 px-2 sm:px-1 border-b-2 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap ${
                activeTab === 'bookings'
                  ? 'border-black text-black'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Mes réservations ({bookings.length})
            </button>
          </nav>
        </div>
      </div>

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
        {showBookingForm && client && activeTab !== 'confirmation' && (
          <BookingForm 
            clientId={client.id} 
            onBookingSuccess={handleBookingSuccess}
          />
        )}

        {/* Dashboard principal */}
        {!showBookingForm && activeTab === 'dashboard' && activeTab !== 'confirmation' && (
          <>
            {/* Welcome Section */}
            <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                {client?.profilePhotoUrl ? (
                  <img
                    src={client.profilePhotoUrl}
                    alt="Photo de profil"
                    className="w-16 h-16 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <User size={32} className="text-gray-700" />
                  </div>
                )}
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                    Bienvenue, {client?.firstName} {client?.lastName}
                  </h2>
                  <p className="text-sm sm:text-base text-gray-600">Espace client - Réservation de courses</p>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Plus size={24} className="text-gray-700" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Nouvelle course</h3>
                    <p className="text-sm text-gray-600">Réserver maintenant</p>
                  </div>
                </div>
                <Button
                  className="w-full bg-black hover:bg-gray-800"
                  onClick={() => {
                    setActiveTab('new-booking');
                    setShowBookingForm(true);
                  }}
                >
                  Réserver une course
                </Button>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Clock size={24} className="text-gray-700" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Mes courses</h3>
                    <p className="text-sm text-gray-600">Historique</p>
                  </div>
                </div>
                <p className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">{bookings.length}</p>
                <p className="text-sm text-gray-500">Courses réservées</p>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Car size={24} className="text-gray-700" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Course en cours</h3>
                    <p className="text-sm text-gray-600">Statut actuel</p>
                  </div>
                </div>
                {bookings.find(b => b.status === 'in_progress') ? (
                  <p className="text-sm text-green-600 font-medium">Course en cours</p>
                ) : (
                  <p className="text-sm text-gray-500">Aucune course en cours</p>
                )}
              </div>
            </div>

            {/* Section Tarifs - Optimisée pour mobile */}
            <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 mb-8">
              <div className="flex items-center gap-3 mb-4 sm:mb-6">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <Car size={20} className="text-green-600 sm:w-6 sm:h-6" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900">Tarifs</h3>
                  <p className="text-xs sm:text-sm text-gray-600">Grille tarifaire TuniDrive</p>
                </div>
              </div>
              
              <div className="space-y-3 sm:space-y-4">
                {/* Tarif de base - Optimisé mobile */}
                <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                  <h4 className="font-semibold text-gray-900 mb-2 sm:mb-3 text-sm sm:text-base">Tarif de base : dès 2.0 TND/KM</h4>
                  <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
                    <div className="flex justify-between items-center py-1">
                      <span className="text-gray-700 flex-1 pr-2">Distance 0-50 km</span>
                      <span className="font-medium text-gray-900 text-right whitespace-nowrap">2.0 TND/KM</span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-gray-700 flex-1 pr-2">Distance 50-100 km</span>
                      <span className="font-medium text-gray-900 text-right whitespace-nowrap">1.8 TND/KM</span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-gray-700 flex-1 pr-2">Distance 100-250 km</span>
                      <span className="font-medium text-green-600 text-right whitespace-nowrap">1.4 TND/KM (-11%)</span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-gray-700 flex-1 pr-2">Distance 250+ km</span>
                      <span className="font-medium text-green-600 text-right whitespace-nowrap">1.05 TND/KM (-19%)</span>
                    </div>
                  </div>
                </div>
                
                {/* Info bonus - Optimisé mobile */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
                  <p className="text-xs sm:text-sm text-blue-800 leading-relaxed">
                    <strong>💡 Bon à savoir :</strong> Plus votre trajet est long (aller ou aller-retour), plus vous économisez ! 
                    Les remises s'appliquent automatiquement selon la distance totale.
                  </p>
                </div>
                
                
              </div>
            </div>
          </>
        )}

        {/* Liste des réservations */}
        {!showBookingForm && activeTab === 'bookings' && activeTab !== 'confirmation' && (
          <div className="bg-white rounded-xl shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900">Mes réservations</h3>
              <p className="text-sm sm:text-base text-gray-600">Historique de vos courses</p>
            </div>

            {bookings.length === 0 ? (
              <div className="text-center py-12">
                <MapPin size={48} className="text-gray-400 mx-auto mb-4" />
                <h4 className="text-lg font-medium text-gray-900 mb-2">Aucune réservation</h4>
                <p className="text-gray-500 mb-6">
                  Vous n'avez pas encore effectué de réservation.
                </p>
                <Button
                  className="bg-black hover:bg-gray-800"
                  onClick={() => {
                    setActiveTab('new-booking');
                    setShowBookingForm(true);
                  }}
                >
                  Réserver ma première course
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {bookings.map((booking) => (
                  <div key={booking.id} className="p-6">
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-3">
                          <MapPin size={16} className="text-green-600" />
                          <span className="text-sm text-gray-500">
                            Programmée pour le {new Date(booking.scheduled_time).toLocaleString('fr-FR', {
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
                            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                            <span className="text-sm text-gray-700">{booking.pickup_address}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                            <span className="text-sm text-gray-700">{booking.destination_address}</span>
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-2 sm:gap-4">
                          <p className="font-semibold text-gray-900">{booking.distance_km} km</p>
                          {getStatusBadge(booking.status)}
                          {canCancelBooking(booking) ? (
                            <Button
                              variant="outline"
                              size="sm"
                              aria-label="Annuler la réservation"
                              className="border-red-300 text-red-600 hover:bg-red-50 order-3 w-full sm:w-auto mt-2 sm:mt-0"
                              onClick={() => cancelBooking(booking.id)}
                            >
                              Annuler
                            </Button>
                          ) : (booking.status === 'pending' || booking.status === 'accepted') && (
                            <div className="text-xs text-gray-500 bg-amber-50 border border-amber-200 rounded-lg p-2 order-3 w-full sm:w-auto mt-2 sm:mt-0">
                              <p className="font-medium text-amber-800">⚠️ Délai d'annulation dépassé (24h)</p>
                              <p className="mt-1">Contactez le chauffeur directement</p>
                              {booking.drivers?.phone && (
                                <p className="font-semibold text-amber-900 mt-1">{booking.drivers.phone}</p>
                              )}
                            </div>
                          )}
                          {canRateBooking(booking) ? (
                            <Button
                              variant="outline"
                              size="sm"
                              aria-label="Noter le chauffeur"
                              className="border-purple-300 text-purple-600 hover:bg-purple-50 order-4 w-full sm:w-auto mt-2 sm:mt-0"
                              onClick={() => handleRateBooking(booking)}
                            >
                              ⭐ Noter
                            </Button>
                          ) : booking.status === 'completed' && ratedBookings.has(booking.id) ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 order-4 w-full sm:w-auto mt-2 sm:mt-0">
                              ✅ Notée
                            </span>
                          ) : null}
                        </div>
                        {booking.notes && (
                          <p className="mt-2 text-sm text-gray-600 italic">
                            Note: {booking.notes}
                          </p>
                        )}
                        <p className="mt-2 text-xs text-gray-500">
                          Réservé le {new Date(booking.created_at).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                      <div className="lg:ml-4 flex-shrink-0">
                        {booking.drivers ? (
                          <div className="text-right">
                            <p className="text-sm font-medium text-gray-900">
                              {booking.drivers.first_name} {booking.drivers.last_name}
                            </p>
                            <p className="text-xs text-gray-500">Chauffeur assigné</p>
                            {booking.drivers.phone && (
                              <p className="text-xs text-gray-500">
                                Tél: {booking.drivers.phone}
                              </p>
                            )}
                          </div>
                        ) : booking.driverId ? (
                          <div className="text-right">
                            <p className="text-sm font-medium text-gray-900">Chauffeur assigné</p>
                            <p className="text-xs text-gray-500">En cours de chargement...</p>
                          </div>
                        ) : (
                          <div className="text-right">
                            <p className="text-sm text-gray-500">Aucun chauffeur assigné</p>
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
