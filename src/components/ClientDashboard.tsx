import React, { useState, useEffect } from 'react';
import { MapPin, Clock, User, LogOut, Settings, Bell, Car } from 'lucide-react';
import { Button } from './ui/Button';
import { supabase } from '../lib/supabase';
import { Client } from '../types';

interface ClientDashboardProps {
  onLogout: () => void;
}

export const ClientDashboard: React.FC<ClientDashboardProps> = ({ onLogout }) => {
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClientData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          const { data: clientData, error } = await supabase
            .from('clients')
            .select('*')
            .eq('id', user.id)
            .single();

          if (error) {
            console.error('Erreur lors de la récupération des données client:', error);
          } else {
            setClient({
              id: clientData.id,
              firstName: clientData.first_name,
              lastName: clientData.last_name,
              email: clientData.email,
              phone: clientData.phone,
              status: clientData.status,
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    onLogout();
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
      <header className="bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-600 rounded-lg">
                <MapPin size={24} className="text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">DriveConnect</h1>
                <p className="text-sm text-gray-600">Espace Client</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <button className="p-2 text-gray-600 hover:text-purple-600 rounded-lg hover:bg-purple-50 transition-colors">
                <Bell size={20} />
              </button>
              <button className="p-2 text-gray-600 hover:text-purple-600 rounded-lg hover:bg-purple-50 transition-colors">
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

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center">
              <User size={32} className="text-purple-600" />
            </div>
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
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <MapPin size={24} className="text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Nouvelle course</h3>
                <p className="text-sm text-gray-600">Réserver maintenant</p>
              </div>
            </div>
            <Button className="w-full bg-purple-600 hover:bg-purple-700">
              Réserver une course
            </Button>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Clock size={24} className="text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Mes courses</h3>
                <p className="text-sm text-gray-600">Historique</p>
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900 mb-2">0</p>
            <p className="text-sm text-gray-500">Courses effectuées</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Car size={24} className="text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Course en cours</h3>
                <p className="text-sm text-gray-600">Statut actuel</p>
              </div>
            </div>
            <p className="text-sm text-gray-500">Aucune course en cours</p>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Activité récente</h3>
          <div className="text-center py-12">
            <MapPin size={48} className="text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">Aucune course pour le moment</h4>
            <p className="text-gray-500 mb-6">
              Commencez par réserver votre première course pour voir votre activité ici.
            </p>
            <Button className="bg-purple-600 hover:bg-purple-700">
              Réserver ma première course
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};