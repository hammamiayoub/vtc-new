import React from 'react';
import { Heart, Shield, FileText, UserPlus, Car, Mail, MessageCircle, Facebook, Instagram } from 'lucide-react';
import { Link } from 'react-router-dom';

interface FooterProps {
  onPrivacyPolicyClick?: () => void;
  onTermsClick?: () => void;
}

export const Footer: React.FC<FooterProps> = () => {
  return (
    <footer className="bg-black text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid md:grid-cols-6 gap-8">
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
                  CGU
                </Link>
              </li>
              <li>
                <Link 
                  to="/privacy-policy" 
                  className="hover:text-white transition-colors flex items-center gap-2"
                >
                  <Shield size={16} />
                  RGPD
                </Link>
              </li>
            </ul>
          </div>

          {/* Application mobile */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Application mobile</h4>
            <div className="space-y-3">
              <a 
                href="https://play.google.com/store/apps/details?id=com.tunidrive.mobile"
                target="_blank"
                rel="noopener noreferrer"
                className="block hover:opacity-80 transition-opacity"
              >
                <img 
                  src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg" 
                  alt="Disponible sur Google Play"
                  className="h-10 w-auto"
                />
              </a>
              <a 
                href="https://apps.apple.com/us/app/tunidrive/id6753982765"
                target="_blank"
                rel="noopener noreferrer"
                className="block hover:opacity-80 transition-opacity"
              >
                <img 
                  src="https://upload.wikimedia.org/wikipedia/commons/3/3c/Download_on_the_App_Store_Badge.svg" 
                  alt="Télécharger sur l'App Store"
                  className="h-10 w-auto"
                />
              </a>
            </div>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Contact</h4>
            <ul className="space-y-2 text-gray-300">
              <li>
                <a
                  href="https://wa.me/21628528477"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors flex items-center gap-2"
                >
                  <MessageCircle size={14} />
                  WhatsApp
                </a>
              </li>
              <li>
                <a
                  href="mailto:support@tunidrive.net"
                  className="hover:text-white transition-colors flex items-center gap-2"
                >
                  <Mail size={16} />
                  support@tunidrive.net
                </a>
              </li>
            </ul>
          </div>

          {/* Légal */}
         
        </div>

        {/* Ligne de séparation */}
        <div className="border-t border-gray-700 mt-8 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-400 text-sm">
              © {new Date().getFullYear()} TuniDrive. Tous droits réservés.
            </p>
            <div className="flex items-center gap-4">
              <a
                href="https://www.facebook.com/profile.php?id=61581866699494"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white transition-colors"
                aria-label="Facebook"
              >
                <Facebook size={20} />
              </a>
              <a
                href="https://www.instagram.com/tunidrivenet/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white transition-colors"
                aria-label="Instagram"
              >
                <Instagram size={20} />
              </a>
              <a
                href="https://www.tiktok.com/@tunidrivenet"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white transition-colors"
                aria-label="TikTok"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

