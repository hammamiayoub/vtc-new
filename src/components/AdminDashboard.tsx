import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Car, 
  CheckCircle, 
  XCircle, 
  Clock, 
  LogOut, 
  Eye,
  UserCheck,
  AlertTriangle,
  User,
  Calendar,
  CreditCard,
  TrendingUp,
  AlertCircle as AlertCircleIcon
} from 'lucide-react';
import { Button } from './ui/Button';
import { supabase } from '../lib/supabase';
import { Driver, ClientWithBookings, Vehicle, DriverAvailability } from '../types';

interface AdminDashboardProps {
  onLogout: () => void;
}

interface VehicleWithDriver extends Vehicle {
  driver?: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    city?: string;
    status: string;
  };
  upcomingAvailabilities?: DriverAvailability[];
  availabilityCount?: number;
}

interface DriverSubscription {
  id: string;
  driverId: string;
  startDate: string;
  endDate: string;
  subscriptionType: string;
  billingPeriod: 'monthly' | 'yearly';
  priceTnd: number;
  vatPercentage: number;
  totalPriceTnd: number;
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  paymentMethod?: string;
  paymentDate?: string;
  paymentReference?: string;
  status: 'active' | 'expired' | 'cancelled';
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
  driver?: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    city?: string;
    lifetimeAcceptedBookings?: number;
  };
  daysRemaining?: number;
  expirationStatus?: string;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout }) => {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [clients, setClients] = useState<ClientWithBookings[]>([]);
  const [vehicles, setVehicles] = useState<VehicleWithDriver[]>([]);
  const [subscriptions, setSubscriptions] = useState<DriverSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [selectedClient, setSelectedClient] = useState<ClientWithBookings | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleWithDriver | null>(null);
  const [selectedSubscription, setSelectedSubscription] = useState<DriverSubscription | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'drivers' | 'clients' | 'vehicles' | 'subscriptions'>('drivers');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  // Vérifier l'authentification admin
  useEffect(() => {
    const checkAdminAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.user) {
          // Pas de session, rediriger vers la page de connexion admin
          window.location.href = '/admin';
          return;
        }
        
        // Vérifier si l'utilisateur est admin
        const { data: adminData } = await supabase
          .from('admin_users')
          .select('*')
          .eq('id', session.user.id)
          .limit(1);
        
        if (!adminData || adminData.length === 0) {
          // Pas admin, rediriger vers la page de connexion admin
          window.location.href = '/admin';
          return;
        }
        
        setIsAuthenticated(true);
        setAuthLoading(false);
      } catch (error) {
        console.error('Erreur lors de la vérification admin:', error);
        window.location.href = '/admin';
      }
    };
    
    checkAdminAuth();
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    
    fetchDrivers();
    fetchClients();
    fetchVehicles();
    fetchSubscriptions();
    
    // Rafraîchir automatiquement toutes les 30 secondes
    const interval = setInterval(() => {
      fetchDrivers();
      fetchClients();
      fetchVehicles();
      fetchSubscriptions();
    }, 30000);

    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const fetchDrivers = async () => {
    if (!loading) setRefreshing(true);
    
    try {
      console.log('🔍 Admin - Récupération des chauffeurs...');
      
      // Vérifier l'utilisateur connecté
      const { data: { user } } = await supabase.auth.getUser();
      console.log('👤 Admin - Utilisateur connecté:', user?.id);
      
      if (!user) {
        console.error('Aucun utilisateur connecté');
        return;
      }
      
      // Vérifier les permissions admin
      const { data: adminData } = await supabase
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

          // Récupérer le véhicule principal (is_primary = true) ou le premier véhicule actif
          let vehicleInfo = driver.vehicle_info;
          
          if (!vehicleInfo) {
            const { data: vehiclesData, error: vehiclesError } = await supabase
              .from('vehicles')
              .select('*')
              .eq('driver_id', driver.id)
              .is('deleted_at', null)
              .order('is_primary', { ascending: false })
              .limit(1)
              .maybeSingle();

            if (!vehiclesError && vehiclesData) {
              // Convertir le format de la table vehicles en format vehicle_info
              vehicleInfo = {
                make: vehiclesData.make,
                model: vehiclesData.model,
                year: vehiclesData.year,
                color: vehiclesData.color,
                licensePlate: vehiclesData.license_plate,
                seats: vehiclesData.seats,
                type: vehiclesData.type,
                photoUrl: vehiclesData.photo_url
              };
            }
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
            allBookings.forEach((booking: { status: string; price_tnd?: number }) => {
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
            vehicle_info: vehicleInfo, // Utiliser le véhicule récupéré (legacy ou table vehicles)
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
            
            bookingsData.forEach((booking: { status: string; price_tnd?: number }) => {
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

  const fetchVehicles = async () => {
    if (!loading) setRefreshing(true);
    
    try {
      console.log('🔍 Admin - Récupération des véhicules...');
      
      // Récupérer tous les véhicules non supprimés avec les informations du chauffeur
      const { data: vehiclesData, error: vehiclesError } = await supabase
        .from('vehicles')
        .select(`
          *,
          drivers (
            id,
            first_name,
            last_name,
            email,
            phone,
            city,
            status
          )
        `)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (vehiclesError) {
        console.error('Erreur lors de la récupération des véhicules:', vehiclesError);
        return;
      }

      console.log('📊 Admin - Véhicules récupérés:', vehiclesData?.length || 0);

      // Pour chaque véhicule, récupérer les disponibilités à venir
      const vehiclesWithAvailability = await Promise.all(
        (vehiclesData || []).map(async (vehicle: {
          id: string;
          driver_id: string;
          make: string;
          model: string;
          year?: number;
          color?: string;
          license_plate?: string;
          seats?: number;
          type?: string;
          photo_url?: string;
          is_primary?: boolean;
          created_at: string;
          updated_at: string;
          drivers?: {
            id: string;
            first_name: string;
            last_name: string;
            email: string;
            phone?: string;
            city?: string;
            status: string;
          };
        }) => {
          // Récupérer les disponibilités futures du chauffeur (30 prochains jours)
          const today = new Date().toISOString().split('T')[0];
          const futureDate = new Date();
          futureDate.setDate(futureDate.getDate() + 30);
          const future = futureDate.toISOString().split('T')[0];

          const { data: availData, error: availError } = await supabase
            .from('driver_availability')
            .select('*')
            .eq('driver_id', vehicle.driver_id)
            .eq('is_available', true)
            .gte('date', today)
            .lte('date', future)
            .order('date', { ascending: true })
            .limit(5);

          if (availError) {
            console.error(`Erreur récupération disponibilités pour véhicule ${vehicle.id}:`, availError);
          }

          // Compter toutes les disponibilités futures
          const { count: availCount } = await supabase
            .from('driver_availability')
            .select('*', { count: 'exact', head: true })
            .eq('driver_id', vehicle.driver_id)
            .eq('is_available', true)
            .gte('date', today);

          return {
            id: vehicle.id,
            driverId: vehicle.driver_id,
            make: vehicle.make,
            model: vehicle.model,
            year: vehicle.year,
            color: vehicle.color,
            licensePlate: vehicle.license_plate,
            seats: vehicle.seats,
            type: vehicle.type as 'sedan' | 'pickup' | 'van' | 'minibus' | 'bus' | 'truck' | 'utility' | 'limousine' | undefined,
            photoUrl: vehicle.photo_url,
            is_primary: vehicle.is_primary,
            createdAt: vehicle.created_at,
            updatedAt: vehicle.updated_at,
            driver: vehicle.drivers ? {
              firstName: vehicle.drivers.first_name,
              lastName: vehicle.drivers.last_name,
              email: vehicle.drivers.email,
              phone: vehicle.drivers.phone,
              city: vehicle.drivers.city,
              status: vehicle.drivers.status
            } : undefined,
            upcomingAvailabilities: availData?.map((a: {
              id: string;
              driver_id: string;
              date: string;
              start_time: string;
              end_time: string;
              is_available: boolean;
              created_at: string;
              updated_at: string;
            }) => ({
              id: a.id,
              driverId: a.driver_id,
              date: a.date,
              startTime: a.start_time,
              endTime: a.end_time,
              isAvailable: a.is_available,
              createdAt: a.created_at,
              updatedAt: a.updated_at
            })) || [],
            availabilityCount: availCount || 0
          };
        })
      );

      setVehicles(vehiclesWithAvailability);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchSubscriptions = async () => {
    if (!loading) setRefreshing(true);
    
    try {
      console.log('🔍 Admin - Récupération des abonnements...');
      
      // Récupérer tous les abonnements avec les informations du chauffeur
      const { data: subscriptionsData, error: subscriptionsError } = await supabase
        .from('driver_subscriptions')
        .select(`
          *,
          drivers (
            id,
            first_name,
            last_name,
            email,
            phone,
            city,
            lifetime_accepted_bookings
          )
        `)
        .order('created_at', { ascending: false });

      if (subscriptionsError) {
        console.error('Erreur lors de la récupération des abonnements:', subscriptionsError);
        return;
      }

      console.log('📊 Admin - Abonnements récupérés:', subscriptionsData?.length || 0);

      // Formater les données
      const formattedSubscriptions = (subscriptionsData || []).map((sub: {
        id: string;
        driver_id: string;
        start_date: string;
        end_date: string;
        subscription_type: string;
        billing_period: 'monthly' | 'yearly';
        price_tnd: number;
        vat_percentage: number;
        total_price_tnd: number;
        payment_status: string;
        payment_method?: string;
        payment_date?: string;
        payment_reference?: string;
        status: string;
        admin_notes?: string;
        created_at: string;
        updated_at: string;
        drivers?: {
          id: string;
          first_name: string;
          last_name: string;
          email: string;
          phone?: string;
          city?: string;
          lifetime_accepted_bookings?: number;
        };
      }) => {
        const endDate = new Date(sub.end_date);
        const today = new Date();
        const daysRemaining = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        let expirationStatus = '';
        if (daysRemaining < 0) {
          expirationStatus = 'Expiré';
        } else if (daysRemaining === 0) {
          expirationStatus = 'Expire aujourd\'hui';
        } else if (daysRemaining <= 1) {
          expirationStatus = 'Expire demain';
        } else if (daysRemaining <= 7) {
          expirationStatus = `Expire dans ${daysRemaining} jours`;
        } else if (daysRemaining <= 30) {
          expirationStatus = `Expire dans ${daysRemaining} jours`;
        } else {
          expirationStatus = 'Actif';
        }

        return {
          id: sub.id,
          driverId: sub.driver_id,
          startDate: sub.start_date,
          endDate: sub.end_date,
          subscriptionType: sub.subscription_type,
          billingPeriod: sub.billing_period,
          priceTnd: sub.price_tnd,
          vatPercentage: sub.vat_percentage,
          totalPriceTnd: sub.total_price_tnd,
          paymentStatus: sub.payment_status as 'pending' | 'paid' | 'failed' | 'refunded',
          paymentMethod: sub.payment_method,
          paymentDate: sub.payment_date,
          paymentReference: sub.payment_reference,
          status: sub.status as 'active' | 'expired' | 'cancelled',
          adminNotes: sub.admin_notes,
          createdAt: sub.created_at,
          updatedAt: sub.updated_at,
          driver: sub.drivers ? {
            firstName: sub.drivers.first_name,
            lastName: sub.drivers.last_name,
            email: sub.drivers.email,
            phone: sub.drivers.phone,
            city: sub.drivers.city,
            lifetimeAcceptedBookings: sub.drivers.lifetime_accepted_bookings
          } : undefined,
          daysRemaining,
          expirationStatus
        };
      });

      setSubscriptions(formattedSubscriptions);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
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

  // Afficher un écran de chargement pendant la vérification d'authentification
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Vérification des droits d'accès...</p>
        </div>
      </div>
    );
  }

  // Si pas authentifié, ne rien afficher (redirection en cours)
  if (!isAuthenticated) {
    return null;
  }

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
      <header className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <div className="min-w-0">
                <h1 className="text-lg sm:text-2xl font-bold text-gray-900 truncate">Administration</h1>
                <p className="text-xs sm:text-sm text-gray-600 hidden sm:block">TuniDrive</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
              <button
                onClick={fetchDrivers}
                disabled={refreshing}
                className="p-1.5 sm:p-2 text-gray-600 hover:text-black rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
                title="Actualiser"
              >
                <div className={refreshing ? 'animate-spin' : ''}>
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>
              </button>
              <Button 
                variant="outline" 
                onClick={handleLogout} 
                className="flex items-center gap-1 sm:gap-2 border-gray-300 text-gray-700 hover:bg-gray-50 text-xs sm:text-sm px-2 sm:px-4 py-1.5 sm:py-2"
              >
                <LogOut size={14} className="sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Déconnexion</span>
                <span className="sm:hidden">Déco</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-8">
        {/* Tabs */}
        <div className="mb-4 sm:mb-8">
          <div className="border-b border-gray-200">
            {/* Desktop Tabs */}
            <nav className="hidden md:flex -mb-px space-x-8">
              <button
                onClick={() => setActiveTab('drivers')}
                className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === 'drivers'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Users size={16} />
                  Chauffeurs ({drivers.length})
                </div>
              </button>
              <button
                onClick={() => setActiveTab('clients')}
                className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === 'clients'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <User size={16} />
                  Clients ({clients.length})
                </div>
              </button>
              <button
                onClick={() => setActiveTab('vehicles')}
                className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === 'vehicles'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Car size={16} />
                  Véhicules ({vehicles.length})
                </div>
              </button>
              <button
                onClick={() => setActiveTab('subscriptions')}
                className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === 'subscriptions'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <CreditCard size={16} />
                  Abonnements ({subscriptions.length})
                </div>
              </button>
            </nav>
            
            {/* Mobile Tabs - Scrollable */}
            <nav className="md:hidden -mb-px flex space-x-4 overflow-x-auto scrollbar-hide pb-2">
              <button
                onClick={() => setActiveTab('drivers')}
                className={`py-2 px-3 border-b-2 font-medium text-xs whitespace-nowrap flex-shrink-0 ${
                  activeTab === 'drivers'
                    ? 'border-blue-500 text-blue-600 bg-blue-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Users size={14} />
                  <span>Chauffeurs</span>
                  <span className="bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded-full text-[10px] font-semibold">
                    {drivers.length}
                  </span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('clients')}
                className={`py-2 px-3 border-b-2 font-medium text-xs whitespace-nowrap flex-shrink-0 ${
                  activeTab === 'clients'
                    ? 'border-blue-500 text-blue-600 bg-blue-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <User size={14} />
                  <span>Clients</span>
                  <span className="bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded-full text-[10px] font-semibold">
                    {clients.length}
                  </span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('vehicles')}
                className={`py-2 px-3 border-b-2 font-medium text-xs whitespace-nowrap flex-shrink-0 ${
                  activeTab === 'vehicles'
                    ? 'border-blue-500 text-blue-600 bg-blue-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Car size={14} />
                  <span>Véhicules</span>
                  <span className="bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded-full text-[10px] font-semibold">
                    {vehicles.length}
                  </span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('subscriptions')}
                className={`py-2 px-3 border-b-2 font-medium text-xs whitespace-nowrap flex-shrink-0 ${
                  activeTab === 'subscriptions'
                    ? 'border-blue-500 text-blue-600 bg-blue-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <CreditCard size={14} />
                  <span>Abonnements</span>
                  <span className="bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded-full text-[10px] font-semibold">
                    {subscriptions.length}
                  </span>
                </div>
              </button>
            </nav>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6 mb-4 sm:mb-8">
          {activeTab === 'subscriptions' ? (
            <>
              <div className="bg-white rounded-xl shadow-sm p-3 sm:p-6">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <CreditCard size={20} className="sm:w-6 sm:h-6 text-gray-700" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-gray-900 text-xs sm:text-sm truncate">Total abonnements</h3>
                    <p className="text-xl sm:text-2xl font-bold text-gray-900">{subscriptions.length}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-3 sm:p-6">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <CheckCircle size={20} className="sm:w-6 sm:h-6 text-green-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-gray-900 text-xs sm:text-sm truncate">Actifs (payés)</h3>
                    <p className="text-xl sm:text-2xl font-bold text-gray-900">
                      {subscriptions.filter(s => s.paymentStatus === 'paid' && s.status === 'active' && (s.daysRemaining || 0) >= 0).length}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-3 sm:p-6">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Clock size={20} className="sm:w-6 sm:h-6 text-orange-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-gray-900 text-xs sm:text-sm truncate">En attente</h3>
                    <p className="text-xl sm:text-2xl font-bold text-gray-900">
                      {subscriptions.filter(s => s.paymentStatus === 'pending').length}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-3 sm:p-6">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <TrendingUp size={20} className="sm:w-6 sm:h-6 text-blue-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-gray-900 text-xs sm:text-sm truncate">Revenus totaux</h3>
                    <p className="text-lg sm:text-2xl font-bold text-gray-900 truncate">
                      {subscriptions.filter(s => s.paymentStatus === 'paid').reduce((sum, s) => sum + s.totalPriceTnd, 0).toFixed(0)} TND
                    </p>
                  </div>
                </div>
              </div>
            </>
          ) : activeTab === 'vehicles' ? (
            <>
              <div className="bg-white rounded-xl shadow-sm p-3 sm:p-6">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Car size={20} className="sm:w-6 sm:h-6 text-gray-700" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-gray-900 text-xs sm:text-sm truncate">Total véhicules</h3>
                    <p className="text-xl sm:text-2xl font-bold text-gray-900">{vehicles.length}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-3 sm:p-6">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <CheckCircle size={20} className="sm:w-6 sm:h-6 text-green-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-gray-900 text-xs sm:text-sm truncate">Disponibles</h3>
                    <p className="text-xl sm:text-2xl font-bold text-gray-900">
                      {vehicles.filter(v => (v.availabilityCount || 0) > 0).length}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-3 sm:p-6">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Users size={20} className="sm:w-6 sm:h-6 text-blue-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-gray-900 text-xs sm:text-sm truncate">Chauffeurs actifs</h3>
                    <p className="text-xl sm:text-2xl font-bold text-gray-900">
                      {new Set(vehicles.filter(v => v.driver?.status === 'active').map(v => v.driverId)).size}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-3 sm:p-6">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Calendar size={20} className="sm:w-6 sm:h-6 text-purple-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-gray-900 text-xs sm:text-sm truncate">Créneaux totaux</h3>
                    <p className="text-xl sm:text-2xl font-bold text-gray-900">
                      {vehicles.reduce((sum, v) => sum + (v.availabilityCount || 0), 0)}
                    </p>
                  </div>
                </div>
              </div>
            </>
          ) : activeTab === 'drivers' ? (
            <>
              <div className="bg-white rounded-xl shadow-sm p-3 sm:p-6">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Users size={20} className="sm:w-6 sm:h-6 text-gray-700" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-gray-900 text-xs sm:text-sm truncate">Total chauffeurs</h3>
                    <p className="text-xl sm:text-2xl font-bold text-gray-900">{drivers.length}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-3 sm:p-6">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Clock size={20} className="sm:w-6 sm:h-6 text-orange-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-gray-900 text-xs sm:text-sm truncate">En attente</h3>
                    <p className="text-xl sm:text-2xl font-bold text-gray-900">{pendingDrivers.length}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-3 sm:p-6">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <CheckCircle size={20} className="sm:w-6 sm:h-6 text-green-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-gray-900 text-xs sm:text-sm truncate">Actifs</h3>
                    <p className="text-xl sm:text-2xl font-bold text-gray-900">{activeDrivers.length}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-3 sm:p-6">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <XCircle size={20} className="sm:w-6 sm:h-6 text-red-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-gray-900 text-xs sm:text-sm truncate">Rejetés</h3>
                    <p className="text-xl sm:text-2xl font-bold text-gray-900">{rejectedDrivers.length}</p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="bg-white rounded-xl shadow-sm p-3 sm:p-6">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Users size={20} className="sm:w-6 sm:h-6 text-gray-700" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-gray-900 text-xs sm:text-sm truncate">Total clients</h3>
                    <p className="text-xl sm:text-2xl font-bold text-gray-900">{totalClients}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-3 sm:p-6">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Car size={20} className="sm:w-6 sm:h-6 text-blue-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-gray-900 text-xs sm:text-sm truncate">Total courses</h3>
                    <p className="text-xl sm:text-2xl font-bold text-gray-900">{totalBookings}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-3 sm:p-6">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <CheckCircle size={20} className="sm:w-6 sm:h-6 text-green-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-gray-900 text-xs sm:text-sm truncate">Terminées</h3>
                    <p className="text-xl sm:text-2xl font-bold text-gray-900">{completedBookings}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-3 sm:p-6">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-gray-900 text-xs sm:text-sm truncate">Revenus</h3>
                    <p className="text-lg sm:text-2xl font-bold text-gray-900 truncate">{totalRevenue.toFixed(0)} TND</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Content based on active tab */}
        {activeTab === 'subscriptions' ? (
          /* Subscriptions List */
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-900 truncate">Gestion des abonnements</h2>
                  <p className="text-xs sm:text-sm text-gray-600 hidden sm:block">Visualisez et gérez les abonnements des chauffeurs</p>
                </div>
                {refreshing && (
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-500 flex-shrink-0 ml-2">
                    <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-blue-600"></div>
                    <span className="hidden sm:inline">Actualisation...</span>
                  </div>
                )}
              </div>
            </div>

            {/* Version desktop - Tableau des abonnements */}
            <div className="hidden lg:block overflow-x-hidden">
              <table className="w-full table-auto">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[18%]">
                      Chauffeur
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[10%]">
                      Type
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[12%]">
                      Période
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[10%]">
                      Montant
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[12%]">
                      Paiement
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[12%]">
                      Expiration
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[10%]">
                      Statut
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[6%]">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {subscriptions.map((subscription) => (
                    <tr key={subscription.id} className="hover:bg-gray-50 transition-colors">
                      {/* Chauffeur */}
                      <td className="px-3 py-3">
                        {subscription.driver ? (
                          <div className="text-xs">
                            <p className="text-gray-900 font-medium truncate">
                              {subscription.driver.firstName} {subscription.driver.lastName}
                            </p>
                            <p className="text-gray-500 truncate text-[10px]">{subscription.driver.email}</p>
                          </div>
                        ) : (
                          <p className="text-gray-500 italic text-xs">Chauffeur supprimé</p>
                        )}
                      </td>
                      
                      {/* Type */}
                      <td className="px-3 py-3">
                        <div className="text-xs">
                          {subscription.billingPeriod === 'yearly' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-100 text-purple-800">
                              Annuel
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 text-blue-800">
                              Mensuel
                            </span>
                          )}
                          {subscription.billingPeriod === 'yearly' && (
                            <p className="text-[10px] text-green-600 mt-0.5 font-medium">-10%</p>
                          )}
                        </div>
                      </td>
                      
                      {/* Période */}
                      <td className="px-3 py-3">
                        <div className="text-xs">
                          <p className="text-gray-900 font-medium">
                            {new Date(subscription.startDate).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                          </p>
                          <p className="text-gray-500 text-[10px]">
                            → {new Date(subscription.endDate).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                          </p>
                        </div>
                      </td>
                      
                      {/* Montant */}
                      <td className="px-3 py-3">
                        <div className="text-xs">
                          <p className="text-lg font-bold text-gray-900">
                            {subscription.totalPriceTnd.toFixed(0)} TND
                          </p>
                          <p className="text-[10px] text-gray-500">
                            HT: {subscription.priceTnd.toFixed(0)} TND
                          </p>
                        </div>
                      </td>
                      
                      {/* Paiement */}
                      <td className="px-3 py-3">
                        <div className="text-xs">
                          {subscription.paymentStatus === 'paid' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-800">
                              Payé
                            </span>
                          ) : subscription.paymentStatus === 'pending' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-orange-100 text-orange-800">
                              En attente
                            </span>
                          ) : subscription.paymentStatus === 'failed' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-100 text-red-800">
                              Échoué
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-800">
                              Remboursé
                            </span>
                          )}
                          {subscription.paymentDate && (
                            <p className="text-[10px] text-gray-500 mt-0.5">
                              {new Date(subscription.paymentDate).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                            </p>
                          )}
                        </div>
                      </td>
                      
                      {/* Expiration */}
                      <td className="px-3 py-3">
                        <div className="text-xs">
                          {subscription.daysRemaining !== undefined && subscription.daysRemaining >= 0 ? (
                            <>
                              <p className="font-semibold text-gray-900">
                                {subscription.daysRemaining}j
                              </p>
                              {subscription.daysRemaining <= 7 && subscription.daysRemaining > 0 && (
                                <p className="text-[10px] text-orange-600 font-medium">
                                  ⚠️ Bientôt
                                </p>
                              )}
                            </>
                          ) : (
                            <div className="text-red-600">
                              <p className="font-semibold text-xs">Expiré</p>
                              <p className="text-[10px]">
                                -{Math.abs(subscription.daysRemaining || 0)}j
                              </p>
                            </div>
                          )}
                        </div>
                      </td>
                      
                      {/* Statut */}
                      <td className="px-3 py-3">
                        {subscription.status === 'active' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-800">
                            Actif
                          </span>
                        ) : subscription.status === 'expired' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-100 text-red-800">
                            Expiré
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-800">
                            Annulé
                          </span>
                        )}
                      </td>
                      
                      {/* Actions */}
                      <td className="px-3 py-3">
                        <button
                          onClick={() => setSelectedSubscription(subscription)}
                          className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Voir les détails"
                        >
                          <Eye size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Version mobile/tablet - Cards des abonnements */}
            <div className="lg:hidden">
              <div className="divide-y divide-gray-200">
                {subscriptions.map((subscription) => (
                  <div key={subscription.id} className="p-4 sm:p-6 hover:bg-gray-50 transition-colors active:bg-gray-100">
                    <div className="flex items-start justify-between mb-3">
                      <div className="min-w-0 flex-1">
                        {subscription.driver ? (
                          <>
                            <h3 className="font-semibold text-gray-900 text-sm sm:text-base truncate">
                              {subscription.driver.firstName} {subscription.driver.lastName}
                            </h3>
                            <p className="text-xs sm:text-sm text-gray-500 truncate">{subscription.driver.email}</p>
                          </>
                        ) : (
                          <p className="text-gray-500 italic text-sm">Chauffeur supprimé</p>
                        )}
                      </div>
                      <button
                        onClick={() => setSelectedSubscription(subscription)}
                        className="p-2 text-gray-600 hover:bg-gray-100 active:bg-gray-200 rounded-lg transition-colors flex-shrink-0 ml-2"
                        title="Voir les détails"
                      >
                        <Eye size={18} />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="bg-gray-50 rounded-lg p-2.5">
                        <p className="text-[10px] sm:text-xs text-gray-500 mb-1">Type</p>
                        {subscription.billingPeriod === 'yearly' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium bg-purple-100 text-purple-800">
                            Annuel (-10%)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium bg-blue-100 text-blue-800">
                            Mensuel
                          </span>
                        )}
                      </div>
                      <div className="bg-gray-50 rounded-lg p-2.5">
                        <p className="text-[10px] sm:text-xs text-gray-500 mb-1">Montant</p>
                        <p className="text-base sm:text-lg font-bold text-gray-900">
                          {subscription.totalPriceTnd.toFixed(0)} TND
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="bg-gray-50 rounded-lg p-2.5">
                        <p className="text-[10px] sm:text-xs text-gray-500 mb-1">Paiement</p>
                        {subscription.paymentStatus === 'paid' ? (
                          <span className="text-[10px] sm:text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full font-medium">
                            Payé
                          </span>
                        ) : (
                          <span className="text-[10px] sm:text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full font-medium">
                            En attente
                          </span>
                        )}
                      </div>
                      <div className="bg-gray-50 rounded-lg p-2.5">
                        <p className="text-[10px] sm:text-xs text-gray-500 mb-1">Expiration</p>
                        <p className="text-xs sm:text-sm text-gray-900 font-medium">{subscription.expirationStatus}</p>
                      </div>
                    </div>

                    <div className="bg-blue-50 rounded-lg p-2.5">
                      <p className="text-[10px] sm:text-xs text-gray-600">
                        Du {new Date(subscription.startDate).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })} au {new Date(subscription.endDate).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {subscriptions.length === 0 && (
              <div className="text-center py-12">
                <CreditCard size={48} className="text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun abonnement</h3>
                <p className="text-gray-500">Les abonnements apparaîtront ici une fois créés.</p>
              </div>
            )}
          </div>
        ) : activeTab === 'vehicles' ? (
          /* Vehicles List */
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-900 truncate">Véhicules et disponibilités</h2>
                  <p className="text-xs sm:text-sm text-gray-600 hidden sm:block">Consultez tous les véhicules et leurs disponibilités</p>
                </div>
                {refreshing && (
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-500 flex-shrink-0 ml-2">
                    <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-blue-600"></div>
                    <span className="hidden sm:inline">Actualisation...</span>
                  </div>
                )}
              </div>
            </div>

            {/* Version desktop - Tableau des véhicules */}
            <div className="hidden lg:block overflow-x-hidden">
              <table className="w-full table-auto">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[18%]">
                      Véhicule
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[16%]">
                      Chauffeur
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[14%]">
                      Détails
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[12%]">
                      Statut
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[12%]">
                      Disponibilités
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[18%]">
                      Prochains créneaux
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[6%]">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {vehicles.map((vehicle) => (
                    <tr key={vehicle.id} className="hover:bg-gray-50 transition-colors">
                      {/* Véhicule */}
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          {vehicle.photoUrl ? (
                            <img
                              src={vehicle.photoUrl}
                              alt="Photo du véhicule"
                              className="w-12 h-9 rounded object-cover"
                            />
                          ) : (
                            <div className="w-12 h-9 bg-gray-100 rounded flex items-center justify-center">
                              <Car size={18} className="text-gray-700" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-gray-900 truncate text-xs">
                              {vehicle.make} {vehicle.model}
                            </p>
                            <p className="text-[10px] text-gray-500">{vehicle.year}</p>
                            {vehicle.is_primary && (
                              <span className="inline-block mt-0.5 text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded-full">
                                Principal
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      
                      {/* Chauffeur */}
                      <td className="px-3 py-3">
                        {vehicle.driver ? (
                          <div className="text-xs">
                            <p className="text-gray-900 font-medium truncate">
                              {vehicle.driver.firstName} {vehicle.driver.lastName}
                            </p>
                            <p className="text-gray-500 truncate text-[10px]">{vehicle.driver.email}</p>
                          </div>
                        ) : (
                          <p className="text-gray-500 italic text-xs">Aucun chauffeur</p>
                        )}
                      </td>
                      
                      {/* Détails */}
                      <td className="px-3 py-3">
                        <div className="text-xs">
                          <p className="text-gray-900 truncate">{vehicle.color || 'N/A'}</p>
                          <p className="text-gray-500 text-[10px] truncate">{vehicle.licensePlate || 'N/A'}</p>
                          <p className="text-gray-500 text-[10px]">{vehicle.seats || 'N/A'} places</p>
                          <p className="text-gray-500 text-[10px] capitalize truncate">
                            {vehicle.type === 'sedan' && 'Berline'}
                            {vehicle.type === 'pickup' && 'Pickup'}
                            {vehicle.type === 'van' && 'Van'}
                            {vehicle.type === 'minibus' && 'Minibus'}
                            {vehicle.type === 'bus' && 'Bus'}
                            {vehicle.type === 'truck' && 'Camion'}
                            {vehicle.type === 'utility' && 'Utilitaire'}
                            {vehicle.type === 'limousine' && 'Limousine'}
                          </p>
                        </div>
                      </td>
                      
                      {/* Statut chauffeur */}
                      <td className="px-3 py-3">
                        {vehicle.driver ? (
                          getStatusBadge(vehicle.driver.status)
                        ) : (
                          <span className="text-gray-500 italic text-xs">N/A</span>
                        )}
                      </td>
                      
                      {/* Disponibilités */}
                      <td className="px-3 py-3">
                        <div className="text-xs">
                          {vehicle.availabilityCount !== undefined && vehicle.availabilityCount > 0 ? (
                            <>
                              <div className="flex items-center gap-1">
                                <CheckCircle size={12} className="text-green-600" />
                                <span className="font-semibold text-green-600">
                                  {vehicle.availabilityCount}
                                </span>
                              </div>
                              <p className="text-[10px] text-gray-500">30j</p>
                            </>
                          ) : (
                            <div className="flex items-center gap-1">
                              <XCircle size={12} className="text-gray-400" />
                              <span className="text-gray-500 text-[10px]">Aucun</span>
                            </div>
                          )}
                        </div>
                      </td>
                      
                      {/* Prochains créneaux */}
                      <td className="px-3 py-3">
                        {vehicle.upcomingAvailabilities && vehicle.upcomingAvailabilities.length > 0 ? (
                          <div className="space-y-0.5">
                            {vehicle.upcomingAvailabilities.slice(0, 2).map((avail, idx) => (
                              <div key={idx} className="text-[10px]">
                                <span className="font-medium text-gray-900">
                                  {new Date(avail.date + 'T00:00:00').toLocaleDateString('fr-FR', { 
                                    day: '2-digit', 
                                    month: '2-digit' 
                                  })}
                                </span>
                                <span className="text-gray-500 ml-1">
                                  {avail.startTime.slice(0, 5)}
                                </span>
                              </div>
                            ))}
                            {vehicle.upcomingAvailabilities.length > 2 && (
                              <p className="text-[10px] text-gray-400 italic">
                                +{vehicle.upcomingAvailabilities.length - 2} autres
                              </p>
                            )}
                          </div>
                        ) : (
                          <p className="text-[10px] text-gray-500 italic">Aucun</p>
                        )}
                      </td>
                      
                      {/* Actions */}
                      <td className="px-3 py-3">
                        <button
                          onClick={() => setSelectedVehicle(vehicle)}
                          className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Voir les détails"
                        >
                          <Eye size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Version mobile/tablet - Cards des véhicules */}
            <div className="lg:hidden">
              <div className="divide-y divide-gray-200">
                {vehicles.map((vehicle) => (
                  <div key={vehicle.id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        {vehicle.photoUrl ? (
                          <img
                            src={vehicle.photoUrl}
                            alt="Photo du véhicule"
                            className="w-16 h-12 rounded object-cover"
                          />
                        ) : (
                          <div className="w-16 h-12 bg-gray-100 rounded flex items-center justify-center">
                            <Car size={24} className="text-gray-700" />
                          </div>
                        )}
                        <div>
                          <h3 className="font-medium text-gray-900">
                            {vehicle.make} {vehicle.model}
                          </h3>
                          <p className="text-sm text-gray-500">{vehicle.year}</p>
                          {vehicle.is_primary && (
                            <span className="inline-block mt-1 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                              Principal
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedVehicle(vehicle)}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Voir les détails"
                      >
                        <Eye size={16} />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Chauffeur</p>
                        {vehicle.driver ? (
                          <>
                            <p className="text-sm text-gray-900">
                              {vehicle.driver.firstName} {vehicle.driver.lastName}
                            </p>
                            {getStatusBadge(vehicle.driver.status)}
                          </>
                        ) : (
                          <p className="text-sm text-gray-500 italic">Aucun chauffeur</p>
                        )}
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Disponibilités</p>
                        {vehicle.availabilityCount !== undefined && vehicle.availabilityCount > 0 ? (
                          <div className="flex items-center gap-2">
                            <CheckCircle size={16} className="text-green-600" />
                            <span className="text-sm font-semibold text-green-600">
                              {vehicle.availabilityCount} créneau{vehicle.availabilityCount > 1 ? 'x' : ''}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <XCircle size={16} className="text-gray-400" />
                            <span className="text-sm text-gray-500">Aucun</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="text-sm text-gray-600">
                      <p>{vehicle.color} • {vehicle.licensePlate} • {vehicle.seats} places</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {vehicles.length === 0 && (
              <div className="text-center py-12">
                <Car size={48} className="text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun véhicule enregistré</h3>
                <p className="text-gray-500">Les véhicules apparaîtront ici une fois ajoutés par les chauffeurs.</p>
              </div>
            )}
          </div>
        ) : activeTab === 'drivers' ? (
          /* Drivers List - Version améliorée */
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-900 truncate">Gestion des chauffeurs</h2>
                  <p className="text-xs sm:text-sm text-gray-600 hidden sm:block">Validez ou rejetez les inscriptions des nouveaux chauffeurs</p>
                </div>
                {refreshing && (
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-500 flex-shrink-0 ml-2">
                    <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-blue-600"></div>
                    <span className="hidden sm:inline">Actualisation...</span>
                  </div>
                )}
              </div>
            </div>

          {/* Version desktop - Tableau complet */}
          <div className="hidden lg:block overflow-x-hidden">
            <table className="w-full table-auto">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[18%]">
                    Chauffeur
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[14%]">
                    Contact
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[16%]">
                    Véhicule
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[14%]">
                    Performance
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[10%]">
                    Statut
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[12%]">
                    Inscription
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[12%]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {drivers.map((driver) => (
                  <tr key={driver.id} className="hover:bg-gray-50 transition-colors">
                    {/* Chauffeur */}
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        {driver.profilePhotoUrl ? (
                          <img
                            src={driver.profilePhotoUrl}
                            alt="Photo de profil"
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                            <User size={20} className="text-gray-700" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-gray-900 truncate text-xs">
                            {driver.firstName} {driver.lastName}
                          </p>
                          <p className="text-[10px] text-gray-500 truncate">{driver.email}</p>
                        </div>
                      </div>
                    </td>
                    
                    {/* Contact */}
                    <td className="px-3 py-3">
                      <div className="text-xs">
                        <p className="text-gray-900 truncate">{driver.phone || 'N/A'}</p>
                        <p className="text-gray-500 truncate text-[10px]">{driver.city || 'N/A'}</p>
                        <p className="text-gray-500 truncate text-[10px]">Permis: {driver.licenseNumber?.slice(0, 8) || 'N/A'}</p>
                      </div>
                    </td>
                    
                    {/* Véhicule */}
                    <td className="px-3 py-3">
                      <div className="text-xs">
                        {driver.vehicleInfo ? (
                          <div>
                            <p className="text-gray-900 font-medium truncate">
                              {driver.vehicleInfo.make} {driver.vehicleInfo.model}
                            </p>
                            <p className="text-gray-500 truncate text-[10px]">
                              {driver.vehicleInfo.year} - {driver.vehicleInfo.color}
                            </p>
                            <p className="text-gray-500 truncate text-[10px]">
                              {driver.vehicleInfo.seats} places
                            </p>
                          </div>
                        ) : (
                          <p className="text-gray-500 italic text-xs">Non renseigné</p>
                        )}
                      </div>
                    </td>
                    
                    {/* Performance */}
                    <td className="px-3 py-3">
                      <div className="text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-gray-500">Courses:</span>
                          <span className="font-semibold text-gray-900">
                            {driver.completedBookings || 0}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-gray-500">Gains:</span>
                          <span className="font-semibold text-green-600 text-[10px]">
                            {(driver.totalEarnings || 0).toFixed(0)} TND
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-gray-500">Annulées:</span>
                          <span className="font-semibold text-red-600">
                            {(driver.cancelledByDriver || 0) + (driver.cancelledByClient || 0)}
                          </span>
                        </div>
                      </div>
                    </td>
                    
                    {/* Statut */}
                    <td className="px-3 py-3">
                      {getStatusBadge(driver.status)}
                    </td>
                    
                    {/* Inscription */}
                    <td className="px-3 py-3">
                      <div className="text-xs">
                        <p className="text-gray-900">
                          {new Date(driver.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                        </p>
                        <p className="text-gray-500 text-[10px]">
                          {new Date(driver.createdAt).toLocaleTimeString('fr-FR', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </p>
                      </div>
                    </td>
                    
                    {/* Actions */}
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setSelectedDriver(driver)}
                          className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Voir les détails"
                        >
                          <Eye size={14} />
                        </button>
                        
                        {driver.status === 'pending' && (
                          <>
                            <button
                              onClick={() => updateDriverStatus(driver.id, 'active')}
                              disabled={actionLoading === driver.id}
                              className="p-1.5 text-green-600 hover:bg-green-100 rounded-lg transition-colors disabled:opacity-50"
                              title="Approuver"
                            >
                              <UserCheck size={14} />
                            </button>
                            <button
                              onClick={() => updateDriverStatus(driver.id, 'rejected')}
                              disabled={actionLoading === driver.id}
                              className="p-1.5 text-red-600 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
                              title="Rejeter"
                            >
                              <XCircle size={14} />
                            </button>
                          </>
                        )}
                        
                        {driver.status === 'active' && (
                          <button
                            onClick={() => updateDriverStatus(driver.id, 'pending')}
                            disabled={actionLoading === driver.id}
                            className="p-1.5 text-orange-600 hover:bg-orange-100 rounded-lg transition-colors disabled:opacity-50"
                            title="Suspendre"
                          >
                            <Clock size={14} />
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
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-900 truncate">Gestion des clients</h2>
                  <p className="text-xs sm:text-sm text-gray-600 hidden sm:block">Consultez les informations des clients et leurs courses</p>
                </div>
                {refreshing && (
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-500 flex-shrink-0 ml-2">
                    <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-blue-600"></div>
                    <span className="hidden sm:inline">Actualisation...</span>
                  </div>
                )}
              </div>
            </div>

            {/* Version desktop - Tableau des clients */}
            <div className="hidden lg:block overflow-x-hidden">
              <table className="w-full table-auto">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[20%]">
                      Client
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[14%]">
                      Contact
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[18%]">
                      Statistiques
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[18%]">
                      Courses
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[14%]">
                      Inscription
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[8%]">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {clients.map((client) => (
                    <tr key={client.id} className="hover:bg-gray-50 transition-colors">
                      {/* Client */}
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          {client.profilePhotoUrl ? (
                            <img
                              src={client.profilePhotoUrl}
                              alt="Photo de profil"
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                              <User size={20} className="text-gray-700" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-gray-900 truncate text-xs">
                              {client.firstName} {client.lastName}
                            </p>
                            <p className="text-[10px] text-gray-500 truncate">{client.email}</p>
                          </div>
                        </div>
                      </td>
                      
                      {/* Contact */}
                      <td className="px-3 py-3">
                        <div className="text-xs">
                          <p className="text-gray-900 truncate">{client.phone || 'N/A'}</p>
                          <p className="text-gray-500 truncate text-[10px]">{client.city || 'N/A'}</p>
                        </div>
                      </td>
                      
                      {/* Statistiques */}
                      <td className="px-3 py-3">
                        <div className="text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-gray-500">Total:</span>
                            <span className="font-semibold text-gray-900">
                              {client.totalBookings}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-gray-500">Terminées:</span>
                            <span className="font-semibold text-green-600">
                              {client.completedBookings}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-gray-500">Annulées:</span>
                            <span className="font-semibold text-red-600">
                              {client.cancelledBookings}
                            </span>
                          </div>
                        </div>
                      </td>
                      
                      {/* Courses */}
                      <td className="px-3 py-3">
                        <div className="text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-gray-500">Dépensé:</span>
                            <span className="font-semibold text-green-600 text-[10px]">
                              {client.totalSpent.toFixed(0)} TND
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-gray-500">En attente:</span>
                            <span className="font-semibold text-orange-600">
                              {client.pendingBookings}
                            </span>
                          </div>
                        </div>
                      </td>
                      
                      {/* Inscription */}
                      <td className="px-3 py-3">
                        <div className="text-xs">
                          <p className="text-gray-900">
                            {new Date(client.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                          </p>
                          <p className="text-gray-500 text-[10px]">
                            {new Date(client.createdAt).toLocaleTimeString('fr-FR', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </p>
                        </div>
                      </td>
                      
                      {/* Actions */}
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setSelectedClient(client)}
                            className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Voir les détails"
                          >
                            <Eye size={14} />
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
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
                      <p className="font-semibold text-gray-900 capitalize">
                        {selectedDriver.vehicleInfo.type === 'sedan' && 'Berline'}
                        {selectedDriver.vehicleInfo.type === 'pickup' && 'Pickup'}
                        {selectedDriver.vehicleInfo.type === 'van' && 'Van'}
                        {selectedDriver.vehicleInfo.type === 'minibus' && 'Minibus'}
                        {selectedDriver.vehicleInfo.type === 'bus' && 'Bus'}
                        {selectedDriver.vehicleInfo.type === 'truck' && 'Camion'}
                        {selectedDriver.vehicleInfo.type === 'utility' && 'Utilitaire'}
                        {selectedDriver.vehicleInfo.type === 'limousine' && 'Limousine'}
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

      {/* Subscription Detail Modal */}
      {selectedSubscription && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl max-w-3xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold text-gray-900">
                  Détails de l'abonnement
                </h3>
                <button
                  onClick={() => setSelectedSubscription(null)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <XCircle size={24} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Subscription Info */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Informations de l'abonnement</h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">Type d'abonnement</p>
                    <div className="flex items-center gap-2">
                      {selectedSubscription.billingPeriod === 'yearly' ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                          <Calendar size={14} />
                          Annuel
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                          <Calendar size={14} />
                          Mensuel
                        </span>
                      )}
                      {selectedSubscription.billingPeriod === 'yearly' && (
                        <span className="text-xs text-green-600 font-bold">-10% 🎉</span>
                      )}
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">Statut</p>
                    {selectedSubscription.status === 'active' ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                        <CheckCircle size={14} />
                        Actif
                      </span>
                    ) : selectedSubscription.status === 'expired' ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                        <XCircle size={14} />
                        Expiré
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                        <XCircle size={14} />
                        Annulé
                      </span>
                    )}
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">Date de début</p>
                    <p className="font-semibold text-gray-900">
                      {new Date(selectedSubscription.startDate).toLocaleDateString('fr-FR', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">Date de fin</p>
                    <p className="font-semibold text-gray-900">
                      {new Date(selectedSubscription.endDate).toLocaleDateString('fr-FR', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                  <div className={`rounded-lg p-4 ${
                    selectedSubscription.daysRemaining !== undefined && selectedSubscription.daysRemaining >= 0
                      ? selectedSubscription.daysRemaining <= 7 
                        ? 'bg-orange-50 border border-orange-200' 
                        : 'bg-green-50 border border-green-200'
                      : 'bg-red-50 border border-red-200'
                  }`}>
                    <p className="text-sm text-gray-600 mb-1">Expiration</p>
                    <p className="font-semibold text-gray-900">{selectedSubscription.expirationStatus}</p>
                    {selectedSubscription.daysRemaining !== undefined && (
                      <p className="text-sm text-gray-600 mt-1">
                        {selectedSubscription.daysRemaining >= 0 
                          ? `${selectedSubscription.daysRemaining} jour${selectedSubscription.daysRemaining > 1 ? 's' : ''} restant${selectedSubscription.daysRemaining > 1 ? 's' : ''}`
                          : `Expiré depuis ${Math.abs(selectedSubscription.daysRemaining)} jour${Math.abs(selectedSubscription.daysRemaining) > 1 ? 's' : ''}`
                        }
                      </p>
                    )}
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">Durée totale</p>
                    <p className="font-semibold text-gray-900">
                      {selectedSubscription.billingPeriod === 'yearly' ? '12 mois' : '1 mois'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Payment Info */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Informations de paiement</h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">Prix HT</p>
                    <p className="text-2xl font-bold text-gray-900">{selectedSubscription.priceTnd.toFixed(2)} TND</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">TVA ({selectedSubscription.vatPercentage}%)</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {(selectedSubscription.totalPriceTnd - selectedSubscription.priceTnd).toFixed(2)} TND
                    </p>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-4 md:col-span-2">
                    <p className="text-sm text-gray-600 mb-1">Prix Total TTC</p>
                    <p className="text-3xl font-bold text-blue-600">{selectedSubscription.totalPriceTnd.toFixed(2)} TND</p>
                    {selectedSubscription.billingPeriod === 'yearly' && (
                      <p className="text-sm text-green-600 mt-2 font-medium">
                        💰 Économie de {((30 * 1.19 * 12) - selectedSubscription.totalPriceTnd).toFixed(2)} TND vs mensuel
                      </p>
                    )}
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">Statut du paiement</p>
                    {selectedSubscription.paymentStatus === 'paid' ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                        <CheckCircle size={14} />
                        Payé
                      </span>
                    ) : selectedSubscription.paymentStatus === 'pending' ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-800">
                        <Clock size={14} />
                        En attente
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                        <XCircle size={14} />
                        {selectedSubscription.paymentStatus === 'failed' ? 'Échoué' : 'Remboursé'}
                      </span>
                    )}
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">Méthode de paiement</p>
                    <p className="font-semibold text-gray-900">
                      {selectedSubscription.paymentMethod === 'bank_transfer' ? 'Virement bancaire' : 
                       selectedSubscription.paymentMethod === 'cash' ? 'Espèces' :
                       selectedSubscription.paymentMethod || 'Non renseignée'}
                    </p>
                  </div>
                  {selectedSubscription.paymentDate && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600 mb-1">Date de paiement</p>
                      <p className="font-semibold text-gray-900">
                        {new Date(selectedSubscription.paymentDate).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  )}
                  {selectedSubscription.paymentReference && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600 mb-1">Référence de paiement</p>
                      <p className="font-mono text-sm text-gray-900 break-all">
                        {selectedSubscription.paymentReference}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Driver Info */}
              {selectedSubscription.driver && (
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Chauffeur</h4>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600 mb-1">Nom complet</p>
                      <p className="font-semibold text-gray-900">
                        {selectedSubscription.driver.firstName} {selectedSubscription.driver.lastName}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600 mb-1">Email</p>
                      <p className="font-semibold text-gray-900">{selectedSubscription.driver.email}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600 mb-1">Téléphone</p>
                      <p className="font-semibold text-gray-900">
                        {selectedSubscription.driver.phone || 'Non renseigné'}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600 mb-1">Ville</p>
                      <p className="font-semibold text-gray-900">
                        {selectedSubscription.driver.city || 'Non renseignée'}
                      </p>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600 mb-1">Courses acceptées (lifetime)</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {selectedSubscription.driver.lifetimeAcceptedBookings || 0}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Admin Notes */}
              {selectedSubscription.adminNotes && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-amber-900 mb-2 flex items-center gap-2">
                    <AlertCircleIcon size={16} />
                    Notes administratives
                  </h4>
                  <p className="text-sm text-gray-700">{selectedSubscription.adminNotes}</p>
                </div>
              )}

              {/* Actions for pending subscriptions */}
              {selectedSubscription.paymentStatus === 'pending' && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-orange-900 mb-3">Actions administratives</h4>
                  <div className="space-y-3">
                    <p className="text-sm text-orange-800">
                      Ce paiement est en attente de validation. Une fois le virement reçu, vous pouvez valider l'abonnement
                      en mettant à jour directement dans la table <code className="bg-orange-100 px-1 rounded">driver_subscriptions</code>.
                    </p>
                    <div className="text-xs text-gray-600 bg-white rounded p-3 font-mono">
                      <p>UPDATE driver_subscriptions</p>
                      <p>SET payment_status = 'paid',</p>
                      <p className="ml-4">payment_method = 'bank_transfer',</p>
                      <p className="ml-4">payment_date = NOW(),</p>
                      <p className="ml-4">payment_reference = 'REF-XXX'</p>
                      <p>WHERE id = '{selectedSubscription.id}';</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Timeline */}
              <div className="text-xs text-gray-500 bg-gray-50 p-4 rounded-lg space-y-1">
                <p><strong>Créé le:</strong> {new Date(selectedSubscription.createdAt).toLocaleString('fr-FR')}</p>
                <p><strong>Dernière mise à jour:</strong> {new Date(selectedSubscription.updatedAt).toLocaleString('fr-FR')}</p>
                {selectedSubscription.paymentDate && (
                  <p><strong>Payé le:</strong> {new Date(selectedSubscription.paymentDate).toLocaleString('fr-FR')}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Vehicle Detail Modal */}
      {selectedVehicle && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl max-w-3xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold text-gray-900">
                  Détails du véhicule
                </h3>
                <button
                  onClick={() => setSelectedVehicle(null)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <XCircle size={24} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Vehicle Photo */}
              {selectedVehicle.photoUrl && (
                <div>
                  <img
                    src={selectedVehicle.photoUrl}
                    alt="Photo du véhicule"
                    className="w-full h-64 object-cover rounded-lg"
                  />
                </div>
              )}

              {/* Vehicle Info */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Informations du véhicule</h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">Marque et modèle</p>
                    <p className="font-semibold text-gray-900">
                      {selectedVehicle.make} {selectedVehicle.model}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">Année</p>
                    <p className="font-semibold text-gray-900">{selectedVehicle.year || 'N/A'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">Couleur</p>
                    <p className="font-semibold text-gray-900">{selectedVehicle.color || 'N/A'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">Plaque d'immatriculation</p>
                    <p className="font-semibold text-gray-900">{selectedVehicle.licensePlate || 'N/A'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">Nombre de places</p>
                    <p className="font-semibold text-gray-900">{selectedVehicle.seats || 'N/A'} places</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">Type</p>
                    <p className="font-semibold text-gray-900 capitalize">
                      {selectedVehicle.type === 'sedan' && 'Berline'}
                      {selectedVehicle.type === 'pickup' && 'Pickup'}
                      {selectedVehicle.type === 'van' && 'Van'}
                      {selectedVehicle.type === 'minibus' && 'Minibus'}
                      {selectedVehicle.type === 'bus' && 'Bus'}
                      {selectedVehicle.type === 'truck' && 'Camion'}
                      {selectedVehicle.type === 'utility' && 'Utilitaire'}
                      {selectedVehicle.type === 'limousine' && 'Limousine'}
                    </p>
                  </div>
                  {selectedVehicle.is_primary && (
                    <div className="bg-blue-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600 mb-1">Statut</p>
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        <CheckCircle size={12} />
                        Véhicule principal
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Driver Info */}
              {selectedVehicle.driver && (
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Chauffeur propriétaire</h4>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600 mb-1">Nom complet</p>
                      <p className="font-semibold text-gray-900">
                        {selectedVehicle.driver.firstName} {selectedVehicle.driver.lastName}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600 mb-1">Email</p>
                      <p className="font-semibold text-gray-900">{selectedVehicle.driver.email}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600 mb-1">Téléphone</p>
                      <p className="font-semibold text-gray-900">
                        {selectedVehicle.driver.phone || 'Non renseigné'}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600 mb-1">Ville</p>
                      <p className="font-semibold text-gray-900">
                        {selectedVehicle.driver.city || 'Non renseignée'}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600 mb-1">Statut</p>
                      {getStatusBadge(selectedVehicle.driver.status)}
                    </div>
                  </div>
                </div>
              )}

              {/* Availabilities */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4">
                  Disponibilités à venir
                  {selectedVehicle.availabilityCount !== undefined && (
                    <span className="ml-2 text-sm font-normal text-gray-500">
                      ({selectedVehicle.availabilityCount} créneau{selectedVehicle.availabilityCount > 1 ? 'x' : ''})
                    </span>
                  )}
                </h4>
                {selectedVehicle.upcomingAvailabilities && selectedVehicle.upcomingAvailabilities.length > 0 ? (
                  <div className="space-y-2">
                    {selectedVehicle.upcomingAvailabilities.map((avail, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-100"
                      >
                        <div className="flex items-center gap-3">
                          <Calendar size={20} className="text-green-600" />
                          <div>
                            <p className="font-medium text-gray-900">
                              {new Date(avail.date + 'T00:00:00').toLocaleDateString('fr-FR', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </p>
                            <p className="text-sm text-gray-600">
                              {avail.startTime} - {avail.endTime}
                            </p>
                          </div>
                        </div>
                        <CheckCircle size={20} className="text-green-600" />
                      </div>
                    ))}
                    {selectedVehicle.availabilityCount && selectedVehicle.availabilityCount > selectedVehicle.upcomingAvailabilities.length && (
                      <p className="text-sm text-gray-500 text-center mt-4">
                        +{selectedVehicle.availabilityCount - selectedVehicle.upcomingAvailabilities.length} créneaux supplémentaires...
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-gray-50 rounded-lg">
                    <Calendar size={48} className="text-gray-400 mx-auto mb-4" />
                    <h5 className="text-lg font-medium text-gray-900 mb-2">Aucune disponibilité</h5>
                    <p className="text-gray-500">
                      Ce chauffeur n'a pas encore configuré ses disponibilités pour ce véhicule.
                    </p>
                  </div>
                )}
              </div>

              <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
                <p><strong>Ajouté le:</strong> {new Date(selectedVehicle.createdAt).toLocaleString('fr-FR')}</p>
                <p><strong>Dernière mise à jour:</strong> {new Date(selectedVehicle.updatedAt).toLocaleString('fr-FR')}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Client Detail Modal */}
      {selectedClient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
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
                    {selectedClient.bookings.map((booking) => (
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
                                <p className="text-gray-900">{booking.pickupAddress}</p>
                              </div>
                              <div>
                                <p className="text-gray-600 mb-1">Arrivée</p>
                                <p className="text-gray-900">{booking.destinationAddress}</p>
                              </div>
                              <div>
                                <p className="text-gray-600 mb-1">Date et heure</p>
                                <p className="text-gray-900">
                                  {new Date(booking.scheduledTime).toLocaleString('fr-FR')}
                                </p>
                              </div>
                              <div>
                                <p className="text-gray-600 mb-1">Prix</p>
                                <p className="text-gray-900 font-semibold">
                                  {booking.priceTnd} TND
                                  {booking.isReturnTrip && (
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
                          Créée le {new Date(booking.createdAt).toLocaleString('fr-FR')}
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
