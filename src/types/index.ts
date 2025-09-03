export interface Driver {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  licenseNumber?: string;
  vehicleInfo?: VehicleInfo;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface VehicleInfo {
  make: string;
  model: string;
  year: number;
  color: string;
  licensePlate: string;
  seats: number;
  type: 'sedan' | 'suv' | 'luxury' | 'van';
}

export interface DriverProfileData {
  phone: string;
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

export interface Client {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface ClientSignupFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

export interface ClientAuthState {
  client: Client | null;
  loading: boolean;
  error: string | null;
}