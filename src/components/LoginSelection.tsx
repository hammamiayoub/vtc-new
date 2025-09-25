import React from 'react';
import { ArrowLeft, Users } from 'lucide-react';
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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-lg overflow-hidden max-w-3xl w-full">
        <div className="p-10">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-8 transition-colors group"
          >
            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            Retour
          </button>

        {/*   <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gray-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <Users size={36} className="text-gray-700" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-3 tracking-tight">
              Connexion
            </h1>
            <p className="text-gray-600 text-lg">
              Choisissez votre type de compte
            </p>
          </div> */}

          <div className="grid md:grid-cols-2 gap-8">
            {/* Connexion Chauffeur */}
            <div className="border border-gray-200 rounded-2xl p-8 hover:border-gray-400 hover:shadow-lg transition-all duration-200 cursor-pointer group"
                 onClick={onDriverLogin}>
              <div className="text-center">
                <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-gray-200 transition-colors">
                  <Users size={36} className="text-gray-700" />
                </div>
                <h3 className="text-2xl font-semibold text-gray-900 mb-3">
                  Espace Chauffeur
                </h3>
                <p className="text-gray-600 mb-8 leading-relaxed">
                  Accédez à votre tableau de bord chauffeur pour gérer votre compte
                </p>
                <Button 
                  className="w-full bg-black hover:bg-gray-900 text-lg py-3"
                  onClick={onDriverLogin}
                >
                  Connexion chauffeur
                </Button>
              </div>
            </div>

            {/* Connexion Client */}
            <div className="border border-gray-200 rounded-2xl p-8 hover:border-gray-400 hover:shadow-lg transition-all duration-200 cursor-pointer group"
                 onClick={onClientLogin}>
              <div className="text-center">
                <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-gray-200 transition-colors">
                  <Users size={36} className="text-gray-700" />
                </div>
                <h3 className="text-2xl font-semibold text-gray-900 mb-3">
                  Espace Client
                </h3>
                <p className="text-gray-600 mb-8 leading-relaxed">
                  Accédez à votre espace personnel pour réserver et gérer vos courses
                </p>
                <Button 
                  className="w-full bg-black hover:bg-gray-900 text-lg py-3 whitespace-nowrap"
                  onClick={onClientLogin}
                >
                  Connexion client
                </Button>
              </div>
            </div>
          </div>

          <div className="mt-10 text-center">
            <p className="text-gray-600">
              Pas encore de compte ?{' '}
              <span className="text-gray-900 font-medium">Chauffeur</span> ou{' '}
              <span className="text-gray-900 font-medium">Client</span> - 
              Créez votre compte depuis la page d'accueil
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};