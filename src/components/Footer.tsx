import React from 'react';
import { Heart, Shield, FileText, Smartphone, UserPlus, Car } from 'lucide-react';
import { Link } from 'react-router-dom';

interface FooterProps {
  onPrivacyPolicyClick?: () => void;
  onTermsClick?: () => void;
}

export const Footer: React.FC<FooterProps> = () => {
  return (
    <footer className="bg-black text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid md:grid-cols-5 gap-8">
          {/* Logo et description */}
          <div className="md:col-span-2">
            <h3 className="text-2xl font-bold mb-4">TuniDrive</h3>
            <p className="text-gray-300 mb-4 max-w-md">
              Votre plateforme de transport privé en Tunisie. 
              Des trajets fiables avec des chauffeurs professionnels.
            </p>
            <div className="flex items-center gap-2 text-gray-400">
              <span>Fait avec</span>
              <Heart size={16} className="text-red-500" />
              <span>en Tunisie</span>
            </div>
          </div>

          {/* Inscription */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Inscription</h4>
            <ul className="space-y-2 text-gray-300">
              <li>
                <Link 
                  to="/signup" 
                  className="hover:text-white transition-colors flex items-center gap-2"
                >
                  <Car size={16} />
                  Devenir chauffeur
                </Link>
              </li>
              <li>
                <Link 
                  to="/client-signup" 
                  className="hover:text-white transition-colors flex items-center gap-2"
                >
                  <UserPlus size={16} />
                  Inscription client
                </Link>
              </li>
            </ul>
          </div>

          {/* Application mobile */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Application mobile</h4>
            <ul className="space-y-2 text-gray-300">
              <li>
                <a 
                  href="https://play.google.com/store/apps/details?id=com.tunidrive.mobile"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors flex items-center gap-2"
                >
                  <Smartphone size={16} />
                  Installer sur Android
                </a>
              </li>
            </ul>
          </div>

          {/* Légal */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Légal</h4>
            <ul className="space-y-2 text-gray-300">
              <li>
                <Link 
                  to="/terms-of-service" 
                  className="hover:text-white transition-colors flex items-center gap-2"
                >
                  <FileText size={16} />
                  Conditions d'utilisation
                </Link>
              </li>
              <li>
                <Link 
                  to="/privacy-policy" 
                  className="hover:text-white transition-colors flex items-center gap-2"
                >
                  <Shield size={16} />
                  Politique de confidentialité
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Ligne de séparation */}
        <div className="border-t border-gray-700 mt-8 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">
              © {new Date().getFullYear()} TuniDrive. Tous droits réservés.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};
