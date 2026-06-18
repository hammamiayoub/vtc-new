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
  AlertCircle as AlertCircleIcon,
  Edit,
  Package,
} from 'lucide-react';
import { AdminParcelQuotes } from './AdminParcelQuotes';
import { Button } from './ui/Button';
import { supabase } from '../lib/supabase';
import {
  formatVehicleType,
  listVehicles,
  normalizeLegacyVehicleInfo,
  updateVehicle,
  vehicleToVehicleInfo,
} from '../utils/vehicles';
import { Driver, ClientWithBookings, Vehicle, DriverAvailability } from '../types';
import {
  driverActivityBadgeClasses,
  driverActivityLabel,
  driverActivityShortLabel,
} from '../utils/driverActivity';

interface AdminDriver extends Driver {
  vehicles?: Vehicle[];
}

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
    driverType?: Driver['driverType'];
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

interface AdminBooking {
  id: string;
  clientId: string;
  driverId?: string;
  pickupAddress: string;
  destinationAddress: string;
  distanceKm: number;
  priceTnd: number;
  status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
  scheduledTime: string;
  pickupTime?: string;
  completionTime?: string;
  isReturnTrip?: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  clients?: {
    first_name: string;
    last_name: string;
    email?: string;
    phone?: string;
  };
  drivers?: {
    first_name: string;
    last_name: string;
    email?: string;
    phone?: string;
  };
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout }) => {
  const [drivers, setDrivers] = useState<AdminDriver[]>([]);
  const [clients, setClients] = useState<ClientWithBookings[]>([]);
  const [vehicles, setVehicles] = useState<VehicleWithDriver[]>([]);
  const [vehiclesFetchError, setVehiclesFetchError] = useState<string | null>(null);
  const [subscriptions, setSubscriptions] = useState<DriverSubscription[]>([]);
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDriver, setSelectedDriver] = useState<AdminDriver | null>(null);
  const [selectedClient, setSelectedClient] = useState<ClientWithBookings | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleWithDriver | null>(null);
  const [editingVehicle, setEditingVehicle] = useState<VehicleWithDriver | null>(null);
  const [vehicleEditForm, setVehicleEditForm] = useState<{
    make: string;
    model: string;
    year: string;
    color: string;
    licensePlate: string;
    seats: string;
    type: string;
  }>({ make: '', model: '', year: '', color: '', licensePlate: '', seats: '', type: '' });
  const [savingVehicle, setSavingVehicle] = useState(false);
  const [vehicleEditError, setVehicleEditError] = useState<string | null>(null);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [driverEditForm, setDriverEditForm] = useState<{
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    city: string;
    licenseNumber: string;
  }>({ firstName: '', lastName: '', email: '', phone: '', city: '', licenseNumber: '' });
  const [savingDriver, setSavingDriver] = useState(false);
  const [driverEditError, setDriverEditError] = useState<string | null>(null);
  const [editingClient, setEditingClient] = useState<ClientWithBookings | null>(null);
  const [clientEditForm, setClientEditForm] = useState<{
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    city: string;
  }>({ firstName: '', lastName: '', email: '', phone: '', city: '' });
  const [savingClient, setSavingClient] = useState(false);
  const [clientEditError, setClientEditError] = useState<string | null>(null);
  const [bookingToCancel, setBookingToCancel] = useState<AdminBooking | null>(null);
  const [cancellingBooking, setCancellingBooking] = useState(false);
  const [cancelBookingError, setCancelBookingError] = useState<string | null>(null);
  const [selectedSubscription, setSelectedSubscription] = useState<DriverSubscription | null>(null);
  const [validatingPayment, setValidatingPayment] = useState(false);
  const [paymentValidationError, setPaymentValidationError] = useState<string | null>(null);
  const [paymentForm, setPaymentForm] = useState<{ method: string; reference: string }>({
    method: 'bank_transfer',
    reference: ''
  });
  const [vehicleForAvailabilities, setVehicleForAvailabilities] = useState<VehicleWithDriver | null>(null);
  const [allAvailabilities, setAllAvailabilities] = useState<DriverAvailability[]>([]);
  const [loadingAvailabilities, setLoadingAvailabilities] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'drivers' | 'clients' | 'vehicles' | 'subscriptions' | 'bookings' | 'parcels'>('drivers');
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
    fetchBookings();
    
    const refreshAll = () => {
      if (document.visibilityState !== 'visible') return;
      fetchDrivers();
      fetchClients();
      fetchVehicles();
      fetchSubscriptions();
      fetchBookings();
    };

    const interval = window.setInterval(refreshAll, 60000);

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshAll();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [isAuthenticated]);

  // Préparer le formulaire de validation de paiement à l'ouverture d'un abonnement
  useEffect(() => {
    if (selectedSubscription) {
      setPaymentValidationError(null);
      setPaymentForm({
        method: selectedSubscription.paymentMethod || 'bank_transfer',
        reference:
          selectedSubscription.paymentReference ||
          `ABONNEMENT-${selectedSubscription.id.slice(0, 8).toUpperCase()}`
      });
    }
  }, [selectedSubscription]);

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

          // Priorité à la table vehicles (vehicle_info legacy vaut souvent {} par défaut)
          let driverVehicles: Vehicle[] = [];
          try {
            driverVehicles = await listVehicles(driver.id);
          } catch (vehiclesError) {
            console.error(`Erreur récupération véhicules pour ${driver.first_name} ${driver.last_name}:`, vehiclesError);
          }

          const primaryVehicle =
            driverVehicles.find((vehicle) => vehicle.is_primary) ?? driverVehicles[0];
          const vehicleInfo = primaryVehicle
            ? vehicleToVehicleInfo(primaryVehicle)
            : normalizeLegacyVehicleInfo(driver.vehicle_info);

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
            vehicle_info: vehicleInfo,
            driverVehicles,
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
        vehicles: driver.driverVehicles,
        status: driver.status,
        driverType: (driver.driver_type as Driver['driverType']) || 'vtc',
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
    setVehiclesFetchError(null);

    try {
      console.log('🔍 Admin - Récupération des véhicules...');

      const { data: vehiclesData, error: vehiclesError } = await supabase
        .from('vehicles')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (vehiclesError) {
        console.error('Erreur lors de la récupération des véhicules:', vehiclesError);
        setVehiclesFetchError(vehiclesError.message);
        return;
      }

      console.log('📊 Admin - Véhicules récupérés:', vehiclesData?.length || 0);

      const driverIds = [
        ...new Set((vehiclesData || []).map((vehicle) => vehicle.driver_id).filter(Boolean)),
      ];

      const driverMap = new Map<
        string,
        {
          id: string;
          first_name: string;
          last_name: string;
          email: string;
          phone?: string;
          city?: string;
          status: string;
          driver_type?: string;
        }
      >();

      if (driverIds.length > 0) {
        const { data: driversData, error: driversError } = await supabase
          .from('drivers')
          .select('id, first_name, last_name, email, phone, city, status, driver_type')
          .in('id', driverIds);

        if (driversError) {
          console.error('Erreur récupération chauffeurs pour véhicules:', driversError);
          setVehiclesFetchError(
            `Véhicules chargés, mais les chauffeurs associés n'ont pas pu être récupérés : ${driversError.message}`
          );
        } else {
          (driversData || []).forEach((driver) => {
            driverMap.set(driver.id, driver);
          });
        }
      }

      const vehiclesWithAvailability = await Promise.all(
        (vehiclesData || []).map(async (vehicle) => {
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

          const { count: availCount } = await supabase
            .from('driver_availability')
            .select('*', { count: 'exact', head: true })
            .eq('driver_id', vehicle.driver_id)
            .eq('is_available', true)
            .gte('date', today);

          const driverRow = driverMap.get(vehicle.driver_id);

          return {
            id: vehicle.id,
            driverId: vehicle.driver_id,
            make: vehicle.make,
            model: vehicle.model,
            year: vehicle.year ?? undefined,
            color: vehicle.color ?? undefined,
            licensePlate: vehicle.license_plate ?? undefined,
            seats: vehicle.seats ?? undefined,
            type: vehicle.type as Vehicle['type'],
            photoUrl: vehicle.photo_url ?? undefined,
            isVip: vehicle.is_vip ?? false,
            is_primary: vehicle.is_primary ?? undefined,
            createdAt: vehicle.created_at,
            updatedAt: vehicle.updated_at,
            driver: driverRow
              ? {
                  firstName: driverRow.first_name,
                  lastName: driverRow.last_name,
                  email: driverRow.email,
                  phone: driverRow.phone,
                  city: driverRow.city,
                  status: driverRow.status,
                  driverType: (driverRow.driver_type as Driver['driverType']) || 'vtc',
                }
              : undefined,
            upcomingAvailabilities:
              availData?.map((a) => ({
                id: a.id,
                driverId: a.driver_id,
                date: a.date,
                startTime: a.start_time,
                endTime: a.end_time,
                isAvailable: a.is_available,
                createdAt: a.created_at,
                updatedAt: a.updated_at,
              })) || [],
            availabilityCount: availCount || 0,
          };
        })
      );

      const sortedVehicles = vehiclesWithAvailability.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      console.log(
        '📊 Admin - Véhicules triés:',
        sortedVehicles.length,
        'dont',
        sortedVehicles.filter((v) => v.is_primary).length,
        'principaux'
      );

      setVehicles(sortedVehicles);
    } catch (error) {
      console.error('Erreur:', error);
      setVehiclesFetchError(error instanceof Error ? error.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const openEditVehicle = (vehicle: VehicleWithDriver) => {
    setVehicleEditError(null);
    setVehicleEditForm({
      make: vehicle.make ?? '',
      model: vehicle.model ?? '',
      year: vehicle.year ? String(vehicle.year) : '',
      color: vehicle.color ?? '',
      licensePlate: vehicle.licensePlate ?? '',
      seats: vehicle.seats ? String(vehicle.seats) : '',
      type: vehicle.type ?? ''
    });
    setEditingVehicle(vehicle);
  };

  const handleSaveVehicle = async () => {
    if (!editingVehicle) return;
    if (!vehicleEditForm.make.trim() || !vehicleEditForm.model.trim()) {
      setVehicleEditError('La marque et le modèle sont requis.');
      return;
    }

    setSavingVehicle(true);
    setVehicleEditError(null);

    try {
      const updated = await updateVehicle(editingVehicle.id, {
        make: vehicleEditForm.make.trim(),
        model: vehicleEditForm.model.trim(),
        year: vehicleEditForm.year ? Number(vehicleEditForm.year) : undefined,
        color: vehicleEditForm.color || undefined,
        licensePlate: vehicleEditForm.licensePlate
          ? vehicleEditForm.licensePlate.trim().toUpperCase()
          : undefined,
        seats: vehicleEditForm.seats ? Number(vehicleEditForm.seats) : undefined,
        type: (vehicleEditForm.type || undefined) as Vehicle['type']
      });

      // Mettre à jour la liste et la modale de détail localement
      setVehicles(prev =>
        prev.map(v =>
          v.id === editingVehicle.id
            ? {
                ...v,
                make: updated.make,
                model: updated.model,
                year: updated.year,
                color: updated.color,
                licensePlate: updated.licensePlate,
                seats: updated.seats,
                type: updated.type,
                updatedAt: updated.updatedAt
              }
            : v
        )
      );
      setSelectedVehicle(prev =>
        prev && prev.id === editingVehicle.id
          ? {
              ...prev,
              make: updated.make,
              model: updated.model,
              year: updated.year,
              color: updated.color,
              licensePlate: updated.licensePlate,
              seats: updated.seats,
              type: updated.type,
              updatedAt: updated.updatedAt
            }
          : prev
      );
      setEditingVehicle(null);
    } catch (e) {
      console.error('Erreur lors de la mise à jour du véhicule:', e);
      const msg = e instanceof Error ? e.message : 'Erreur lors de la mise à jour du véhicule.';
      setVehicleEditError(msg);
    } finally {
      setSavingVehicle(false);
    }
  };

  const openEditDriver = (driver: Driver) => {
    setDriverEditError(null);
    setDriverEditForm({
      firstName: driver.firstName ?? '',
      lastName: driver.lastName ?? '',
      email: driver.email ?? '',
      phone: driver.phone ?? '',
      city: driver.city ?? '',
      licenseNumber: driver.licenseNumber ?? ''
    });
    setEditingDriver(driver);
  };

  const handleSaveDriver = async () => {
    if (!editingDriver) return;
    if (!driverEditForm.firstName.trim() || !driverEditForm.lastName.trim()) {
      setDriverEditError('Le prénom et le nom sont requis.');
      return;
    }
    if (!driverEditForm.email.trim()) {
      setDriverEditError("L'email est requis.");
      return;
    }

    setSavingDriver(true);
    setDriverEditError(null);

    try {
      const { error } = await supabase
        .from('drivers')
        .update({
          first_name: driverEditForm.firstName.trim(),
          last_name: driverEditForm.lastName.trim(),
          email: driverEditForm.email.trim(),
          phone: driverEditForm.phone.trim() || null,
          city: driverEditForm.city.trim() || null,
          license_number: driverEditForm.licenseNumber.trim() || null
        })
        .eq('id', editingDriver.id);

      if (error) throw error;

      const patch = {
        firstName: driverEditForm.firstName.trim(),
        lastName: driverEditForm.lastName.trim(),
        email: driverEditForm.email.trim(),
        phone: driverEditForm.phone.trim() || undefined,
        city: driverEditForm.city.trim() || undefined,
        licenseNumber: driverEditForm.licenseNumber.trim() || undefined
      };

      setDrivers(prev => prev.map(d => (d.id === editingDriver.id ? { ...d, ...patch } : d)));
      setSelectedDriver(prev => (prev && prev.id === editingDriver.id ? { ...prev, ...patch } : prev));
      setEditingDriver(null);
    } catch (e) {
      console.error('Erreur lors de la mise à jour du chauffeur:', e);
      const msg = e instanceof Error ? e.message : 'Erreur lors de la mise à jour du chauffeur.';
      setDriverEditError(msg);
    } finally {
      setSavingDriver(false);
    }
  };

  const openEditClient = (client: ClientWithBookings) => {
    setClientEditError(null);
    setClientEditForm({
      firstName: client.firstName ?? '',
      lastName: client.lastName ?? '',
      email: client.email ?? '',
      phone: client.phone ?? '',
      city: client.city ?? ''
    });
    setEditingClient(client);
  };

  const handleSaveClient = async () => {
    if (!editingClient) return;
    if (!clientEditForm.firstName.trim() || !clientEditForm.lastName.trim()) {
      setClientEditError('Le prénom et le nom sont requis.');
      return;
    }
    if (!clientEditForm.email.trim()) {
      setClientEditError("L'email est requis.");
      return;
    }

    setSavingClient(true);
    setClientEditError(null);

    try {
      const { error } = await supabase
        .from('clients')
        .update({
          first_name: clientEditForm.firstName.trim(),
          last_name: clientEditForm.lastName.trim(),
          email: clientEditForm.email.trim(),
          phone: clientEditForm.phone.trim() || null,
          city: clientEditForm.city.trim() || null
        })
        .eq('id', editingClient.id);

      if (error) throw error;

      const patch = {
        firstName: clientEditForm.firstName.trim(),
        lastName: clientEditForm.lastName.trim(),
        email: clientEditForm.email.trim(),
        phone: clientEditForm.phone.trim(),
        city: clientEditForm.city.trim() || undefined
      };

      setClients(prev => prev.map(c => (c.id === editingClient.id ? { ...c, ...patch } : c)));
      setSelectedClient(prev => (prev && prev.id === editingClient.id ? { ...prev, ...patch } : prev));
      setEditingClient(null);
    } catch (e) {
      console.error('Erreur lors de la mise à jour du client:', e);
      const msg = e instanceof Error ? e.message : 'Erreur lors de la mise à jour du client.';
      setClientEditError(msg);
    } finally {
      setSavingClient(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!bookingToCancel) return;

    setCancellingBooking(true);
    setCancelBookingError(null);

    try {
      // 1. Passer la réservation au statut "annulée"
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', bookingToCancel.id);

      if (error) throw error;

      // 2. Libérer le créneau de disponibilité du chauffeur correspondant
      if (bookingToCancel.driverId && bookingToCancel.scheduledTime) {
        try {
          const scheduled = new Date(bookingToCancel.scheduledTime);
          const pad = (n: number) => String(n).padStart(2, '0');
          const dateStr = `${scheduled.getFullYear()}-${pad(scheduled.getMonth() + 1)}-${pad(scheduled.getDate())}`;
          const timeStr = `${pad(scheduled.getHours())}:${pad(scheduled.getMinutes())}:00`;

          const { error: availError } = await supabase
            .from('driver_availability')
            .update({ is_available: true })
            .eq('driver_id', bookingToCancel.driverId)
            .eq('date', dateStr)
            .lte('start_time', timeStr)
            .gte('end_time', timeStr);

          if (availError) {
            console.error('⚠️ Erreur lors de la libération du créneau de disponibilité:', availError);
          } else {
            console.log('✅ Créneau de disponibilité libéré pour le chauffeur', bookingToCancel.driverId);
          }
        } catch (availException) {
          console.error('⚠️ Exception lors de la libération du créneau:', availException);
        }
      }

      // 3. Notifier le client et le chauffeur par email
      try {
        const clientEmail = bookingToCancel.clients?.email;
        if (clientEmail) {
          const emailPayload = {
            bookingData: {
              id: bookingToCancel.id,
              pickup_address: bookingToCancel.pickupAddress,
              destination_address: bookingToCancel.destinationAddress,
              scheduled_time: bookingToCancel.scheduledTime,
              distance_km: bookingToCancel.distanceKm,
              price_tnd: bookingToCancel.priceTnd,
              notes: bookingToCancel.notes,
              booking_url: window.location.origin + '/client-login'
            },
            clientData: {
              first_name: bookingToCancel.clients?.first_name || '',
              last_name: bookingToCancel.clients?.last_name || '',
              email: clientEmail
            },
            driverData: {
              first_name: bookingToCancel.drivers?.first_name || '',
              last_name: bookingToCancel.drivers?.last_name || '',
              email: bookingToCancel.drivers?.email || '',
              phone: bookingToCancel.drivers?.phone || ''
            },
            status: 'cancelled',
            cancelledBy: 'admin'
          };

          const emailResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-booking-status-notification`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(emailPayload)
          });

          const emailResult = await emailResponse.json().catch(() => null);
          if (emailResponse.ok && emailResult?.success) {
            console.log("✅ Emails d'annulation envoyés:", emailResult.message);
          } else {
            console.error("❌ Erreur envoi emails d'annulation:", emailResult?.error || emailResponse.statusText);
          }
        } else {
          console.warn("⚠️ Email du client introuvable, notification non envoyée");
        }
      } catch (emailError) {
        console.error("❌ Erreur lors de l'envoi des emails d'annulation:", emailError);
      }

      setBookings(prev =>
        prev.map(b => (b.id === bookingToCancel.id ? { ...b, status: 'cancelled' } : b))
      );
      setBookingToCancel(null);
    } catch (e) {
      console.error("Erreur lors de l'annulation de la réservation:", e);
      const msg = e instanceof Error ? e.message : "Erreur lors de l'annulation de la réservation.";
      setCancelBookingError(msg);
    } finally {
      setCancellingBooking(false);
    }
  };

  const validateSubscriptionPayment = async () => {
    if (!selectedSubscription) return;
    if (!paymentForm.reference.trim()) {
      setPaymentValidationError('La référence de paiement est requise.');
      return;
    }

    setValidatingPayment(true);
    setPaymentValidationError(null);

    try {
      const nowIso = new Date().toISOString();
      const { error } = await supabase
        .from('driver_subscriptions')
        .update({
          payment_status: 'paid',
          payment_method: paymentForm.method,
          payment_date: nowIso,
          payment_reference: paymentForm.reference.trim(),
          status: 'active'
        })
        .eq('id', selectedSubscription.id);

      if (error) throw error;

      const patch = {
        paymentStatus: 'paid' as const,
        paymentMethod: paymentForm.method,
        paymentDate: nowIso,
        paymentReference: paymentForm.reference.trim(),
        status: 'active' as const
      };

      setSubscriptions(prev => prev.map(s => (s.id === selectedSubscription.id ? { ...s, ...patch } : s)));
      setSelectedSubscription(prev => (prev ? { ...prev, ...patch } : prev));
    } catch (e) {
      console.error('Erreur lors de la validation du paiement:', e);
      const msg = e instanceof Error ? e.message : 'Erreur lors de la validation du paiement.';
      setPaymentValidationError(msg);
    } finally {
      setValidatingPayment(false);
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
      
      // Log pour déboguer les revenus
      const paidSubscriptions = (subscriptionsData || []).filter((s: any) => s.payment_status === 'paid');
      const totalRevenue = paidSubscriptions.reduce((sum: number, s: any) => {
        const price = Number(s.total_price_tnd) || 0;
        return sum + price;
      }, 0);
      console.log('💰 Revenus totaux calculés:', {
        totalPaid: paidSubscriptions.length,
        totalRevenue,
        subscriptions: paidSubscriptions.map((s: any) => ({
          id: s.id,
          payment_status: s.payment_status,
          total_price_tnd: s.total_price_tnd,
          converted: Number(s.total_price_tnd) || 0
        }))
      });

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
          priceTnd: Number(sub.price_tnd) || 0,
          vatPercentage: Number(sub.vat_percentage) || 0,
          totalPriceTnd: Number(sub.total_price_tnd) || 0,
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

  const fetchBookings = async () => {
    if (!loading) setRefreshing(true);

    try {
      console.log('🔍 Admin - Récupération des réservations...');

      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          clients (
            first_name,
            last_name,
            email,
            phone
          ),
          drivers (
            first_name,
            last_name,
            email,
            phone
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erreur lors de la récupération des réservations:', error);
        return;
      }

      const formattedBookings = (data || []).map((booking: any) => ({
        id: booking.id,
        clientId: booking.client_id,
        driverId: booking.driver_id,
        pickupAddress: booking.pickup_address,
        destinationAddress: booking.destination_address,
        distanceKm: booking.distance_km,
        priceTnd: booking.price_tnd,
        status: booking.status,
        scheduledTime: booking.scheduled_time,
        pickupTime: booking.pickup_time,
        completionTime: booking.completion_time,
        isReturnTrip: booking.is_return_trip,
        notes: booking.notes,
        createdAt: booking.created_at,
        updatedAt: booking.updated_at,
        clients: booking.clients,
        drivers: booking.drivers
      }));

      setBookings(formattedBookings);
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

  const fetchAllAvailabilities = async (vehicle: VehicleWithDriver) => {
    if (!vehicle.driverId) return;
    
    setLoadingAvailabilities(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 90); // 90 jours au lieu de 30
      const future = futureDate.toISOString().split('T')[0];

      const { data: availData, error: availError } = await supabase
        .from('driver_availability')
        .select('*')
        .eq('driver_id', vehicle.driverId)
        .eq('is_available', true)
        .gte('date', today)
        .lte('date', future)
        .order('date', { ascending: true })
        .order('start_time', { ascending: true });

      if (availError) {
        console.error('Erreur récupération disponibilités:', availError);
        return;
      }

      const formattedAvailabilities = (availData || []).map((a: {
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
      }));

      setAllAvailabilities(formattedAvailabilities);
      setVehicleForAvailabilities(vehicle);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoadingAvailabilities(false);
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

  const getDriverActivityBadge = (driverType?: Driver['driverType']) => (
    <span className={driverActivityBadgeClasses(driverType || 'vtc')} title={driverActivityLabel(driverType || 'vtc')}>
      {driverActivityShortLabel(driverType || 'vtc')}
    </span>
  );

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

  // Statistiques des réservations
  const bookingTotalCount = bookings.length;
  const bookingPendingCount = bookings.filter(b => b.status === 'pending').length;
  const bookingInProgressCount = bookings.filter(b => b.status === 'in_progress' || b.status === 'accepted').length;
  const bookingCompletedCount = bookings.filter(b => b.status === 'completed').length;
  const bookingRevenue = bookings
    .filter(b => b.status === 'completed')
    .reduce((sum, b) => sum + (b.priceTnd || 0), 0);

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
                onClick={() => setActiveTab('bookings')}
                className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === 'bookings'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Calendar size={16} />
                  Réservations ({bookings.length})
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
              <button
                onClick={() => setActiveTab('parcels')}
                className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === 'parcels'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Package size={16} />
                  Colis international
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
                onClick={() => setActiveTab('bookings')}
                className={`py-2 px-3 border-b-2 font-medium text-xs whitespace-nowrap flex-shrink-0 ${
                  activeTab === 'bookings'
                    ? 'border-blue-500 text-blue-600 bg-blue-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Calendar size={14} />
                  <span>Réservations</span>
                  <span className="bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded-full text-[10px] font-semibold">
                    {bookings.length}
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
              <button
                onClick={() => setActiveTab('parcels')}
                className={`py-2 px-3 border-b-2 font-medium text-xs whitespace-nowrap flex-shrink-0 ${
                  activeTab === 'parcels'
                    ? 'border-blue-500 text-blue-600 bg-blue-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Package size={14} />
                  <span>Colis</span>
                </div>
              </button>
            </nav>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6 mb-4 sm:mb-8">
          {activeTab === 'bookings' ? (
            <>
              <div className="bg-white rounded-xl shadow-sm p-3 sm:p-6">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Calendar size={20} className="sm:w-6 sm:h-6 text-gray-700" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-gray-900 text-xs sm:text-sm truncate">Total réservations</h3>
                    <p className="text-xl sm:text-2xl font-bold text-gray-900">{bookingTotalCount}</p>
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
                    <p className="text-xl sm:text-2xl font-bold text-gray-900">{bookingPendingCount}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-3 sm:p-6">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <CheckCircle size={20} className="sm:w-6 sm:h-6 text-blue-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-gray-900 text-xs sm:text-sm truncate">En cours</h3>
                    <p className="text-xl sm:text-2xl font-bold text-gray-900">{bookingInProgressCount}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-3 sm:p-6">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <TrendingUp size={20} className="sm:w-6 sm:h-6 text-green-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-gray-900 text-xs sm:text-sm truncate">Revenus</h3>
                    <p className="text-lg sm:text-2xl font-bold text-gray-900 truncate">{bookingRevenue.toFixed(0)} TND</p>
                  </div>
                </div>
              </div>
            </>
          ) : activeTab === 'subscriptions' ? (
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
                      {subscriptions
                        .filter(s => s.paymentStatus === 'paid' && s.totalPriceTnd != null && !isNaN(Number(s.totalPriceTnd)))
                        .reduce((sum, s) => sum + (Number(s.totalPriceTnd) || 0), 0)
                        .toFixed(0)} TND
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
        {activeTab === 'bookings' ? (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-900 truncate">Réservations</h2>
                  <p className="text-xs sm:text-sm text-gray-600 hidden sm:block">Toutes les réservations par date de création</p>
                </div>
                {refreshing && (
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-500 flex-shrink-0 ml-2">
                    <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-blue-600"></div>
                    <span className="hidden sm:inline">Actualisation...</span>
                  </div>
                )}
              </div>
            </div>

            {bookings.length === 0 ? (
              <div className="text-center py-12 bg-gray-50">
                <Calendar size={48} className="text-gray-400 mx-auto mb-4" />
                <h5 className="text-lg font-medium text-gray-900 mb-2">Aucune réservation</h5>
                <p className="text-gray-500">Aucune réservation n'a encore été créée.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {bookings.map((booking) => (
                  <div key={booking.id} className="p-4 sm:p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-3 mb-3">
                          <h3 className="text-sm sm:text-base font-semibold text-gray-900">
                            Réservation #{booking.id.slice(-8)}
                          </h3>
                          {getBookingStatusBadge(booking.status)}
                          {booking.isReturnTrip && (
                            <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full">
                              Aller-retour
                            </span>
                          )}
                          <span className="text-xs text-gray-500">
                            Créée le {new Date(booking.createdAt).toLocaleString('fr-FR')}
                          </span>
                        </div>
                        <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 mb-3 lg:hidden">
                          <span className="text-xs text-gray-500">Prix</span>
                          <span className="text-base font-bold text-gray-900">
                            {booking.priceTnd?.toFixed(0)} TND
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                          <div className="bg-white rounded-lg border border-gray-200 p-3">
                            <p className="text-gray-500 text-xs mb-1">Départ</p>
                            <p className="text-gray-900 font-medium">{booking.pickupAddress}</p>
                          </div>
                          <div className="bg-white rounded-lg border border-gray-200 p-3">
                            <p className="text-gray-500 text-xs mb-1">Arrivée</p>
                            <p className="text-gray-900 font-medium">{booking.destinationAddress}</p>
                          </div>
                          <div className="bg-white rounded-lg border border-gray-200 p-3">
                            <p className="text-gray-500 text-xs mb-1">Date et heure</p>
                            <p className="text-gray-900 font-medium">
                              {new Date(booking.scheduledTime).toLocaleString('fr-FR')}
                            </p>
                          </div>
                          <div className="bg-white rounded-lg border border-gray-200 p-3">
                            <p className="text-gray-500 text-xs mb-1">Client</p>
                            <p className="text-gray-900 font-medium">
                              {booking.clients ? `${booking.clients.first_name} ${booking.clients.last_name}` : 'Client inconnu'}
                            </p>
                            {booking.clients?.phone && (
                              <p className="text-xs text-gray-500">{booking.clients.phone}</p>
                            )}
                          </div>
                          <div className="bg-white rounded-lg border border-gray-200 p-3">
                            <p className="text-gray-500 text-xs mb-1">Chauffeur</p>
                            <p className="text-gray-900 font-medium">
                              {booking.drivers ? `${booking.drivers.first_name} ${booking.drivers.last_name}` : 'Non assigné'}
                            </p>
                            {booking.drivers?.phone && (
                              <p className="text-xs text-gray-500">{booking.drivers.phone}</p>
                            )}
                          </div>
                          <div className="bg-white rounded-lg border border-gray-200 p-3">
                            <p className="text-gray-500 text-xs mb-1">Distance</p>
                            <p className="text-gray-900 font-medium">{booking.distanceKm?.toFixed(1)} km</p>
                          </div>
                        </div>

                        {booking.notes && (
                          <div className="mt-3 bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm">
                            <p className="text-yellow-900 font-semibold mb-1">Notes</p>
                            <p className="text-yellow-800">{booking.notes}</p>
                          </div>
                        )}
                      </div>

                      <div className="hidden lg:flex flex-col items-start lg:items-end gap-2 min-w-[160px]">
                        <div className="text-2xl font-bold text-gray-900">
                          {booking.priceTnd?.toFixed(0)} TND
                        </div>
                        <div className="text-xs text-gray-500">
                          Statut: {booking.status}
                        </div>
                        {['pending', 'accepted', 'in_progress'].includes(booking.status) && (
                          <Button
                            onClick={() => { setCancelBookingError(null); setBookingToCancel(booking); }}
                            size="sm"
                            className="bg-red-600 hover:bg-red-700 text-white flex items-center gap-2 mt-1"
                          >
                            <XCircle size={16} />
                            Annuler
                          </Button>
                        )}
                      </div>
                    </div>

                    {['pending', 'accepted', 'in_progress'].includes(booking.status) && (
                      <div className="mt-4 flex lg:hidden">
                        <Button
                          onClick={() => { setCancelBookingError(null); setBookingToCancel(booking); }}
                          size="sm"
                          className="w-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center gap-2"
                        >
                          <XCircle size={16} />
                          Annuler la réservation
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : activeTab === 'subscriptions' ? (
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
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setSelectedSubscription(subscription)}
                            className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Voir les détails"
                          >
                            <Eye size={14} />
                          </button>
                          {subscription.paymentStatus === 'pending' && (
                            <button
                              onClick={() => setSelectedSubscription(subscription)}
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Valider le paiement"
                            >
                              <CheckCircle size={14} />
                            </button>
                          )}
                        </div>
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
        ) : activeTab === 'parcels' ? (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">
              Demandes de transport international de colis
            </h2>
            <AdminParcelQuotes />
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

            {vehiclesFetchError && (
              <div className="mx-4 sm:mx-6 mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {vehiclesFetchError}
              </div>
            )}

            {/* Version desktop - Tableau des véhicules */}
            <div className="hidden lg:block overflow-x-hidden">
              <table className="w-full table-auto">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[20%]">
                      Véhicule
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[18%]">
                      Chauffeur
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[16%]">
                      Détails
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[12%]">
                      Statut
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[20%]">
                      Disponibilités
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[10%]">
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
                            <div className="mt-1">{getDriverActivityBadge(vehicle.driver.driverType)}</div>
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
                          <p className="text-gray-500 text-[10px]">{vehicle.seats ?? 'N/A'} places</p>
                          <p className="text-gray-500 text-[10px] truncate">
                            {formatVehicleType(vehicle.type)}
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
                              <div className="flex items-center gap-1.5 mb-1">
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                <span className="font-bold text-green-700">
                                  {vehicle.availabilityCount}
                                </span>
                                <span className="text-[10px] text-gray-500">créneau{vehicle.availabilityCount > 1 ? 'x' : ''}</span>
                              </div>
                              <div className="flex items-center gap-1 text-[10px]">
                                <Calendar size={10} className="text-gray-400" />
                                <span className="text-gray-500">30 prochains jours</span>
                              </div>
                              {vehicle.upcomingAvailabilities && vehicle.upcomingAvailabilities.length > 0 && (
                                <div className="mt-1.5 pt-1.5 border-t border-gray-100">
                                  <p className="text-[10px] font-medium text-blue-600">
                                    Prochain: {new Date(vehicle.upcomingAvailabilities[0].date + 'T00:00:00').toLocaleDateString('fr-FR', { 
                                      day: '2-digit', 
                                      month: 'short' 
                                    })}
                                  </p>
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="flex flex-col items-start gap-1">
                              <div className="flex items-center gap-1">
                                <XCircle size={12} className="text-gray-400" />
                                <span className="text-gray-500 text-[10px] font-medium">Aucun créneau</span>
                              </div>
                              <span className="text-[9px] text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">
                                ⚠️ Action requise
                              </span>
                            </div>
                          )}
                        </div>
                      </td>
                      
                      {/* Actions */}
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1">
                          {vehicle.availabilityCount !== undefined && vehicle.availabilityCount > 0 && (
                            <button
                              onClick={() => fetchAllAvailabilities(vehicle)}
                              className="p-2 text-green-600 hover:bg-green-50 active:bg-green-100 rounded-lg transition-colors flex-shrink-0"
                              title="Voir toutes les disponibilités"
                            >
                              <Calendar size={18} />
                            </button>
                          )}
                        <button
                          onClick={() => setSelectedVehicle(vehicle)}
                            className="p-2 text-gray-600 hover:bg-gray-100 active:bg-gray-200 rounded-lg transition-colors flex-shrink-0"
                          title="Voir les détails"
                        >
                            <Eye size={18} />
                        </button>
                          <button
                            onClick={() => openEditVehicle(vehicle)}
                            className="p-2 text-blue-600 hover:bg-blue-50 active:bg-blue-100 rounded-lg transition-colors flex-shrink-0"
                            title="Modifier le véhicule"
                          >
                            <Edit size={18} />
                          </button>
                        </div>
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
                      <div className="flex items-center gap-2">
                        {vehicle.availabilityCount !== undefined && vehicle.availabilityCount > 0 && (
                          <button
                            onClick={() => fetchAllAvailabilities(vehicle)}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Voir toutes les disponibilités"
                          >
                            <Calendar size={16} />
                          </button>
                        )}
                      <button
                        onClick={() => setSelectedVehicle(vehicle)}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Voir les détails"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => openEditVehicle(vehicle)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Modifier le véhicule"
                      >
                        <Edit size={16} />
                      </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Chauffeur</p>
                        {vehicle.driver ? (
                          <>
                            <p className="text-sm font-medium text-gray-900">
                              {vehicle.driver.firstName} {vehicle.driver.lastName}
                            </p>
                            <div className="mt-1 flex flex-wrap items-center gap-1">
                            {getDriverActivityBadge(vehicle.driver.driverType)}
                            {getStatusBadge(vehicle.driver.status)}
                            </div>
                          </>
                        ) : (
                          <p className="text-sm text-gray-500 italic">Aucun chauffeur</p>
                        )}
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Disponibilités</p>
                        {vehicle.availabilityCount !== undefined && vehicle.availabilityCount > 0 ? (
                          <div className="bg-green-50 rounded-lg p-2 border border-green-200">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                              <span className="text-base font-bold text-green-700">
                                {vehicle.availabilityCount}
                            </span>
                              <span className="text-xs text-green-600">créneau{vehicle.availabilityCount > 1 ? 'x' : ''}</span>
                            </div>
                            {vehicle.upcomingAvailabilities && vehicle.upcomingAvailabilities.length > 0 && (
                              <p className="text-[10px] text-green-600 font-medium">
                                Prochain: {new Date(vehicle.upcomingAvailabilities[0].date + 'T00:00:00').toLocaleDateString('fr-FR', { 
                                  day: '2-digit', 
                                  month: 'short' 
                                })}
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="bg-orange-50 rounded-lg p-2 border border-orange-200">
                            <div className="flex items-center gap-2 mb-1">
                              <XCircle size={14} className="text-orange-600" />
                              <span className="text-sm font-medium text-orange-700">Aucun créneau</span>
                            </div>
                            <p className="text-[10px] text-orange-600 mt-1">Action requise</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Prochains créneaux pour mobile */}
                    {vehicle.upcomingAvailabilities && vehicle.upcomingAvailabilities.length > 0 && (
                      <div className="mb-4">
                        <p className="text-xs text-gray-500 mb-2 font-medium">Prochains créneaux</p>
                        <div className="space-y-1.5">
                          {vehicle.upcomingAvailabilities.slice(0, 3).map((avail, idx) => {
                            const availDate = new Date(avail.date + 'T00:00:00');
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            const daysDiff = Math.ceil((availDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                            
                            let badgeColor = 'bg-blue-50 text-blue-700 border-blue-200';
                            let badgeText = '';
                            if (daysDiff === 0) {
                              badgeColor = 'bg-green-50 text-green-700 border-green-200';
                              badgeText = "Aujourd'hui";
                            } else if (daysDiff === 1) {
                              badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                              badgeText = 'Demain';
                            } else if (daysDiff <= 7) {
                              badgeColor = 'bg-blue-50 text-blue-700 border-blue-200';
                              badgeText = `Dans ${daysDiff}j`;
                            }
                            
                            return (
                              <div key={idx} className={`flex items-center justify-between p-2 rounded border ${badgeColor}`}>
                          <div className="flex items-center gap-2">
                                  <Calendar size={12} className="opacity-70" />
                                  <span className="text-xs font-semibold">
                                    {availDate.toLocaleDateString('fr-FR', { 
                                      day: '2-digit', 
                                      month: 'short' 
                                    })}
                                  </span>
                                  <span className="text-xs font-medium">
                                    {avail.startTime.slice(0, 5)}-{avail.endTime.slice(0, 5)}
                                  </span>
                          </div>
                                {badgeText && (
                                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded">
                                    {badgeText}
                                  </span>
                        )}
                      </div>
                            );
                          })}
                          {vehicle.upcomingAvailabilities.length > 3 && (
                            <button
                              onClick={() => fetchAllAvailabilities(vehicle)}
                              className="w-full mt-2 flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg transition-colors text-xs font-medium"
                            >
                              <Calendar size={14} />
                              Voir toutes les disponibilités ({vehicle.availabilityCount})
                            </button>
                          )}
                    </div>
                      </div>
                    )}
                    
                    {/* Bouton pour voir toutes les disponibilités si disponibles */}
                    {vehicle.availabilityCount !== undefined && vehicle.availabilityCount > 0 && (
                      <button
                        onClick={() => fetchAllAvailabilities(vehicle)}
                        className="w-full mb-4 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 active:from-green-800 active:to-blue-800 text-white rounded-lg transition-colors text-sm font-semibold shadow-md"
                      >
                        <Calendar size={18} />
                        <span>Voir toutes les disponibilités</span>
                        <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs font-bold">
                          {vehicle.availabilityCount}
                        </span>
                      </button>
                    )}

                    <div className="text-sm text-gray-600 bg-gray-50 rounded-lg p-2 space-y-1">
                      <p className="text-xs font-medium text-gray-900">
                        {vehicle.driver
                          ? `${vehicle.driver.firstName} ${vehicle.driver.lastName}`
                          : 'Aucun chauffeur associé'}
                      </p>
                      <p className="text-xs">
                        {vehicle.color || 'Couleur N/A'} • {vehicle.licensePlate || 'Plaque N/A'} •{' '}
                        {vehicle.seats ?? 'N/A'} places • {formatVehicleType(vehicle.type)}
                      </p>
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
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full table-auto">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Chauffeur
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Activité
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Véhicule
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Performance
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Statut
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Inscription
                  </th>
                  <th className="sticky right-0 z-10 bg-gray-50 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.08)]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {drivers.map((driver) => (
                  <tr key={driver.id} className="group hover:bg-gray-50 transition-colors">
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

                    {/* Activité VTC / transporteur */}
                    <td className="px-3 py-3">
                      {getDriverActivityBadge(driver.driverType)}
                    </td>
                    
                    {/* Contact */}
                    <td className="px-1 py-1">
                      <div className="text-xs">
                        <p className="text-gray-900 truncate">{driver.phone || 'N/A'}</p>
                        <p className="text-gray-500 truncate text-[10px]">{driver.city || 'N/A'}</p>
                      </div>
                    </td>
                    
                    {/* Véhicule */}
                    <td className="px-1 py-1">
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
                    
                    {/* Actions — colonne fixée à droite */}
                    <td className="sticky right-0 z-10 bg-white group-hover:bg-gray-50 px-3 py-3 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.08)]">
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
                      {getDriverActivityBadge(driver.driverType)}
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-[100]">
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold text-gray-900">
                  Détails du chauffeur
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEditDriver(selectedDriver)}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                  >
                    <Edit size={18} />
                    Modifier
                  </button>
                  <button
                    onClick={() => setSelectedDriver(null)}
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <XCircle size={24} />
                  </button>
                </div>
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
                  <div className="bg-gray-50 rounded-lg p-4 md:col-span-2">
                    <p className="text-sm text-gray-600 mb-1">Type d&apos;activité</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      {getDriverActivityBadge(selectedDriver.driverType)}
                      <span className="text-sm text-gray-600">
                        {driverActivityLabel(selectedDriver.driverType || 'vtc')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Vehicle Info */}
              {selectedDriver.vehicles && selectedDriver.vehicles.length > 0 ? (
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">
                    Véhicules enregistrés ({selectedDriver.vehicles.length})
                  </h4>
                  <div className="space-y-4">
                    {selectedDriver.vehicles.map((vehicle) => (
                      <div key={vehicle.id} className="border border-gray-200 rounded-xl p-4">
                        <div className="flex items-start gap-4 mb-4">
                          {vehicle.photoUrl ? (
                            <img
                              src={vehicle.photoUrl}
                              alt={`${vehicle.make} ${vehicle.model}`}
                              className="w-24 h-20 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="w-24 h-20 bg-gray-100 rounded-lg flex items-center justify-center">
                              <Car size={28} className="text-gray-500" />
                            </div>
                          )}
                          <div>
                            <p className="font-semibold text-gray-900">
                              {vehicle.make} {vehicle.model}
                              {vehicle.is_primary && (
                                <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                                  Principal
                                </span>
                              )}
                            </p>
                            <p className="text-sm text-gray-500">{vehicle.year || 'Année N/A'}</p>
                          </div>
                        </div>
                        <div className="grid md:grid-cols-2 gap-3">
                          <div className="bg-gray-50 rounded-lg p-3">
                            <p className="text-xs text-gray-600 mb-1">Couleur</p>
                            <p className="font-medium text-gray-900">{vehicle.color || 'N/A'}</p>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-3">
                            <p className="text-xs text-gray-600 mb-1">Plaque</p>
                            <p className="font-medium text-gray-900">{vehicle.licensePlate || 'N/A'}</p>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-3">
                            <p className="text-xs text-gray-600 mb-1">Places</p>
                            <p className="font-medium text-gray-900">{vehicle.seats ?? 'N/A'}</p>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-3">
                            <p className="text-xs text-gray-600 mb-1">Type</p>
                            <p className="font-medium text-gray-900 capitalize">{vehicle.type || 'N/A'}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : selectedDriver.vehicleInfo ? (
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
                        {selectedDriver.vehicleInfo.type === 'taxi' && 'Taxi'}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-gray-300 p-6 text-center">
                  <Car size={32} className="text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600">Aucun véhicule enregistré pour ce chauffeur.</p>
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
                  <h4 className="text-sm font-semibold text-orange-900 mb-3">Valider le paiement</h4>
                  <div className="space-y-4">
                    <p className="text-sm text-orange-800">
                      Ce paiement est en attente. Une fois le virement (ou l'encaissement) reçu, validez l'abonnement
                      ci-dessous : le statut passera à <span className="font-semibold">Payé</span> et l'abonnement sera activé.
                    </p>

                    {paymentValidationError && (
                      <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                        <AlertCircleIcon size={18} className="flex-shrink-0 mt-0.5" />
                        <span>{paymentValidationError}</span>
                      </div>
                    )}

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Méthode de paiement</label>
                        <select
                          value={paymentForm.method}
                          onChange={(e) => setPaymentForm(f => ({ ...f, method: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="bank_transfer">Virement bancaire</option>
                          <option value="cash">Espèces</option>
                          <option value="card">Carte bancaire</option>
                          <option value="other">Autre</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Référence de paiement</label>
                        <input
                          type="text"
                          value={paymentForm.reference}
                          onChange={(e) => setPaymentForm(f => ({ ...f, reference: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Ex: ABONNEMENT-XXXX"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button
                        onClick={validateSubscriptionPayment}
                        loading={validatingPayment}
                        className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
                      >
                        <CheckCircle size={18} />
                        {validatingPayment ? 'Validation...' : 'Valider le paiement'}
                      </Button>
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

      {/* Cancel Booking Confirmation Modal */}
      {bookingToCancel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-[60]">
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <AlertTriangle size={20} className="text-red-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Annuler la réservation</h3>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600">
                Êtes-vous sûr de vouloir annuler la réservation{' '}
                <span className="font-semibold text-gray-900">#{bookingToCancel.id.slice(-8)}</span>
                {bookingToCancel.clients && (
                  <> de <span className="font-semibold text-gray-900">{bookingToCancel.clients.first_name} {bookingToCancel.clients.last_name}</span></>
                )}
                {' '}? Cette action passera son statut à « Annulée », libérera le créneau de disponibilité du chauffeur et enverra un email de notification au client{bookingToCancel.drivers ? ' et au chauffeur' : ''}.
              </p>

              <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
                <p className="text-gray-700"><span className="text-gray-500">Trajet :</span> {bookingToCancel.pickupAddress} → {bookingToCancel.destinationAddress}</p>
                <p className="text-gray-700"><span className="text-gray-500">Date :</span> {new Date(bookingToCancel.scheduledTime).toLocaleString('fr-FR')}</p>
              </div>

              {cancelBookingError && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  <AlertCircleIcon size={18} className="flex-shrink-0 mt-0.5" />
                  <span>{cancelBookingError}</span>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 flex items-center justify-end gap-3">
              <Button variant="outline" onClick={() => setBookingToCancel(null)} disabled={cancellingBooking}>
                Retour
              </Button>
              <Button
                onClick={handleCancelBooking}
                loading={cancellingBooking}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {cancellingBooking ? 'Annulation...' : 'Confirmer l\'annulation'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Driver Edit Modal */}
      {editingDriver && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-[60]">
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold text-gray-900">Modifier le chauffeur</h3>
                <button
                  onClick={() => setEditingDriver(null)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                  disabled={savingDriver}
                >
                  <XCircle size={24} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {driverEditError && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  <AlertCircleIcon size={18} className="flex-shrink-0 mt-0.5" />
                  <span>{driverEditError}</span>
                </div>
              )}

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prénom</label>
                  <input
                    type="text"
                    value={driverEditForm.firstName}
                    onChange={(e) => setDriverEditForm(f => ({ ...f, firstName: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                  <input
                    type="text"
                    value={driverEditForm.lastName}
                    onChange={(e) => setDriverEditForm(f => ({ ...f, lastName: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={driverEditForm.email}
                    onChange={(e) => setDriverEditForm(f => ({ ...f, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                  <input
                    type="tel"
                    value={driverEditForm.phone}
                    onChange={(e) => setDriverEditForm(f => ({ ...f, phone: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ville</label>
                  <input
                    type="text"
                    value={driverEditForm.city}
                    onChange={(e) => setDriverEditForm(f => ({ ...f, city: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Permis de conduire</label>
                  <input
                    type="text"
                    value={driverEditForm.licenseNumber}
                    onChange={(e) => setDriverEditForm(f => ({ ...f, licenseNumber: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex items-center justify-end gap-3">
              <Button variant="outline" onClick={() => setEditingDriver(null)} disabled={savingDriver}>
                Annuler
              </Button>
              <Button onClick={handleSaveDriver} loading={savingDriver}>
                {savingDriver ? 'Enregistrement...' : 'Enregistrer les modifications'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Client Edit Modal */}
      {editingClient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-[60]">
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold text-gray-900">Modifier le client</h3>
                <button
                  onClick={() => setEditingClient(null)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                  disabled={savingClient}
                >
                  <XCircle size={24} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {clientEditError && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  <AlertCircleIcon size={18} className="flex-shrink-0 mt-0.5" />
                  <span>{clientEditError}</span>
                </div>
              )}

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prénom</label>
                  <input
                    type="text"
                    value={clientEditForm.firstName}
                    onChange={(e) => setClientEditForm(f => ({ ...f, firstName: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                  <input
                    type="text"
                    value={clientEditForm.lastName}
                    onChange={(e) => setClientEditForm(f => ({ ...f, lastName: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={clientEditForm.email}
                    onChange={(e) => setClientEditForm(f => ({ ...f, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                  <input
                    type="tel"
                    value={clientEditForm.phone}
                    onChange={(e) => setClientEditForm(f => ({ ...f, phone: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ville</label>
                  <input
                    type="text"
                    value={clientEditForm.city}
                    onChange={(e) => setClientEditForm(f => ({ ...f, city: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex items-center justify-end gap-3">
              <Button variant="outline" onClick={() => setEditingClient(null)} disabled={savingClient}>
                Annuler
              </Button>
              <Button onClick={handleSaveClient} loading={savingClient}>
                {savingClient ? 'Enregistrement...' : 'Enregistrer les modifications'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Vehicle Edit Modal */}
      {editingVehicle && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-[60]">
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold text-gray-900">Modifier le véhicule</h3>
                <button
                  onClick={() => setEditingVehicle(null)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                  disabled={savingVehicle}
                >
                  <XCircle size={24} />
                </button>
              </div>
              {editingVehicle.driver && (
                <p className="mt-1 text-sm text-gray-500">
                  Chauffeur : {editingVehicle.driver.firstName} {editingVehicle.driver.lastName}
                </p>
              )}
            </div>

            <div className="p-6 space-y-4">
              {vehicleEditError && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  <AlertCircleIcon size={18} className="flex-shrink-0 mt-0.5" />
                  <span>{vehicleEditError}</span>
                </div>
              )}

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Marque</label>
                  <input
                    type="text"
                    value={vehicleEditForm.make}
                    onChange={(e) => setVehicleEditForm(f => ({ ...f, make: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ex: Mercedes"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Modèle</label>
                  <input
                    type="text"
                    value={vehicleEditForm.model}
                    onChange={(e) => setVehicleEditForm(f => ({ ...f, model: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ex: Classe E"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Année</label>
                  <select
                    value={vehicleEditForm.year}
                    onChange={(e) => setVehicleEditForm(f => ({ ...f, year: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Sélectionner</option>
                    {Array.from({ length: new Date().getFullYear() - 1990 + 1 }, (_, i) => new Date().getFullYear() - i).map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Couleur</label>
                  <select
                    value={vehicleEditForm.color}
                    onChange={(e) => setVehicleEditForm(f => ({ ...f, color: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Sélectionner</option>
                    {['Blanc','Noir','Gris','Argent','Bleu','Rouge','Vert','Jaune','Orange','Marron','Beige','Violet','Rose','Or','Bronze'].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de places</label>
                  <select
                    value={vehicleEditForm.seats}
                    onChange={(e) => setVehicleEditForm(f => ({ ...f, seats: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Sélectionner</option>
                    {Array.from({ length: 99 }, (_, i) => i + 2).map(s => (
                      <option key={s} value={s}>{s} places</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select
                    value={vehicleEditForm.type}
                    onChange={(e) => setVehicleEditForm(f => ({ ...f, type: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Sélectionner</option>
                    <option value="sedan">Berline</option>
                    <option value="pickup">Pickup</option>
                    <option value="van">Van</option>
                    <option value="minibus">Minibus</option>
                    <option value="bus">Bus</option>
                    <option value="truck">Camion</option>
                    <option value="utility">Utilitaire</option>
                    <option value="taxi">Taxi</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Plaque d'immatriculation</label>
                  <input
                    type="text"
                    value={vehicleEditForm.licensePlate}
                    onChange={(e) => setVehicleEditForm(f => ({ ...f, licensePlate: e.target.value.toUpperCase() }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase"
                    placeholder="Ex: 123 TUN 4567"
                  />
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex items-center justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setEditingVehicle(null)}
                disabled={savingVehicle}
              >
                Annuler
              </Button>
              <Button
                onClick={handleSaveVehicle}
                loading={savingVehicle}
              >
                {savingVehicle ? 'Enregistrement...' : 'Enregistrer les modifications'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Vehicle Detail Modal */}
      {selectedVehicle && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-[100]">
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl max-w-3xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold text-gray-900">
                  Détails du véhicule
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEditVehicle(selectedVehicle)}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                  >
                    <Edit size={18} />
                    Modifier
                  </button>
                  <button
                    onClick={() => setSelectedVehicle(null)}
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <XCircle size={24} />
                  </button>
                </div>
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
                      {formatVehicleType(selectedVehicle.type)}
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
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600 mb-1">Type d&apos;activité</p>
                      {getDriverActivityBadge(selectedVehicle.driver.driverType)}
                    </div>
                  </div>
                </div>
              )}

              {/* Availabilities */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold text-gray-900">
                  Disponibilités à venir
                  </h4>
                  {selectedVehicle.availabilityCount !== undefined && selectedVehicle.availabilityCount > 0 && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 bg-green-50 rounded-lg border border-green-200">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-xs sm:text-sm font-bold text-green-700">
                          {selectedVehicle.availabilityCount} créneau{selectedVehicle.availabilityCount > 1 ? 'x' : ''}
                    </span>
                        <span className="text-[10px] sm:text-xs text-green-600 hidden sm:inline">sur 30 jours</span>
                      </div>
                      <button
                        onClick={() => fetchAllAvailabilities(selectedVehicle)}
                        className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg transition-colors text-xs sm:text-sm font-medium"
                      >
                        <Calendar size={14} className="sm:w-4 sm:h-4" />
                        <span className="hidden sm:inline">Voir toutes</span>
                        <span className="sm:hidden">Toutes</span>
                      </button>
                    </div>
                  )}
                </div>
                {selectedVehicle.upcomingAvailabilities && selectedVehicle.upcomingAvailabilities.length > 0 ? (
                  <div className="space-y-3">
                    {/* Grouper les disponibilités par date */}
                    {(() => {
                      const groupedByDate: { [key: string]: typeof selectedVehicle.upcomingAvailabilities } = {};
                      selectedVehicle.upcomingAvailabilities.forEach(avail => {
                        if (!groupedByDate[avail.date]) {
                          groupedByDate[avail.date] = [];
                        }
                        groupedByDate[avail.date].push(avail);
                      });
                      
                      return Object.entries(groupedByDate)
                        .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
                        .map(([date, availabilities]) => {
                          const availDate = new Date(date + 'T00:00:00');
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          const daysDiff = Math.ceil((availDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                          
                          let dateBadge = '';
                          let badgeColor = 'bg-blue-100 text-blue-800';
                          if (daysDiff === 0) {
                            dateBadge = "Aujourd'hui";
                            badgeColor = 'bg-green-100 text-green-800';
                          } else if (daysDiff === 1) {
                            dateBadge = 'Demain';
                            badgeColor = 'bg-emerald-100 text-emerald-800';
                          } else if (daysDiff <= 7) {
                            dateBadge = `Dans ${daysDiff} jour${daysDiff > 1 ? 's' : ''}`;
                            badgeColor = 'bg-blue-100 text-blue-800';
                          } else {
                            dateBadge = `Dans ${daysDiff} jour${daysDiff > 1 ? 's' : ''}`;
                            badgeColor = 'bg-gray-100 text-gray-800';
                          }
                          
                          return (
                            <div key={date} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                              <div className="bg-gradient-to-r from-green-50 to-blue-50 px-4 py-2.5 border-b border-gray-200">
                                <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                                    <Calendar size={18} className="text-green-600" />
                          <div>
                                      <p className="font-semibold text-gray-900">
                                        {availDate.toLocaleDateString('fr-FR', {
                                weekday: 'long',
                                          day: 'numeric',
                                month: 'long',
                                          year: 'numeric'
                              })}
                            </p>
                                      <p className="text-xs text-gray-600">
                                        {availabilities.length} créneau{availabilities.length > 1 ? 'x' : ''} disponible{availabilities.length > 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>
                                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${badgeColor}`}>
                                    {dateBadge}
                                  </span>
                                </div>
                              </div>
                              <div className="p-3">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {availabilities.map((avail, idx) => (
                                    <div
                                      key={idx}
                                      className="flex items-center justify-between p-2.5 bg-green-50 rounded-lg border border-green-100 hover:bg-green-100 transition-colors"
                                    >
                                      <div className="flex items-center gap-2">
                                        <Clock size={14} className="text-green-600" />
                                        <span className="text-sm font-medium text-gray-900">
                                          {avail.startTime.slice(0, 5)} - {avail.endTime.slice(0, 5)}
                                        </span>
                                      </div>
                                      <CheckCircle size={16} className="text-green-600" />
                      </div>
                    ))}
                                </div>
                              </div>
                            </div>
                          );
                        });
                    })()}
                    {selectedVehicle.availabilityCount && selectedVehicle.availabilityCount > selectedVehicle.upcomingAvailabilities.length && (
                      <div className="text-center py-3 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-sm font-medium text-blue-700">
                          +{selectedVehicle.availabilityCount - selectedVehicle.upcomingAvailabilities.length} créneau{selectedVehicle.availabilityCount - selectedVehicle.upcomingAvailabilities.length > 1 ? 'x' : ''} supplémentaire{selectedVehicle.availabilityCount - selectedVehicle.upcomingAvailabilities.length > 1 ? 's' : ''} au-delà des 30 prochains jours
                      </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border-2 border-dashed border-gray-300">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
                        <Calendar size={32} className="text-gray-400" />
                      </div>
                      <div>
                        <h5 className="text-lg font-semibold text-gray-900 mb-1">Aucune disponibilité</h5>
                        <p className="text-sm text-gray-600 max-w-md">
                      Ce chauffeur n'a pas encore configuré ses disponibilités pour ce véhicule.
                    </p>
                      </div>
                      <div className="mt-2 px-4 py-2 bg-orange-50 border border-orange-200 rounded-lg">
                        <p className="text-xs text-orange-700 font-medium">
                          ⚠️ Action requise : Le chauffeur doit ajouter des créneaux de disponibilité
                        </p>
                      </div>
                    </div>
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

      {/* All Availabilities Modal */}
      {vehicleForAvailabilities && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-0 sm:p-2 md:p-4 z-50">
          <div className="bg-white rounded-none sm:rounded-xl md:rounded-2xl shadow-xl max-w-5xl w-full h-full sm:h-auto max-h-[100vh] sm:max-h-[95vh] md:max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-3 sm:p-4 md:p-6 border-b border-gray-200 flex-shrink-0 bg-gradient-to-r from-green-50 to-blue-50">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">
                    Toutes les disponibilités
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-600 mt-1 truncate">
                    {vehicleForAvailabilities.driver?.firstName} {vehicleForAvailabilities.driver?.lastName}
                  </p>
                  <p className="text-xs sm:text-sm text-gray-500 truncate">
                    {vehicleForAvailabilities.make} {vehicleForAvailabilities.model}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setVehicleForAvailabilities(null);
                    setAllAvailabilities([]);
                  }}
                  className="p-1.5 sm:p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-white/50 active:bg-white transition-colors flex-shrink-0"
                >
                  <XCircle size={20} className="sm:w-6 sm:h-6" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6">
              {loadingAvailabilities ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-sm sm:text-base text-gray-600">Chargement des disponibilités...</p>
                  </div>
                </div>
              ) : allAvailabilities.length > 0 ? (
                <div className="space-y-3 sm:space-y-4">
                  {/* Statistiques */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-4 sm:mb-6">
                    <div className="bg-green-50 rounded-lg p-2 sm:p-3 border border-green-200">
                      <p className="text-[10px] sm:text-xs text-gray-600 mb-1 truncate">Total créneaux</p>
                      <p className="text-xl sm:text-2xl font-bold text-green-700">{allAvailabilities.length}</p>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-2 sm:p-3 border border-blue-200">
                      <p className="text-[10px] sm:text-xs text-gray-600 mb-1 truncate">Jours uniques</p>
                      <p className="text-xl sm:text-2xl font-bold text-blue-700">
                        {new Set(allAvailabilities.map(a => a.date)).size}
                      </p>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-2 sm:p-3 border border-purple-200">
                      <p className="text-[10px] sm:text-xs text-gray-600 mb-1 truncate">Cette semaine</p>
                      <p className="text-xl sm:text-2xl font-bold text-purple-700">
                        {allAvailabilities.filter(a => {
                          const date = new Date(a.date + 'T00:00:00');
                          const today = new Date();
                          const weekFromNow = new Date(today);
                          weekFromNow.setDate(today.getDate() + 7);
                          return date >= today && date <= weekFromNow;
                        }).length}
                      </p>
                    </div>
                    <div className="bg-orange-50 rounded-lg p-2 sm:p-3 border border-orange-200">
                      <p className="text-[10px] sm:text-xs text-gray-600 mb-1 truncate">Ce mois</p>
                      <p className="text-xl sm:text-2xl font-bold text-orange-700">
                        {allAvailabilities.filter(a => {
                          const date = new Date(a.date + 'T00:00:00');
                          const today = new Date();
                          const monthFromNow = new Date(today);
                          monthFromNow.setMonth(today.getMonth() + 1);
                          return date >= today && date <= monthFromNow;
                        }).length}
                      </p>
                    </div>
                  </div>

                  {/* Groupement par date */}
                  {(() => {
                    const groupedByDate: { [key: string]: typeof allAvailabilities } = {};
                    allAvailabilities.forEach(avail => {
                      if (!groupedByDate[avail.date]) {
                        groupedByDate[avail.date] = [];
                      }
                      groupedByDate[avail.date].push(avail);
                    });
                    
                    return Object.entries(groupedByDate)
                      .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
                      .map(([date, availabilities]) => {
                        const availDate = new Date(date + 'T00:00:00');
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const daysDiff = Math.ceil((availDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                        
                        let dateBadge = '';
                        let badgeColor = 'bg-blue-100 text-blue-800';
                        if (daysDiff === 0) {
                          dateBadge = "Aujourd'hui";
                          badgeColor = 'bg-green-100 text-green-800';
                        } else if (daysDiff === 1) {
                          dateBadge = 'Demain';
                          badgeColor = 'bg-emerald-100 text-emerald-800';
                        } else if (daysDiff <= 7) {
                          dateBadge = `Dans ${daysDiff} jour${daysDiff > 1 ? 's' : ''}`;
                          badgeColor = 'bg-blue-100 text-blue-800';
                        } else if (daysDiff <= 30) {
                          dateBadge = `Dans ${daysDiff} jour${daysDiff > 1 ? 's' : ''}`;
                          badgeColor = 'bg-purple-100 text-purple-800';
                        } else {
                          dateBadge = `Dans ${daysDiff} jour${daysDiff > 1 ? 's' : ''}`;
                          badgeColor = 'bg-gray-100 text-gray-800';
                        }
                        
                        return (
                          <div key={date} className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                            <div className="bg-gradient-to-r from-green-50 to-blue-50 px-3 sm:px-4 py-2 sm:py-3 border-b border-gray-200">
                              <div className="flex items-start sm:items-center justify-between flex-wrap gap-2">
                                <div className="flex items-start sm:items-center gap-2 sm:gap-3 min-w-0 flex-1">
                                  <Calendar size={18} className="sm:w-5 sm:h-5 text-green-600 flex-shrink-0 mt-0.5 sm:mt-0" />
                                  <div className="min-w-0 flex-1">
                                    <p className="font-semibold text-gray-900 text-xs sm:text-sm md:text-base">
                                      <span className="hidden sm:inline">
                                        {availDate.toLocaleDateString('fr-FR', {
                                          weekday: 'long',
                                          day: 'numeric',
                                          month: 'long',
                                          year: 'numeric'
                                        })}
                                      </span>
                                      <span className="sm:hidden">
                                        {availDate.toLocaleDateString('fr-FR', {
                                          weekday: 'short',
                                          day: 'numeric',
                                          month: 'short'
                                        })}
                                      </span>
                                    </p>
                                    <p className="text-[10px] sm:text-xs text-gray-600">
                                      {availabilities.length} créneau{availabilities.length > 1 ? 'x' : ''} disponible{availabilities.length > 1 ? 's' : ''}
                                    </p>
                                  </div>
                                </div>
                                <span className={`px-2 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs font-medium ${badgeColor} flex-shrink-0`}>
                                  {dateBadge}
                                </span>
                              </div>
                            </div>
                            <div className="p-2 sm:p-3 md:p-4">
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                {availabilities
                                  .sort((a, b) => a.startTime.localeCompare(b.startTime))
                                  .map((avail, idx) => (
                                    <div
                                      key={idx}
                                      className="flex items-center justify-between p-2 sm:p-3 bg-green-50 rounded-lg border border-green-100 hover:bg-green-100 active:bg-green-200 transition-colors"
                                    >
                                      <div className="flex items-center gap-1.5 sm:gap-2">
                                        <Clock size={14} className="sm:w-4 sm:h-4 text-green-600 flex-shrink-0" />
                                        <span className="text-xs sm:text-sm font-semibold text-gray-900">
                                          {avail.startTime.slice(0, 5)} - {avail.endTime.slice(0, 5)}
                                        </span>
                                      </div>
                                      <CheckCircle size={14} className="sm:w-4 sm:h-4 text-green-600 flex-shrink-0" />
                                    </div>
                                  ))}
                              </div>
                            </div>
                          </div>
                        );
                      });
                  })()}
                </div>
              ) : (
                <div className="text-center py-8 sm:py-12 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border-2 border-dashed border-gray-300">
                  <div className="flex flex-col items-center gap-3 px-4">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-200 rounded-full flex items-center justify-center">
                      <Calendar size={24} className="sm:w-8 sm:h-8 text-gray-400" />
                    </div>
                    <div>
                      <h5 className="text-base sm:text-lg font-semibold text-gray-900 mb-1">Aucune disponibilité</h5>
                      <p className="text-xs sm:text-sm text-gray-600 max-w-md">
                        Ce chauffeur n'a pas encore configuré ses disponibilités pour ce véhicule.
                      </p>
                    </div>
                  </div>
                </div>
              )}
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
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEditClient(selectedClient)}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                  >
                    <Edit size={18} />
                    Modifier
                  </button>
                  <button
                    onClick={() => setSelectedClient(null)}
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <XCircle size={24} />
                  </button>
                </div>
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
