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
import { Driver } from '../types';

interface AdminDashboardProps {
  onLogout: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout }) => {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchDrivers();
    
    // Rafraîchir automatiquement toutes les 30 secondes
    const interval = setInterval(() => {
      fetchDrivers();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const fetchDrivers = async () => {
    if (!loading) setRefreshing(true);
    
    try {
      console.log('Récupération des chauffeurs...');
      
      // Vérifier l'utilisateur connecté
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      console.log('Utilisateur connecté:', user);
      console.log('Erreur utilisateur:', userError);
      
      if (!user) {
        console.error('Aucun utilisateur connecté');
        return;
      }
      
      // Vérifier les permissions admin
      const { data: adminData, error: adminError } = await supabase
        .from('admin_users')
        .select('*')
        .eq('id', user.id)
        .single();
      
      console.log('Données admin:', adminData);
      console.log('Erreur admin:', adminError);
      
      const { data, error } = await supabase
        .from('drivers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erreur lors de la récupération des chauffeurs:', error);
        console.error('Détails de l\'erreur:', error.message, error.code, error.details);
        return;
      }

      console.log('Données brutes récupérées:', data);
      console.log('Nombre de chauffeurs récupérés:', data?.length || 0);

      const formattedDrivers = data.map(driver => ({
        id: driver.id,
        firstName: driver.first_name,
        lastName: driver.last_name,
        email: driver.email,
        phone: driver.phone,
        licenseNumber: driver.license_number,
        vehicleInfo: driver.vehicle_info,
        status: driver.status,
        createdAt: driver.created_at,
        updatedAt: driver.updated_at
      }));

      console.log('Chauffeurs formatés:', formattedDrivers);
      setDrivers(formattedDrivers);
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
      const { error } = await supabase
        .from('drivers')
        .update({ status: newStatus })
        .eq('id', driverId);

      if (error) {
        console.error('Erreur lors de la mise à jour:', error);
        return;
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

  const pendingDrivers = drivers.filter(d => d.status === 'pending');
  const activeDrivers = drivers.filter(d => d.status === 'active');
  const rejectedDrivers = drivers.filter(d => d.status === 'rejected');

  console.log('Statistiques:', {
    total: drivers.length,
    pending: pendingDrivers.length,
    active: activeDrivers.length,
    rejected: rejectedDrivers.length
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
              <div className="p-2 bg-red-600 rounded-lg">
                <Shield size={24} className="text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Administration</h1>
                <p className="text-sm text-gray-600">DriveConnect</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <button
                onClick={fetchDrivers}
                disabled={refreshing}
                className="p-2 text-gray-600 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50"
                title="Actualiser"
              >
                <div className={refreshing ? 'animate-spin' : ''}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>
              </button>
              <Button variant="outline" onClick={handleLogout} className="flex items-center gap-2">
                <LogOut size={16} />
                Déconnexion
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users size={24} className="text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Total chauffeurs</h3>
                <p className="text-2xl font-bold text-gray-900">{drivers.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
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
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
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
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <XCircle size={24} className="text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Rejetés</h3>
                <p className="text-2xl font-bold text-gray-900">{rejectedDrivers.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Drivers List */}
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

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Chauffeur
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Véhicule
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Inscription
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {drivers.map((driver) => (
                  <tr key={driver.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <User size={20} className="text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {driver.firstName} {driver.lastName}
                          </p>
                          <p className="text-sm text-gray-500">{driver.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        <p className="text-gray-900">{driver.phone || 'Non renseigné'}</p>
                        <p className="text-gray-500">Permis: {driver.licenseNumber || 'Non renseigné'}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        {driver.vehicleInfo ? (
                          <>
                            <p className="text-gray-900">
                              {driver.vehicleInfo.make} {driver.vehicleInfo.model}
                            </p>
                            <p className="text-gray-500">
                              {driver.vehicleInfo.year} - {driver.vehicleInfo.color}
                            </p>
                          </>
                        ) : (
                          <p className="text-gray-500">Non renseigné</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(driver.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(driver.createdAt).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedDriver(driver)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Voir les détails"
                        >
                          <Eye size={16} />
                        </button>
                        
                        {driver.status === 'pending' && (
                          <>
                            <button
                              onClick={() => updateDriverStatus(driver.id, 'active')}
                              disabled={actionLoading === driver.id}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                              title="Approuver"
                            >
                              <UserCheck size={16} />
                            </button>
                            <button
                              onClick={() => updateDriverStatus(driver.id, 'rejected')}
                              disabled={actionLoading === driver.id}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
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
                            className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors disabled:opacity-50"
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
                          className="bg-green-600 hover:bg-green-700 flex items-center gap-2"
                          size="sm"
                        >
                          <CheckCircle size={16} />
                          Approuver
                        </Button>
                        <Button
                          onClick={() => updateDriverStatus(selectedDriver.id, 'rejected')}
                          loading={actionLoading === selectedDriver.id}
                          className="bg-red-600 hover:bg-red-700 flex items-center gap-2"
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
                        variant="outline"
                        className="border-orange-300 text-orange-600 hover:bg-orange-50 flex items-center gap-2"
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
                        className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2"
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
    </div>
  );
};