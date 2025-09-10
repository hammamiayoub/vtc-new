import React, { useState, useEffect } from 'react';
import { MapPin, Clock, User, LogOut, Settings, Bell, Car, Plus, Navigation, CheckCircle, XCircle } from 'lucide-react';
import { Button } from './ui/Button';
import { supabase } from '../lib/supabase';
import { Client, Booking } from '../types';
import { BookingForm } from './BookingForm';
import { BookingConfirmation } from './BookingConfirmation';
import { ProfileModal } from './ProfileModal';
import { NotificationBell } from './NotificationBell';
import { useClientNotifications } from '../hooks/useNotifications';

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

  // Hook pour les notifications
  const { unreadCount, hasNewBookings, markAsRead, refreshNotifications } = useClientNotifications(client?.id || '');

  useEffect(() => {
    const fetchClientData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          const { data: clientData, error } = await supabase
            .from('clients')
            .select('*')
            .eq('id', user.id)
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

    fetchClientData();
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
            En attente
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
            Inconnu
          </span>
        );
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
      {/* Header */}
      <header className="bg-black border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-3">
              <div>
                <h1 className="text-3xl font-bold text-white tracking-tight">MyRide</h1>
                <p className="text-1xl text-white">Espace Client</p>
              </div>
            </div>
            
            <div className="flex items-center">
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
                <Settings size={20} />
              </button>
              <Button onClick={handleLogout} className="flex items-center gap-2 bg-white border-2 border-gray-300 text-gray-900 hover:bg-gray-50 rounded-lg font-medium transition-all duration-200">
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
              onClick={() => {
                setActiveTab('dashboard');
                setShowBookingForm(false);
              }}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
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
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
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
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
              <div className="flex items-center gap-4">
                {client?.profilePhotoUrl ? (
                  <img
                    src={client.profilePhotoUrl}
                    alt="Photo de profil"
                    className="w-16 h-16 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                    <User size={32} className="text-gray-700" />
                  </div>
                )}
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    Bienvenue, {client?.firstName} {client?.lastName}
                  </h2>
                  <p className="text-gray-600">Espace client - Réservation de courses</p>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid md:grid-cols-3 gap-6 mb-8">
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
                <p className="text-2xl font-bold text-gray-900 mb-2">{bookings.length}</p>
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
          </>
        )}

        {/* Liste des réservations */}
        {!showBookingForm && activeTab === 'bookings' && activeTab !== 'confirmation' && (
          <div className="bg-white rounded-xl shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900">Mes réservations</h3>
              <p className="text-gray-600">Historique de vos courses</p>
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
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
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
                          <span className="font-bold text-gray-900">{booking.price_tnd} TND</span>
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
                        <div className="mt-3 flex items-center gap-4">
                          <p className="font-semibold text-gray-900">{booking.distance_km} km</p>
                          {getStatusBadge(booking.status)}
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
                      <div className="ml-4">
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
                        ) : booking.driver_id ? (
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
          />
        )}
      </main>
    </div>
  );
};