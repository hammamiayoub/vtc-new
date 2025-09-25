import React from 'react';
import { Heart, Shield, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';

interface FooterProps {
  onPrivacyPolicyClick?: () => void;
  onTermsClick?: () => void;
}

export const Footer: React.FC<FooterProps> = () => {
  return (
    <footer className="bg-black text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid md:grid-cols-4 gap-8">
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

          {/* Services */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Services</h4>
            <ul className="space-y-2 text-gray-300">
              <li>
                <Link 
                  to="/client-login" 
                  className="hover:text-white transition-colors"
                >
                  Réservation de courses
                </Link>
              </li>
              <li>
                <Link 
                  to="/driver-login" 
                  className="hover:text-white transition-colors"
                >
                  Devenir chauffeur
                </Link>
              </li>
              <li>
                <a 
                  href="mailto:support@tunidrive.net" 
                  className="hover:text-white transition-colors"
                >
                  Support client
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
            <div className="flex items-center gap-6 mt-4 md:mt-0">
              <a href="#" className="text-gray-400 hover:text-white transition-colors text-sm">
                Contact
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors text-sm">
                À propos
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors text-sm">
                FAQ
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};