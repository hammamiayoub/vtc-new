import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Car, 
  CheckCircle, 
  XCircle, 
  Clock, 
  LogOut, 
  Shield,
  Eye,
  UserCheck,
  AlertTriangle,
  User
} from 'lucide-react';
import { Button } from './ui/Button';
import { supabase } from '../lib/supabase';
import { Driver, ClientWithBookings, Booking } from '../types';

interface AdminDashboardProps {
  onLogout: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout }) => {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [clients, setClients] = useState<ClientWithBookings[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [selectedClient, setSelectedClient] = useState<ClientWithBookings | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'drivers' | 'clients'>('drivers');

  useEffect(() => {
    fetchDrivers();
    fetchClients();
    
    // Rafraîchir automatiquement toutes les 30 secondes
    const interval = setInterval(() => {
      fetchDrivers();
      fetchClients();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const fetchDrivers = async () => {
    if (!loading) setRefreshing(true);
    
    try {
      console.log('🔍 Admin - Récupération des chauffeurs...');
      
      // Vérifier l'utilisateur connecté
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      console.log('👤 Admin - Utilisateur connecté:', user?.id);
      
      if (!user) {
        console.error('Aucun utilisateur connecté');
        return;
      }
      
      // Vérifier les permissions admin
      const { data: adminData, error: adminError } = await supabase
        .from('admin_users')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();
      
      console.log('🛡️ Admin - Permissions vérifiées:', !!adminData);
      
      const { data, error } = await supabase
        .from('drivers')
        .select('*')
        .neq('status', 'deleted') // Exclure les comptes supprimés
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erreur lors de la récupération des chauffeurs:', error);
        console.error('Détails de l\'erreur:', error.message, error.code, error.details);
        return;
      }

      console.log('📊 Admin - Chauffeurs récupérés:', data?.length || 0);
      console.log('📋 Admin - Statuts des chauffeurs:', data?.map(d => ({ 
        name: `${d.first_name} ${d.last_name}`, 
        status: d.status 
      })));

      // Récupérer les statistiques détaillées des courses pour chaque chauffeur
      const driversWithStats = await Promise.all(
        data.map(async (driver) => {
          // Récupérer toutes les courses du chauffeur avec leurs statuts
          const { data: allBookings, error: allBookingsError } = await supabase
            .from('bookings')
            .select('status, price_tnd')
            .eq('driver_id', driver.id);

          if (allBookingsError) {
            console.error(`Erreur récupération courses pour ${driver.first_name} ${driver.last_name}:`, allBookingsError);
          }

          // Calculer les statistiques détaillées
          const stats = {
            completedBookings: 0,
            cancelledByDriver: 0,
            cancelledByClient: 0,
            pendingBookings: 0,
            inProgressBookings: 0,
            totalEarnings: 0
          };

          if (allBookings) {
            allBookings.forEach(booking => {
              switch (booking.status) {
                case 'completed':
                  stats.completedBookings++;
                  stats.totalEarnings += booking.price_tnd || 0;
                  break;
                case 'cancelled':
                  // Pour déterminer qui a annulé, on pourrait ajouter un champ cancelled_by
                  // Pour l'instant, on considère toutes les annulations comme "par le client"
                  stats.cancelledByClient++;
                  break;
                case 'pending':
                  stats.pendingBookings++;
                  break;
                case 'in_progress':
                  stats.inProgressBookings++;
                  break;
                case 'accepted':
                  // Les courses acceptées sont comptées dans inProgressBookings
                  stats.inProgressBookings++;
                  break;
              }
            });
          }

          // Calculer le nombre total de courses (toutes sauf pending)
          const totalBookings = stats.completedBookings + stats.cancelledByDriver + stats.cancelledByClient + stats.inProgressBookings;

          return {
            ...driver,
            bookingCount: totalBookings,
            totalEarnings: stats.totalEarnings,
            completedBookings: stats.completedBookings,
            cancelledByDriver: stats.cancelledByDriver,
            cancelledByClient: stats.cancelledByClient,
            pendingBookings: stats.pendingBookings,
            inProgressBookings: stats.inProgressBookings
          };
        })
      );

      console.log('📊 Admin - Statistiques détaillées par chauffeur:', driversWithStats.map(d => ({ 
        name: `${d.first_name} ${d.last_name}`, 
        bookingCount: d.bookingCount,
        totalEarnings: d.totalEarnings,
        completed: d.completedBookings,
        cancelledByDriver: d.cancelledByDriver,
        cancelledByClient: d.cancelledByClient,
        pending: d.pendingBookings,
        inProgress: d.inProgressBookings
      })));

      const formattedDrivers = driversWithStats.map(driver => ({
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
        bookingCount: driver.bookingCount,
        totalEarnings: driver.totalEarnings,
        completedBookings: driver.completedBookings,
        cancelledByDriver: driver.cancelledByDriver,
        cancelledByClient: driver.cancelledByClient,
        pendingBookings: driver.pendingBookings,
        inProgressBookings: driver.inProgressBookings
      }));

      setDrivers(formattedDrivers);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchClients = async () => {
    try {
      console.log('🔍 Admin - Récupération des clients...');
      
      // Récupérer tous les clients
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });

      if (clientsError) {
        console.error('Erreur lors de la récupération des clients:', clientsError);
        return;
      }

      console.log('📊 Admin - Clients récupérés:', clientsData?.length || 0);

      // Pour chaque client, récupérer ses courses avec les détails
      const clientsWithBookings = await Promise.all(
        clientsData.map(async (client) => {
          // Récupérer toutes les courses du client
          const { data: bookingsData, error: bookingsError } = await supabase
            .from('bookings')
            .select(`
              *,
              drivers (
                first_name,
                last_name,
                phone
              )
            `)
            .eq('client_id', client.id)
            .order('created_at', { ascending: false });

          if (bookingsError) {
            console.error(`Erreur récupération courses pour ${client.first_name} ${client.last_name}:`, bookingsError);
          }

          // Calculer les statistiques
          const stats = {
            totalBookings: 0,
            completedBookings: 0,
            cancelledBookings: 0,
            pendingBookings: 0,
            totalSpent: 0
          };

          if (bookingsData) {
            stats.totalBookings = bookingsData.length;
            
            bookingsData.forEach((booking: any) => {
              switch (booking.status) {
                case 'completed':
                  stats.completedBookings++;
                  stats.totalSpent += booking.price_tnd || 0;
                  break;
                case 'cancelled':
                  stats.cancelledBookings++;
                  break;
                case 'pending':
                  stats.pendingBookings++;
                  break;
                case 'accepted':
                case 'in_progress':
                  // Ces statuts ne sont pas comptés dans les statistiques finales
                  break;
              }
            });
          }

          return {
            id: client.id,
            firstName: client.first_name,
            lastName: client.last_name,
            email: client.email,
            phone: client.phone,
            city: client.city,
            status: client.status,
            profilePhotoUrl: client.profile_photo_url,
            createdAt: client.created_at,
            updatedAt: client.updated_at,
            bookings: bookingsData || [],
            totalBookings: stats.totalBookings,
            completedBookings: stats.completedBookings,
            cancelledBookings: stats.cancelledBookings,
            pendingBookings: stats.pendingBookings,
            totalSpent: stats.totalSpent
          };
        })
      );

      console.log('📊 Admin - Clients avec statistiques:', clientsWithBookings.map(c => ({
        name: `${c.firstName} ${c.lastName}`,
        totalBookings: c.totalBookings,
        completedBookings: c.completedBookings,
        cancelledBookings: c.cancelledBookings,
        totalSpent: c.totalSpent
      })));

      setClients(clientsWithBookings);
    } catch (error) {
      console.error('Erreur lors de la récupération des clients:', error);
    }
  };

  const updateDriverStatus = async (driverId: string, newStatus: string) => {
    setActionLoading(driverId);
    
    try {
      // Récupérer les données du chauffeur avant la mise à jour
      const driver = drivers.find(d => d.id === driverId);
      if (!driver) {
        console.error('Chauffeur non trouvé');
        return;
      }

      const { error } = await supabase
        .from('drivers')
        .update({ status: newStatus })
        .eq('id', driverId);

      if (error) {
        console.error('Erreur lors de la mise à jour:', error);
        return;
      }

      // Envoyer l'email de validation si le chauffeur est approuvé
      if (newStatus === 'active') {
        try {
          console.log('📧 Envoi email de validation au chauffeur:', driver.email);
          
          const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-driver-validation-email`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              driverData: {
                email: driver.email,
                first_name: driver.firstName,
                last_name: driver.lastName,
                phone: driver.phone,
                city: driver.city,
                status: newStatus,
                vehicle_make: driver.vehicleInfo?.make,
                vehicle_model: driver.vehicleInfo?.model
              }
            })
          });

          if (!response.ok) {
            const errorData = await response.json();
            console.error('❌ Erreur lors de l\'envoi de l\'email de validation:', errorData);
            // Ne pas bloquer le processus si l'email échoue
          } else {
            const result = await response.json();
            console.log('✅ Email de validation envoyé avec succès:', result);
          }
        } catch (emailError) {
          console.error('❌ Erreur lors de l\'envoi de l\'email de validation:', emailError);
          // Ne pas bloquer le processus si l'email échoue
        }
      }

      // Mettre à jour l'état local
      setDrivers(prev => prev.map(driver => 
        driver.id === driverId ? { ...driver, status: newStatus } : driver
      ));
      
      setSelectedDriver(null);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setActionLoading(null);
      // Rafraîchir la liste après une action
      fetchDrivers();
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    onLogout();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle size={12} />
            Actif
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
            <Clock size={12} />
            En attente
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircle size={12} />
            Rejeté
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            <AlertTriangle size={12} />
            Inconnu
          </span>
        );
    }
  };

  const getBookingStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle size={12} />
            Terminée
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircle size={12} />
            Annulée
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
            <Clock size={12} />
            En attente
          </span>
        );
      case 'accepted':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <CheckCircle size={12} />
            Acceptée
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
            <Clock size={12} />
            En cours
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            <AlertTriangle size={12} />
            Inconnu
          </span>
        );
    }
  };

  const pendingDrivers = drivers.filter(d => d.status === 'pending');
  const activeDrivers = drivers.filter(d => d.status === 'active');
  const rejectedDrivers = drivers.filter(d => d.status === 'rejected');

  // Statistiques des clients
  const totalClients = clients.length;
  const totalBookings = clients.reduce((sum, client) => sum + client.totalBookings, 0);
  const completedBookings = clients.reduce((sum, client) => sum + client.completedBookings, 0);
  const cancelledBookings = clients.reduce((sum, client) => sum + client.cancelledBookings, 0);
  const totalRevenue = clients.reduce((sum, client) => sum + client.totalSpent, 0);

  console.log('Statistiques:', {
    total: drivers.length,
    pending: pendingDrivers.length,
    active: activeDrivers.length,
    rejected: rejectedDrivers.length
  });

  console.log('Statistiques clients:', {
    totalClients,
    totalBookings,
    completedBookings,
    cancelledBookings,
    totalRevenue
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
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
                <h1 className="text-2xl font-bold text-gray-900">Administration</h1>
                <p className="text-sm text-gray-600">TuniDrive</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <button
                onClick={fetchDrivers}
                disabled={refreshing}
                className="p-2 text-gray-600 hover:text-black rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
                title="Actualiser"
              >
                <div className={refreshing ? 'animate-spin' : ''}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>
              </button>
              <Button variant="outline" onClick={handleLogout} className="flex items-center gap-2 border-gray-300 text-gray-700 hover:bg-gray-50">
                <LogOut size={16} />
                Déconnexion
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('drivers')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'drivers'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Car size={16} />
                  Chauffeurs ({drivers.length})
                </div>
              </button>
              <button
                onClick={() => setActiveTab('clients')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'clients'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Users size={16} />
                  Clients ({clients.length})
                </div>
              </button>
            </nav>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          {activeTab === 'drivers' ? (
            <>
              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Users size={24} className="text-gray-700" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Total chauffeurs</h3>
                    <p className="text-2xl font-bold text-gray-900">{drivers.length}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Clock size={24} className="text-orange-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">En attente</h3>
                    <p className="text-2xl font-bold text-gray-900">{pendingDrivers.length}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                    <CheckCircle size={24} className="text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Actifs</h3>
                    <p className="text-2xl font-bold text-gray-900">{activeDrivers.length}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                    <XCircle size={24} className="text-red-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Rejetés</h3>
                    <p className="text-2xl font-bold text-gray-900">{rejectedDrivers.length}</p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Users size={24} className="text-gray-700" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Total clients</h3>
                    <p className="text-2xl font-bold text-gray-900">{totalClients}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Car size={24} className="text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Total courses</h3>
                    <p className="text-2xl font-bold text-gray-900">{totalBookings}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                    <CheckCircle size={24} className="text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Terminées</h3>
                    <p className="text-2xl font-bold text-gray-900">{completedBookings}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Revenus</h3>
                    <p className="text-2xl font-bold text-gray-900">{totalRevenue.toFixed(0)} TND</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Content based on active tab */}
        {activeTab === 'drivers' ? (
          /* Drivers List - Version améliorée */
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Gestion des chauffeurs</h2>
                  <p className="text-gray-600">Validez ou rejetez les inscriptions des nouveaux chauffeurs</p>
                </div>
                {refreshing && (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    Actualisation...
                  </div>
                )}
              </div>
            </div>

          {/* Version desktop - Tableau complet */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[200px]">
                    Chauffeur
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[150px]">
                    Contact
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                    Véhicule
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px]">
                    Performance
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px]">
                    Statut
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                    Inscription
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {drivers.map((driver) => (
                  <tr key={driver.id} className="hover:bg-gray-50 transition-colors">
                    {/* Chauffeur */}
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        {driver.profilePhotoUrl ? (
                          <img
                            src={driver.profilePhotoUrl}
                            alt="Photo de profil"
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                            <User size={24} className="text-gray-700" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-gray-900 truncate">
                            {driver.firstName} {driver.lastName}
                          </p>
                          <p className="text-sm text-gray-500 truncate">{driver.email}</p>
                        </div>
                      </div>
                    </td>
                    
                    {/* Contact */}
                    <td className="px-4 py-4">
                      <div className="text-sm space-y-1">
                        <p className="text-gray-900 truncate">{driver.phone || 'Non renseigné'}</p>
                        <p className="text-gray-500 truncate">{driver.city || 'Ville non renseignée'}</p>
                        <p className="text-gray-500 truncate">Permis: {driver.licenseNumber || 'Non renseigné'}</p>
                      </div>
                    </td>
                    
                    {/* Véhicule */}
                    <td className="px-4 py-4">
                      <div className="text-sm">
                        {driver.vehicleInfo ? (
                          <div className="space-y-1">
                            <p className="text-gray-900 font-medium truncate">
                              {driver.vehicleInfo.make} {driver.vehicleInfo.model}
                            </p>
                            <p className="text-gray-500 truncate">
                              {driver.vehicleInfo.year} - {driver.vehicleInfo.color}
                            </p>
                            <p className="text-gray-500 truncate">
                              {driver.vehicleInfo.seats} places
                            </p>
                          </div>
                        ) : (
                          <p className="text-gray-500 italic">Non renseigné</p>
                        )}
                      </div>
                    </td>
                    
                    {/* Performance */}
                    <td className="px-4 py-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">Courses:</span>
                          <span className="text-sm font-semibold text-gray-900">
                            {driver.completedBookings || 0}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">Gains:</span>
                          <span className="text-sm font-semibold text-green-600">
                            {(driver.totalEarnings || 0).toFixed(0)} TND
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">Annulées:</span>
                          <span className="text-sm font-semibold text-red-600">
                            {(driver.cancelledByDriver || 0) + (driver.cancelledByClient || 0)}
                          </span>
                        </div>
                      </div>
                    </td>
                    
                    {/* Statut */}
                    <td className="px-4 py-4">
                      {getStatusBadge(driver.status)}
                    </td>
                    
                    {/* Inscription */}
                    <td className="px-4 py-4">
                      <div className="text-sm">
                        <p className="text-gray-900">
                          {new Date(driver.createdAt).toLocaleDateString('fr-FR')}
                        </p>
                        <p className="text-gray-500">
                          {new Date(driver.createdAt).toLocaleTimeString('fr-FR', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </p>
                      </div>
                    </td>
                    
                    {/* Actions */}
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setSelectedDriver(driver)}
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Voir les détails"
                        >
                          <Eye size={16} />
                        </button>
                        
                        {driver.status === 'pending' && (
                          <>
                            <button
                              onClick={() => updateDriverStatus(driver.id, 'active')}
                              disabled={actionLoading === driver.id}
                              className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors disabled:opacity-50"
                              title="Approuver"
                            >
                              <UserCheck size={16} />
                            </button>
                            <button
                              onClick={() => updateDriverStatus(driver.id, 'rejected')}
                              disabled={actionLoading === driver.id}
                              className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
                              title="Rejeter"
                            >
                              <XCircle size={16} />
                            </button>
                          </>
                        )}
                        
                        {driver.status === 'active' && (
                          <button
                            onClick={() => updateDriverStatus(driver.id, 'pending')}
                            disabled={actionLoading === driver.id}
                            className="p-2 text-orange-600 hover:bg-orange-100 rounded-lg transition-colors disabled:opacity-50"
                            title="Suspendre"
                          >
                            <Clock size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Version mobile/tablet - Cards */}
          <div className="lg:hidden">
            <div className="divide-y divide-gray-200">
              {drivers.map((driver) => (
                <div key={driver.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {driver.profilePhotoUrl ? (
                        <img
                          src={driver.profilePhotoUrl}
                          alt="Photo de profil"
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                          <User size={24} className="text-gray-700" />
                        </div>
                      )}
                      <div>
                        <h3 className="font-medium text-gray-900">
                          {driver.firstName} {driver.lastName}
                        </h3>
                        <p className="text-sm text-gray-500">{driver.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(driver.status)}
                      <button
                        onClick={() => setSelectedDriver(driver)}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Voir les détails"
                      >
                        <Eye size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Contact</p>
                      <p className="text-sm text-gray-900">{driver.phone || 'Non renseigné'}</p>
                      <p className="text-sm text-gray-500">{driver.city || 'Ville non renseignée'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Véhicule</p>
                      {driver.vehicleInfo ? (
                        <div>
                          <p className="text-sm text-gray-900">
                            {driver.vehicleInfo.make} {driver.vehicleInfo.model}
                          </p>
                          <p className="text-sm text-gray-500">
                            {driver.vehicleInfo.year} - {driver.vehicleInfo.color}
                          </p>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 italic">Non renseigné</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="text-center">
                      <p className="text-xs text-gray-500 mb-1">Courses</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {driver.completedBookings || 0}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-500 mb-1">Gains</p>
                      <p className="text-lg font-semibold text-green-600">
                        {(driver.totalEarnings || 0).toFixed(0)} TND
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-500 mb-1">Annulées</p>
                      <p className="text-lg font-semibold text-red-600">
                        {(driver.cancelledByDriver || 0) + (driver.cancelledByClient || 0)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-500">
                      Inscrit le {new Date(driver.createdAt).toLocaleDateString('fr-FR')}
                    </p>
                    <div className="flex items-center gap-2">
                      {driver.status === 'pending' && (
                        <>
                          <button
                            onClick={() => updateDriverStatus(driver.id, 'active')}
                            disabled={actionLoading === driver.id}
                            className="px-3 py-1 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                          >
                            Approuver
                          </button>
                          <button
                            onClick={() => updateDriverStatus(driver.id, 'rejected')}
                            disabled={actionLoading === driver.id}
                            className="px-3 py-1 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                          >
                            Rejeter
                          </button>
                        </>
                      )}
                      
                      {driver.status === 'active' && (
                        <button
                          onClick={() => updateDriverStatus(driver.id, 'pending')}
                          disabled={actionLoading === driver.id}
                          className="px-3 py-1 text-xs bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
                        >
                          Suspendre
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {drivers.length === 0 && (
            <div className="text-center py-12">
              <Car size={48} className="text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun chauffeur inscrit</h3>
              <p className="text-gray-500">Les nouveaux chauffeurs apparaîtront ici une fois inscrits.</p>
              <div className="mt-4 p-4 bg-gray-50 rounded-lg text-left">
                <p className="text-sm text-gray-600 mb-2">Debug info:</p>
                <p className="text-xs text-gray-500">Total drivers: {drivers.length}</p>
                <p className="text-xs text-gray-500">Loading: {loading.toString()}</p>
                <p className="text-xs text-gray-500">Refreshing: {refreshing.toString()}</p>
              </div>
            </div>
          )}
        </div>
        ) : (
          /* Clients List */
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Gestion des clients</h2>
                  <p className="text-gray-600">Consultez les informations des clients et leurs courses</p>
                </div>
                {refreshing && (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    Actualisation...
                  </div>
                )}
              </div>
            </div>

            {/* Version desktop - Tableau des clients */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[200px]">
                      Client
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[150px]">
                      Contact
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                      Statistiques
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px]">
                      Courses
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px]">
                      Inscription
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {clients.map((client) => (
                    <tr key={client.id} className="hover:bg-gray-50 transition-colors">
                      {/* Client */}
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          {client.profilePhotoUrl ? (
                            <img
                              src={client.profilePhotoUrl}
                              alt="Photo de profil"
                              className="w-12 h-12 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                              <User size={24} className="text-gray-700" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-gray-900 truncate">
                              {client.firstName} {client.lastName}
                            </p>
                            <p className="text-sm text-gray-500 truncate">{client.email}</p>
                          </div>
                        </div>
                      </td>
                      
                      {/* Contact */}
                      <td className="px-4 py-4">
                        <div className="text-sm space-y-1">
                          <p className="text-gray-900 truncate">{client.phone || 'Non renseigné'}</p>
                          <p className="text-gray-500 truncate">{client.city || 'Ville non renseignée'}</p>
                        </div>
                      </td>
                      
                      {/* Statistiques */}
                      <td className="px-4 py-4">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500">Total:</span>
                            <span className="text-sm font-semibold text-gray-900">
                              {client.totalBookings}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500">Terminées:</span>
                            <span className="text-sm font-semibold text-green-600">
                              {client.completedBookings}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500">Annulées:</span>
                            <span className="text-sm font-semibold text-red-600">
                              {client.cancelledBookings}
                            </span>
                          </div>
                        </div>
                      </td>
                      
                      {/* Courses */}
                      <td className="px-4 py-4">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500">Dépensé:</span>
                            <span className="text-sm font-semibold text-green-600">
                              {client.totalSpent.toFixed(0)} TND
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500">En attente:</span>
                            <span className="text-sm font-semibold text-orange-600">
                              {client.pendingBookings}
                            </span>
                          </div>
                        </div>
                      </td>
                      
                      {/* Inscription */}
                      <td className="px-4 py-4">
                        <div className="text-sm">
                          <p className="text-gray-900">
                            {new Date(client.createdAt).toLocaleDateString('fr-FR')}
                          </p>
                          <p className="text-gray-500">
                            {new Date(client.createdAt).toLocaleTimeString('fr-FR', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </p>
                        </div>
                      </td>
                      
                      {/* Actions */}
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setSelectedClient(client)}
                            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Voir les détails"
                          >
                            <Eye size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Version mobile/tablet - Cards des clients */}
            <div className="lg:hidden">
              <div className="divide-y divide-gray-200">
                {clients.map((client) => (
                  <div key={client.id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        {client.profilePhotoUrl ? (
                          <img
                            src={client.profilePhotoUrl}
                            alt="Photo de profil"
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                            <User size={24} className="text-gray-700" />
                          </div>
                        )}
                        <div>
                          <h3 className="font-medium text-gray-900">
                            {client.firstName} {client.lastName}
                          </h3>
                          <p className="text-sm text-gray-500">{client.email}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedClient(client)}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Voir les détails"
                      >
                        <Eye size={16} />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Contact</p>
                        <p className="text-sm text-gray-900">{client.phone || 'Non renseigné'}</p>
                        <p className="text-sm text-gray-500">{client.city || 'Ville non renseignée'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Statistiques</p>
                        <p className="text-sm text-gray-900">Total: {client.totalBookings}</p>
                        <p className="text-sm text-gray-500">Terminées: {client.completedBookings}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div className="text-center">
                        <p className="text-xs text-gray-500 mb-1">Dépensé</p>
                        <p className="text-lg font-semibold text-green-600">
                          {client.totalSpent.toFixed(0)} TND
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-500 mb-1">Annulées</p>
                        <p className="text-lg font-semibold text-red-600">
                          {client.cancelledBookings}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-500 mb-1">En attente</p>
                        <p className="text-lg font-semibold text-orange-600">
                          {client.pendingBookings}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-500">
                        Inscrit le {new Date(client.createdAt).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {clients.length === 0 && (
              <div className="text-center py-12">
                <Users size={48} className="text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun client inscrit</h3>
                <p className="text-gray-500">Les nouveaux clients apparaîtront ici une fois inscrits.</p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Driver Detail Modal */}
      {selectedDriver && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold text-gray-900">
                  Détails du chauffeur
                </h3>
                <button
                  onClick={() => setSelectedDriver(null)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <XCircle size={24} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Personal Info */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Informations personnelles</h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">Nom complet</p>
                    <p className="font-semibold text-gray-900">
                      {selectedDriver.firstName} {selectedDriver.lastName}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">Email</p>
                    <p className="font-semibold text-gray-900">{selectedDriver.email}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">Téléphone</p>
                    <p className="font-semibold text-gray-900">
                      {selectedDriver.phone || 'Non renseigné'}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">Permis de conduire</p>
                    <p className="font-semibold text-gray-900">
                      {selectedDriver.licenseNumber || 'Non renseigné'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Vehicle Info */}
              {selectedDriver.vehicleInfo && (
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Informations véhicule</h4>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600 mb-1">Véhicule</p>
                      <p className="font-semibold text-gray-900">
                        {selectedDriver.vehicleInfo.make} {selectedDriver.vehicleInfo.model}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600 mb-1">Année</p>
                      <p className="font-semibold text-gray-900">{selectedDriver.vehicleInfo.year}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600 mb-1">Couleur</p>
                      <p className="font-semibold text-gray-900">{selectedDriver.vehicleInfo.color}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600 mb-1">Plaque</p>
                      <p className="font-semibold text-gray-900">{selectedDriver.vehicleInfo.licensePlate}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600 mb-1">Places</p>
                      <p className="font-semibold text-gray-900">{selectedDriver.vehicleInfo.seats} places</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600 mb-1">Type</p>
                      <p className="font-semibold text-gray-900">
                        {selectedDriver.vehicleInfo.type === 'sedan' && 'Berline'}
                        {selectedDriver.vehicleInfo.type === 'suv' && 'SUV'}
                        {selectedDriver.vehicleInfo.type === 'luxury' && 'Véhicule de luxe'}
                        {selectedDriver.vehicleInfo.type === 'van' && 'Monospace'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Statistics */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Statistiques des courses</h4>
                <div className="grid md:grid-cols-2 gap-4 mb-6">
                  <div className="bg-green-50 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <CheckCircle size={20} className="text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Courses terminées</p>
                        <p className="text-2xl font-bold text-green-600">
                          {selectedDriver.completedBookings || 0}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Gains totaux</p>
                        <p className="text-2xl font-bold text-blue-600">
                          {(selectedDriver.totalEarnings || 0).toFixed(2)} TND
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div className="bg-red-50 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                        <XCircle size={20} className="text-red-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Annulées par chauffeur</p>
                        <p className="text-xl font-bold text-red-600">
                          {selectedDriver.cancelledByDriver || 0}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-orange-50 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                        <XCircle size={20} className="text-orange-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Annulées par client</p>
                        <p className="text-xl font-bold text-orange-600">
                          {selectedDriver.cancelledByClient || 0}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                        <Clock size={20} className="text-purple-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1">En cours</p>
                        <p className="text-xl font-bold text-purple-600">
                          {selectedDriver.inProgressBookings || 0}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status and Actions */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Statut et actions</h4>
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-600">Statut actuel:</span>
                    {getStatusBadge(selectedDriver.status)}
                  </div>
                  
                  <div className="flex gap-2">
                    {selectedDriver.status === 'pending' && (
                      <>
                        <Button
                          onClick={() => updateDriverStatus(selectedDriver.id, 'active')}
                          loading={actionLoading === selectedDriver.id}
                          className="bg-black hover:bg-gray-800 text-white flex items-center gap-2"
                          size="sm"
                        >
                          <CheckCircle size={16} />
                          Approuver
                        </Button>
                        <Button
                          onClick={() => updateDriverStatus(selectedDriver.id, 'rejected')}
                          loading={actionLoading === selectedDriver.id}
                          className="bg-red-600 hover:bg-red-700 text-white flex items-center gap-2"
                          size="sm"
                        >
                          <XCircle size={16} />
                          Rejeter
                        </Button>
                      </>
                    )}
                    
                    {selectedDriver.status === 'active' && (
                      <Button
                        onClick={() => updateDriverStatus(selectedDriver.id, 'pending')}
                        loading={actionLoading === selectedDriver.id}
                        className="bg-orange-600 hover:bg-orange-700 text-white flex items-center gap-2"
                        size="sm"
                      >
                        <Clock size={16} />
                        Suspendre
                      </Button>
                    )}
                    
                    {selectedDriver.status === 'rejected' && (
                      <Button
                        onClick={() => updateDriverStatus(selectedDriver.id, 'pending')}
                        loading={actionLoading === selectedDriver.id}
                        className="bg-black hover:bg-gray-800 text-white flex items-center gap-2"
                        size="sm"
                      >
                        <Clock size={16} />
                        Remettre en attente
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
                <p><strong>Inscrit le:</strong> {new Date(selectedDriver.createdAt).toLocaleString('fr-FR')}</p>
                <p><strong>Dernière mise à jour:</strong> {new Date(selectedDriver.updatedAt).toLocaleString('fr-FR')}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Client Detail Modal */}
      {selectedClient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold text-gray-900">
                  Détails du client
                </h3>
                <button
                  onClick={() => setSelectedClient(null)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <XCircle size={24} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Personal Info */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Informations personnelles</h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">Nom complet</p>
                    <p className="font-semibold text-gray-900">
                      {selectedClient.firstName} {selectedClient.lastName}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">Email</p>
                    <p className="font-semibold text-gray-900">{selectedClient.email}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">Téléphone</p>
                    <p className="font-semibold text-gray-900">
                      {selectedClient.phone || 'Non renseigné'}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">Ville</p>
                    <p className="font-semibold text-gray-900">
                      {selectedClient.city || 'Non renseignée'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Statistics */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Statistiques des courses</h4>
                <div className="grid md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <Car size={20} className="text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Total courses</p>
                        <p className="text-2xl font-bold text-blue-600">
                          {selectedClient.totalBookings}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <CheckCircle size={20} className="text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Terminées</p>
                        <p className="text-2xl font-bold text-green-600">
                          {selectedClient.completedBookings}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-red-50 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                        <XCircle size={20} className="text-red-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Annulées</p>
                        <p className="text-2xl font-bold text-red-600">
                          {selectedClient.cancelledBookings}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Total dépensé</p>
                        <p className="text-2xl font-bold text-purple-600">
                          {selectedClient.totalSpent.toFixed(0)} TND
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bookings List */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Historique des courses</h4>
                {selectedClient.bookings.length > 0 ? (
                  <div className="space-y-4">
                    {selectedClient.bookings.map((booking: any) => (
                      <div key={booking.id} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h5 className="font-medium text-gray-900">
                                Course #{booking.id.slice(-8)}
                              </h5>
                              {getBookingStatusBadge(booking.status)}
                            </div>
                            <div className="grid md:grid-cols-2 gap-4 text-sm">
                              <div>
                                <p className="text-gray-600 mb-1">Départ</p>
                                <p className="text-gray-900">{booking.pickup_address}</p>
                              </div>
                              <div>
                                <p className="text-gray-600 mb-1">Arrivée</p>
                                <p className="text-gray-900">{booking.destination_address}</p>
                              </div>
                              <div>
                                <p className="text-gray-600 mb-1">Date et heure</p>
                                <p className="text-gray-900">
                                  {new Date(booking.scheduled_time).toLocaleString('fr-FR')}
                                </p>
                              </div>
                              <div>
                                <p className="text-gray-600 mb-1">Prix</p>
                                <p className="text-gray-900 font-semibold">
                                  {booking.price_tnd} TND
                                  {booking.is_return_trip && (
                                    <span className="ml-2 text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full">
                                      Aller-retour
                                    </span>
                                  )}
                                </p>
                              </div>
                            </div>
                            {booking.drivers && (
                              <div className="mt-3 pt-3 border-t border-gray-200">
                                <p className="text-gray-600 mb-1">Chauffeur assigné</p>
                                <p className="text-gray-900">
                                  {booking.drivers.first_name} {booking.drivers.last_name}
                                </p>
                              </div>
                            )}
                            {booking.notes && (
                              <div className="mt-3 pt-3 border-t border-gray-200">
                                <p className="text-gray-600 mb-1">Notes</p>
                                <p className="text-gray-900">{booking.notes}</p>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-xs text-gray-500">
                          Créée le {new Date(booking.created_at).toLocaleString('fr-FR')}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-gray-50 rounded-lg">
                    <Car size={48} className="text-gray-400 mx-auto mb-4" />
                    <h5 className="text-lg font-medium text-gray-900 mb-2">Aucune course</h5>
                    <p className="text-gray-500">Ce client n'a pas encore effectué de réservation.</p>
                  </div>
                )}
              </div>

              <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
                <p><strong>Inscrit le:</strong> {new Date(selectedClient.createdAt).toLocaleString('fr-FR')}</p>
                <p><strong>Dernière mise à jour:</strong> {new Date(selectedClient.updatedAt).toLocaleString('fr-FR')}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
