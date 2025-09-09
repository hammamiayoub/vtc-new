import React, { useState, useEffect } from 'react';
import { User, Car, Clock, MapPin, LogOut, Settings, Bell, AlertCircle, Navigation, Phone, CheckCircle, XCircle, MessageSquare } from 'lucide-react';
import { Button } from './ui/Button';
import { DriverProfileForm } from './DriverProfileForm';
import { AvailabilityCalendar } from './AvailabilityCalendar';
import { ProfileModal } from './ProfileModal';
import { NotificationBell } from './NotificationBell';
import { useDriverNotifications } from '../hooks/useNotifications';
import { supabase } from '../lib/supabase';
import { Driver, Booking } from '../types';

interface DriverDashboardProps {
  onLogout: () => void;
}

export const DriverDashboard: React.FC<DriverDashboardProps> = ({ onLogout }) => {
  const [driver, setDriver] = useState<Driver | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'availability' | 'bookings'>('dashboard');
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Hook pour les notifications
  const { unreadCount, hasNewBookings, markAsRead, refreshNotifications } = useDriverNotifications(driver?.id || '');

  useEffect(() => {
    const fetchDriverData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          const { data: driverData, error } = await supabase
            .from('drivers')
            .select('*')
            .eq('id', user.id)
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
              licenseNumber: driverData.license_number,
              vehicleInfo: driverData.vehicle_info,
              status: driverData.status,
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

    fetchDriverData();
  }, []);

  useEffect(() => {
    const fetchBookings = async () => {
      if (driver) {
        console.log('=== DEBUT DIAGNOSTIC CHAUFFEUR ===');
        console.log('ID du chauffeur:', driver.id);
        
        try {
          // Vérifier l'utilisateur connecté
          const { data: { user }, error: userError } = await supabase.auth.getUser();
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
            return;
          }

          // Récupérer les informations des clients pour chaque réservation
          const bookingsWithClients = await Promise.all(
            bookingsData.map(async (booking) => {
              if (booking.client_id) {
                const { data: clientData, error: clientError } = await supabase
                  .from('clients')
                  .select('first_name, last_name, phone')
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
            phone: b.clients?.phone || 'Pas de téléphone'
          })));

          setBookings(bookingsWithClients);
        } catch (error) {
          console.error('Erreur:', error);
        }
      }
    };

    fetchBookings();
  }, [driver]);

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
          return;
        }

        // Récupérer les informations des clients
        const bookingsWithClients = await Promise.all(
          bookingsData.map(async (booking) => {
            if (booking.client_id) {
              const { data: clientData, error: clientError } = await supabase
                .from('clients')
                .select('first_name, last_name, phone')
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
      } catch (error) {
        console.error('Erreur refresh:', error);
      }
    }
  };

  const updateBookingStatus = async (bookingId: string, newStatus: string) => {
    try {
      console.log('🔄 Mise à jour du statut:', { bookingId, newStatus });
      
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
        alert('Erreur lors de la mise à jour du statut');
        return;
      }

      console.log('✅ Statut mis à jour avec succès');
      
      // Rafraîchir les données après la mise à jour
      await refreshBookings();
    } catch (error) {
      console.error('Erreur:', error);
      alert('Une erreur est survenue');
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

  const needsProfileCompletion = !driver?.phone || !driver?.licenseNumber || !driver?.vehicleInfo;

  const pendingBookings = bookings.filter(b => b.status === 'pending' || b.status === 'accepted');
  const completedBookings = bookings.filter(b => b.status === 'completed');
  const totalEarnings = completedBookings.reduce((sum, booking) => sum + booking.price_tnd, 0);

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
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle size={12} />
            Acceptée
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">MyRide</h1>
                <p className="text-sm text-gray-600">Espace Chauffeur</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <NotificationBell
                unreadCount={unreadCount}
                hasNewNotifications={hasNewBookings}
                onClick={() => {
                  markAsRead();
                  setActiveTab('bookings');
                }}
              />
              <button 
                onClick={() => setShowProfileModal(true)}
                className="p-2 text-gray-600 hover:text-black rounded-lg hover:bg-gray-100 transition-colors"
                title="Mon profil"
              >
                <Settings size={20} />
              </button>
              <Button variant="outline" onClick={handleLogout} className="flex items-center gap-2 border-gray-300 text-gray-700 hover:bg-gray-50">
                <LogOut size={16} />
                Déconnexion
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'dashboard'
                  ? 'border-black text-black'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Tableau de bord
            </button>
            <button
              onClick={() => setActiveTab('availability')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'availability'
                  ? 'border-black text-black'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Disponibilités
            </button>
            <button
              onClick={() => setActiveTab('bookings')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'bookings'
                  ? 'border-black text-black'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Mes courses ({bookings.length})
              {pendingBookings.length > 0 && (
                <span className="ml-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-600 rounded-full">
                  {pendingBookings.length}
                </span>
              )}
            </button>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Completion Alert */}
        {needsProfileCompletion && !showProfileForm && (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 mb-8">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-6 h-6 text-gray-700 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-2">
                  Complétez votre profil
                </h3>
                <p className="text-gray-700 mb-4">
                  Pour commencer à recevoir des courses, vous devez compléter vos informations 
                  personnelles et ajouter les détails de votre véhicule.
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
        {showProfileForm && driver && (
          <div className="mb-8">
            <DriverProfileForm 
              driverId={driver.id} 
              onProfileComplete={handleProfileComplete}
            />
          </div>
        )}

        {/* Contenu conditionnel basé sur l'onglet actif */}
        {!showProfileForm && activeTab === 'dashboard' && (
          <>
            {/* Welcome Section */}
            <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
              <div className="flex items-center gap-4">
                {driver?.profilePhotoUrl ? (
                  <img
                    src={driver.profilePhotoUrl}
                    alt="Photo de profil"
                    className="w-16 h-16 rounded-2xl object-cover"
                  />
                ) : (
                  <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center">
                    <User size={32} className="text-gray-700" />
                  </div>
                )}
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    Bienvenue, {driver?.firstName} {driver?.lastName}
                  </h2>
                  <p className="text-gray-600">Tableau de bord chauffeur</p>
                </div>
              </div>
            </div>

            {/* Status and Stats Cards */}
            <div className="flex items-center gap-4">
              <div className="grid md:grid-cols-3 gap-6 mb-8 w-full">
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                      driver?.status === 'active' ? 'bg-green-100' : 'bg-gray-100'
                    }`}>
                      <Clock size={24} className={driver?.status === 'active' ? 'text-green-600' : 'text-gray-700'} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Statut</h3>
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
                      <h3 className="font-semibold text-gray-900">Nouvelles demandes</h3>
                      <p className="text-sm text-gray-600">À traiter</p>
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-gray-900">{pendingBookings.length}</p>
                  {pendingBookings.length > 0 && (
                    <p className="text-sm text-gray-700 font-medium mt-1">
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
                      <h3 className="font-semibold text-gray-900">Courses terminées</h3>
                      <p className="text-sm text-gray-600">Total</p>
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-gray-900">{completedBookings.length}</p>
                  <p className="text-sm text-gray-700 font-medium mt-1">
                    {totalEarnings.toFixed(2)} TND gagnés
                  </p>
                </div>
              </div>
            </div>

            {/* Next Steps */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Prochaines étapes</h3>
              <div className="space-y-4">
                <div className={`flex items-center gap-4 p-4 rounded-lg ${
                  needsProfileCompletion ? 'bg-gray-50 border border-gray-200' : 'bg-green-50 border border-green-200'
                }`}>
                  <div className={`w-8 h-8 text-white rounded-full flex items-center justify-center text-sm font-bold ${
                    needsProfileCompletion ? 'bg-gray-700' : 'bg-green-600'
                  }`}>
                    1
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">Compléter le profil</h4>
                    <p className="text-sm text-gray-600">
                      {needsProfileCompletion 
                        ? 'Ajoutez vos informations personnelles et véhicule'
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
                  <div>
                    <h4 className="font-medium text-gray-900">Validation du compte</h4>
                    <p className="text-sm text-gray-600">
                      {driver?.status === 'active' ? 'Compte validé ✓' : 'En attente - Un administrateur doit valider votre compte'}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg opacity-50">
                  <div className="w-8 h-8 bg-gray-400 text-white rounded-full flex items-center justify-center text-sm font-bold">
                    3
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Première course</h4>
                    <p className="text-sm text-gray-600">Commencez à recevoir des demandes</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Vehicle Info Display */}
            {driver?.vehicleInfo && (
              <div className="bg-white rounded-xl shadow-sm p-6 mt-8">
                <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Car className="w-5 h-5 text-gray-700" />
                  Mon véhicule
                </h3>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">Véhicule</p>
                    <p className="font-semibold text-gray-900">
                      {driver.vehicleInfo.make} {driver.vehicleInfo.model}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">Année</p>
                    <p className="font-semibold text-gray-900">{driver.vehicleInfo.year}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">Couleur</p>
                    <p className="font-semibold text-gray-900">{driver.vehicleInfo.color}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">Places</p>
                    <p className="font-semibold text-gray-900">{driver.vehicleInfo.seats} places</p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Onglet Disponibilités */}
        {!showProfileForm && activeTab === 'availability' && driver && (
          <AvailabilityCalendar driverId={driver.id} />
        )}

        {/* Onglet Courses */}
        {!showProfileForm && activeTab === 'bookings' && (
          <div className="space-y-6">
            {/* Nouvelles demandes - Statut 'accepted' */}
            {bookings.filter(b => b.status === 'accepted').length > 0 && (
              <div className="bg-white rounded-xl shadow-sm">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                    <Bell className="w-5 h-5 text-blue-600" />
                    Nouvelles demandes ({pendingBookings.length})
                  </h3>
                  <p className="text-gray-600">Courses en attente de votre confirmation</p>
                </div>
                <div className="divide-y divide-gray-200">
                  {pendingBookings.map((booking) => (
                    <div key={booking.id} className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
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
                              <span>{booking.distance_km} km</span>
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
                        <div className="ml-6 flex flex-col gap-2">
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
                              <Button
                                onClick={() => updateBookingStatus(booking.id, 'cancelled')}
                                variant="outline"
                                className="border-red-300 text-red-600 hover:bg-red-50 flex items-center gap-2"
                                size="sm"
                              >
                                <XCircle size={16} />
                                Refuser
                              </Button>
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
                              <Button
                                onClick={() => updateBookingStatus(booking.id, 'cancelled')}
                                variant="outline"
                                className="border-red-300 text-red-600 hover:bg-red-50 flex items-center gap-2"
                                size="sm"
                              >
                                <XCircle size={16} />
                                Annuler
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                      
                      {/* Informations client */}
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                        <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
                          <User size={16} />
                          Informations client
                        </h4>
                        {booking.clients ? (
                          <div className="flex items-center justify-between">
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
                        <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                          <MapPin size={16} />
                          Détails de la course
                        </h4>
                        <div className="grid md:grid-cols-2 gap-4 text-sm">
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

            {/* Courses en cours */}
            {bookings.filter(b => b.status === 'in_progress').length > 0 && (
              <div className="bg-white rounded-xl shadow-sm">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                    <Car className="w-5 h-5 text-green-600" />
                    Courses en cours ({bookings.filter(b => b.status === 'in_progress').length})
                  </h3>
                  <p className="text-gray-600">Courses que vous avez commencées</p>
                </div>
                <div className="divide-y divide-gray-200">
                  {bookings.filter(b => b.status === 'in_progress').map((booking) => (
                    <div key={booking.id} className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
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
                        <Button
                          onClick={() => updateBookingStatus(booking.id, 'completed')}
                          className="bg-black hover:bg-gray-800 text-white flex items-center gap-2"
                          size="sm"
                        >
                          <CheckCircle size={16} />
                          Terminer la course
                        </Button>
                      </div>
                      {/* Informations client */}
                      {booking.clients && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                          <h4 className="font-medium text-blue-900 mb-2">Informations client</h4>
                          <div className="flex items-center justify-between">
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

            {/* Historique des courses */}
            <div className="bg-white rounded-xl shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-xl font-semibold text-gray-900">Historique des courses</h3>
                <p className="text-gray-600">Toutes vos courses passées</p>
              </div>
              
              {bookings.length === 0 ? (
                <div className="text-center py-12">
                  <Car size={48} className="text-gray-400 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-gray-900 mb-2">Aucune course</h4>
                  <p className="text-gray-500">
                    Vous n'avez pas encore reçu de demande de course.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {bookings.filter(b => !['pending', 'accepted', 'in_progress'].includes(b.status)).map((booking) => (
                    <div key={booking.id} className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
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
          />
        )}
      </main>
    </div>
  );
};