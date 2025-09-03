import React, { useState, useEffect } from 'react';
import { User, Car, Clock, MapPin, LogOut, Settings, Bell, AlertCircle } from 'lucide-react';
import { Button } from './ui/Button';
import { DriverProfileForm } from './DriverProfileForm';
import { AvailabilityCalendar } from './AvailabilityCalendar';
import { supabase } from '../lib/supabase';
import { Driver } from '../types';

interface DriverDashboardProps {
  onLogout: () => void;
}

export const DriverDashboard: React.FC<DriverDashboardProps> = ({ onLogout }) => {
  const [driver, setDriver] = useState<Driver | null>(null);
  const [loading, setLoading] = useState(true);
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'availability'>('dashboard');

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
              <div className="p-2 bg-blue-600 rounded-lg">
                <Car size={24} className="text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">DriveConnect</h1>
            </div>
            
            <div className="flex items-center gap-4">
              <button className="p-2 text-gray-600 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors">
                <Bell size={20} />
              </button>
              <button className="p-2 text-gray-600 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors">
                <Settings size={20} />
              </button>
              <Button variant="outline" onClick={handleLogout} className="flex items-center gap-2">
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
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Tableau de bord
            </button>
            <button
              onClick={() => setActiveTab('availability')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'availability'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Disponibilités
            </button>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Completion Alert */}
        {needsProfileCompletion && !showProfileForm && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-6 mb-8">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-6 h-6 text-orange-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-orange-900 mb-2">
                  Complétez votre profil
                </h3>
                <p className="text-orange-800 mb-4">
                  Pour commencer à recevoir des courses, vous devez compléter vos informations 
                  personnelles et ajouter les détails de votre véhicule.
                </p>
                <Button 
                  onClick={() => setShowProfileForm(true)}
                  className="bg-orange-600 hover:bg-orange-700"
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
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                  <User size={32} className="text-blue-600" />
                </div>
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
                      driver?.status === 'active' ? 'bg-green-100' : 'bg-orange-100'
                    }`}>
                      <Clock size={24} className={driver?.status === 'active' ? 'text-green-600' : 'text-orange-600'} />
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
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Car size={24} className="text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Courses</h3>
                      <p className="text-sm text-gray-600">Aujourd'hui</p>
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-gray-900">0</p>
                </div>

                <div className="bg-white rounded-xl shadow-sm p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <MapPin size={24} className="text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Revenus</h3>
                      <p className="text-sm text-gray-600">Ce mois</p>
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-gray-900">0€</p>
                </div>
              </div>
            </div>

            {/* Next Steps */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Prochaines étapes</h3>
              <div className="space-y-4">
                <div className={`flex items-center gap-4 p-4 rounded-lg ${
                  needsProfileCompletion ? 'bg-blue-50 border border-blue-200' : 'bg-green-50 border border-green-200'
                }`}>
                  <div className={`w-8 h-8 text-white rounded-full flex items-center justify-center text-sm font-bold ${
                    needsProfileCompletion ? 'bg-blue-600' : 'bg-green-600'
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
                    >
                      Compléter
                    </Button>
                  )}
                </div>
                
                <div className={`flex items-center gap-4 p-4 rounded-lg ${
                  driver?.status === 'active' ? 'bg-green-50 border border-green-200' : 'bg-gray-50 opacity-50'
                }`}>
                  <div className={`w-8 h-8 text-white rounded-full flex items-center justify-center text-sm font-bold ${
                    driver?.status === 'active' ? 'bg-green-600' : 'bg-gray-400'
                  }`}>
                    2
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Validation du compte</h4>
                    <p className="text-sm text-gray-600">
                      {driver?.status === 'active' ? 'Compte validé ✓' : 'En cours - Nous vérifions vos informations'}
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
                  <Car className="w-5 h-5 text-blue-600" />
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
      </main>
    </div>
  );
};