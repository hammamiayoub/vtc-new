export interface Driver {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  city?: string;
  licenseNumber?: string;
  vehicleInfo?: VehicleInfo;
  status: string;
  driverType?: 'vtc' | 'transporteur' | 'both';
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
  // Notes (calculées)
  averageRating?: number;
  totalRatings?: number;
}

export interface VehicleInfo {
  make: string;
  model: string;
  year: number;
  color: string;
  licensePlate: string;
  seats: number;
  type: 'sedan' | 'pickup' | 'van' | 'minibus' | 'bus' | 'truck' | 'utility' | 'taxi';
  photoUrl?: string;
  isVip?: boolean;
}

// Multiple vehicles support
export interface Vehicle {
  id: string;
  driverId: string;
  make: string;
  model: string;
  year?: number;
  color?: string;
  licensePlate?: string;
  seats?: number;
  type?: 'sedan' | 'pickup' | 'van' | 'minibus' | 'bus' | 'truck' | 'utility' | 'taxi';
  photoUrl?: string;
  isVip?: boolean;
  is_primary?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DriverWithVehicles extends Driver {
  vehicles?: Vehicle[];
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

export interface DriverSignupFormData extends SignupFormData {
  activityType: 'vtc' | 'transporteur';
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
  isReturnTrip?: boolean;
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

export interface ClientWithBookings extends Client {
  bookings: Booking[];
  totalBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  pendingBookings: number;
  totalSpent: number;
}

export interface BookingFormData {
  pickupAddress: string;
  destinationAddress: string;
  scheduledTime: string;
  vehicleType?: 'sedan' | 'pickup' | 'van' | 'minibus' | 'bus' | 'truck' | 'utility' | 'taxi';
  isReturnTrip?: boolean;
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

// ============================================================
// Transport international de colis (devis)
// ============================================================
export type ParcelDirection = 'europe_to_tunisia' | 'tunisia_to_europe';
export type ParcelRequestStatus =
  | 'pending'
  | 'quoted'
  | 'accepted'
  | 'completed'
  | 'cancelled'
  | 'expired';
export type ParcelProposalStatus = 'sent' | 'accepted' | 'rejected';
export type ParcelCurrency = 'EUR' | 'TND';

export interface ParcelItem {
  id?: string;
  requestId?: string;
  name: string;
  quantity: number;
  weightKg?: number;
  volumeM3?: number;
  createdAt?: string;
}

export type ParcelDocumentType = 'photo' | 'invoice';

export interface ParcelPhoto {
  id: string;
  requestId: string;
  photoUrl: string;
  documentType: ParcelDocumentType;
  createdAt: string;
}

export interface ParcelQuoteRequest {
  id: string;
  clientId: string;
  direction: ParcelDirection;
  departureAddress: string;
  departureCountry?: string;
  departureLatitude?: number;
  departureLongitude?: number;
  arrivalAddress: string;
  arrivalCountry?: string;
  arrivalLatitude?: number;
  arrivalLongitude?: number;
  desiredDate: string;
  currency: ParcelCurrency;
  notes?: string;
  status: ParcelRequestStatus;
  acceptedProposalId?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  items?: ParcelItem[];
  photos?: ParcelPhoto[];
  proposals?: ParcelProposal[];
  clients?: {
    first_name: string;
    last_name: string;
    email?: string;
    phone?: string;
  };
}

/** Transport colis accepté par le client, pour l'historique chauffeur/transporteur */
export interface DriverAcceptedParcelTrip {
  proposalId: string;
  price: number;
  currency: ParcelCurrency;
  estimatedDeliveryDate?: string;
  acceptedAt: string;
  request: ParcelQuoteRequest;
}

export interface ParcelProposal {
  id: string;
  requestId: string;
  driverId: string;
  price: number;
  currency: ParcelCurrency;
  estimatedDeliveryDate?: string;
  message?: string;
  status: ParcelProposalStatus;
  createdAt: string;
  updatedAt: string;
  drivers?: {
    first_name: string;
    last_name: string;
    email?: string;
    phone?: string;
    profile_photo_url?: string;
  };
}

export interface ParcelQuoteFormData {
  direction: ParcelDirection;
  departureAddress: string;
  arrivalAddress: string;
  desiredDate: string;
  items: ParcelItem[];
  notes?: string;
}

export interface ParcelProposalFormData {
  price: number;
  estimatedDeliveryDate?: string;
  message?: string;
}