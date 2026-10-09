import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Car, MapPin, LogIn } from 'lucide-react';
import { Button } from './ui/Button';
import { useLocale } from '../i18n/locale';

interface LoginSelectionProps {
  onBack: () => void;
  onDriverLogin: () => void;
  onClientLogin: () => void;
}

export const LoginSelection: React.FC<LoginSelectionProps> = ({
  onBack,
  onDriverLogin,
  onClientLogin,
}) => {
  const navigate = useNavigate();
  const { locale, href } = useLocale();
  const en = locale === 'en';

  return (
    <div className="min-h-[100dvh] bg-gray-50 flex items-start sm:items-center justify-center p-4 sm:p-6 py-6 overflow-y-auto">
      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-lg overflow-hidden max-w-3xl w-full my-auto">
        <div className="p-5 sm:p-8 lg:p-10">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 sm:mb-8 transition-colors group"
          >
            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            {en ? 'Back' : 'Retour'}
          </button>

          <div className="text-center mb-8">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6">
              <LogIn size={32} className="text-gray-700" />
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2 sm:mb-3 tracking-tight">
              {en ? 'Log in' : 'Connexion'}
            </h1>
            <p className="text-gray-600 text-base sm:text-lg">
              {en ? 'Choose your account type to open your space' : 'Choisissez votre type de compte pour accéder à votre espace'}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 sm:gap-8">
            <div
              className="border border-gray-200 rounded-2xl p-6 sm:p-8 hover:border-gray-400 hover:shadow-lg transition-all duration-200 cursor-pointer group"
              onClick={onClientLogin}
            >
              <div className="text-center">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6 group-hover:bg-gray-200 transition-colors">
                  <MapPin size={32} className="text-gray-700" />
                </div>
                <h3 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-2 sm:mb-3">
                  {en ? 'Rider space' : 'Espace Client'}
                </h3>
                <p className="text-gray-600 mb-6 sm:mb-8 leading-relaxed text-sm sm:text-base">
                  {en ? 'Book and manage your private rides in Tunisia' : 'Réservez et gérez vos courses VTC en Tunisie'}
                </p>
                <Button
                  className="w-full bg-black hover:bg-gray-800 text-base sm:text-lg py-3"
                  onClick={onClientLogin}
                >
                  {en ? 'Rider login' : 'Connexion client'}
                </Button>
              </div>
            </div>

            <div
              className="border border-gray-200 rounded-2xl p-6 sm:p-8 hover:border-gray-400 hover:shadow-lg transition-all duration-200 cursor-pointer group"
              onClick={onDriverLogin}
            >
              <div className="text-center">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6 group-hover:bg-gray-200 transition-colors">
                  <Car size={32} className="text-gray-700" />
                </div>
                <h3 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-2 sm:mb-3">
                  {en ? 'Driver space' : 'Espace Chauffeur'}
                </h3>
                <p className="text-gray-600 mb-6 sm:mb-8 leading-relaxed text-sm sm:text-base">
                  {en ? 'Manage your rides, availability and vehicles' : 'Gérez vos courses, disponibilités et véhicules'}
                </p>
                <Button
                  className="w-full bg-black hover:bg-gray-800 text-base sm:text-lg py-3"
                  onClick={onDriverLogin}
                >
                  {en ? 'Driver login' : 'Connexion chauffeur'}
                </Button>
              </div>
            </div>
          </div>

          <div className="mt-8 sm:mt-10 text-center space-y-2">
            <p className="text-gray-600 text-sm sm:text-base">
              {en ? 'No account yet?' : 'Pas encore de compte ?'}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6">
              <button
                type="button"
                onClick={() => navigate(href('/client-signup'))}
                className="text-gray-900 hover:underline font-medium text-sm sm:text-base"
              >
                {en ? 'Rider signup' : 'Inscription client'}
              </button>
              <span className="hidden sm:inline text-gray-300">|</span>
              <button
                type="button"
                onClick={() => navigate(href('/signup'))}
                className="text-gray-900 hover:underline font-medium text-sm sm:text-base"
              >
                {en ? 'Become a driver' : 'Devenir chauffeur'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
