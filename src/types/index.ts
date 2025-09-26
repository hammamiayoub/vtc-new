export interface Driver {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  city?: string;
  city?: string;
  licenseNumber?: string;
  vehicleInfo?: VehicleInfo;
  status: string;
  profilePhotoUrl?: string;
  createdAt: string;
  updatedAt: string;
  distanceFromPickup?: number; // Distance calculée depuis le point de départ
  bookingCount?: number; // Nombre de courses effectuées
  totalEarnings?: number; // Montant total gagné en TND
  // Statistiques détaillées des courses
  completedBookings?: number; // Courses terminées avec succès
  cancelledByDriver?: number; // Courses annulées par le chauffeur
  cancelledByClient?: number; // Courses annulées par le client
  pendingBookings?: number; // Courses en attente
  inProgressBookings?: number; // Courses en cours
}

export interface VehicleInfo {
  make: string;
  model: string;
  year: number;
  color: string;
  licensePlate: string;
  seats: number;
  type: 'sedan' | 'pickup' | 'van' | 'minibus' | 'bus' | 'truck' | 'utility' | 'limousine';
  photoUrl?: string;
}

export interface DriverProfileData {
  phone: string;
  city: string;
  licenseNumber: string;
  vehicleInfo: VehicleInfo;
}

export interface SignupFormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface AuthState {
  user: Driver | null;
  loading: boolean;
  error: string | null;
}

export interface AdminUser {
  id: string;
  email: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminAuthState {
  admin: AdminUser | null;
  loading: boolean;
  error: string | null;
}

export interface Client {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  city?: string;
  status: string;
  profilePhotoUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ClientSignupFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  city: string;
  password: string;
  confirmPassword: string;
}

export interface ClientAuthState {
  client: Client | null;
  loading: boolean;
  error: string | null;
}

export interface DriverAvailability {
  id: string;
  driverId: string;
  date: string;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Booking {
  id: string;
  clientId: string;
  driverId?: string;
  pickupAddress: string;
  pickupLatitude?: number;
  pickupLongitude?: number;
  destinationAddress: string;
  destinationLatitude?: number;
  destinationLongitude?: number;
  distanceKm: number;
  priceTnd: number;
  status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
  scheduledTime: string;
  pickupTime?: string;
  completionTime?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  clients?: {
    first_name: string;
    last_name: string;
    phone?: string;
  };
  drivers?: {
    first_name: string;
    last_name: string;
    phone?: string;
  };
}

export interface BookingFormData {
  pickupAddress: string;
  destinationAddress: string;
  scheduledTime: string;
  vehicleType?: 'sedan' | 'pickup' | 'van' | 'minibus' | 'bus' | 'truck' | 'utility' | 'limousine';
  notes?: string;
}

export interface Rating {
  id: string;
  bookingId: string;
  clientId: string;
  driverId: string;
  rating: number; // 1-5 étoiles
  comment?: string;
  createdAt: string;
  updatedAt: string;
  client?: {
    first_name: string;
    last_name: string;
  };
  driver?: {
    first_name: string;
    last_name: string;
  };
}

export interface RatingFormData {
  rating: number;
  comment?: string;
}