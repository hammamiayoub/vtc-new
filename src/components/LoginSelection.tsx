import React from 'react';
import { Car, MapPin, ArrowLeft, Users } from 'lucide-react';
import { Button } from './ui/Button';

interface LoginSelectionProps {
  onBack: () => void;
  onDriverLogin: () => void;
  onClientLogin: () => void;
}

export const LoginSelection: React.FC<LoginSelectionProps> = ({ 
  onBack, 
  onDriverLogin, 
  onClientLogin 
}) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden max-w-2xl w-full">
        <div className="p-8">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 hover:text-blue-600 mb-8 transition-colors group"
          >
            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            Retour
          </button>

          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users size={32} className="text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Connexion
            </h1>
            <p className="text-gray-600">
              Choisissez votre type de compte
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Connexion Chauffeur */}
            <div className="border border-gray-200 rounded-xl p-6 hover:border-blue-300 hover:shadow-md transition-all duration-200 cursor-pointer group"
                 onClick={onDriverLogin}>
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-blue-200 transition-colors">
                  <Car size={32} className="text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Espace Chauffeur
                </h3>
                <p className="text-gray-600 mb-6 text-sm">
                  Accédez à votre tableau de bord chauffeur pour gérer vos courses et disponibilités
                </p>
                <Button 
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  onClick={onDriverLogin}
                >
                  Connexion chauffeur
                </Button>
              </div>
            </div>

            {/* Connexion Client */}
            <div className="border border-gray-200 rounded-xl p-6 hover:border-purple-300 hover:shadow-md transition-all duration-200 cursor-pointer group"
                 onClick={onClientLogin}>
              <div className="text-center">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-purple-200 transition-colors">
                  <MapPin size={32} className="text-purple-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Espace Client
                </h3>
                <p className="text-gray-600 mb-6 text-sm">
                  Accédez à votre espace personnel pour réserver et gérer vos courses
                </p>
                <Button 
                  className="w-full bg-purple-600 hover:bg-purple-700"
                  onClick={onClientLogin}
                >
                  Connexion client
                </Button>
              </div>
            </div>
          </div>

          <div className="mt-8 text-center">
            <p className="text-gray-600 text-sm">
              Pas encore de compte ?{' '}
              <span className="text-blue-600 font-medium">Chauffeur</span> ou{' '}
              <span className="text-purple-600 font-medium">Client</span> - 
              Créez votre compte depuis la page d'accueil
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};