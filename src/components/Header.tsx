import React from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, LogIn, MapPin, Menu, X, Package, BookOpen } from 'lucide-react';
import { prefetchRoute } from '../utils/prefetchRoute';

interface HeaderProps {
  currentView: 'home' | 'signup' | 'login' | 'client-signup' | 'client-login' | 'parcel-transport' | 'blog' | 'about' | 'admin';
  onViewChange?: (view: 'home' | 'signup' | 'login' | 'client-signup' | 'client-login' | 'parcel-transport' | 'blog' | 'about' | 'admin') => void;
}

const navLinkClass = (active: boolean) =>
  `text-sm font-medium transition-colors ${
    active ? 'text-white' : 'text-gray-300 hover:text-white'
  }`;

export const Header: React.FC<HeaderProps> = ({ currentView }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const navigate = useNavigate();

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <header className="bg-black border-b border-gray-800 relative sticky top-0 z-50">
      <div className="page-container">
        <div className="flex justify-between items-center h-16">
          <div
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => { navigate('/'); setIsMobileMenuOpen(false); }}
          >
            <span className="text-2xl font-bold text-white tracking-tight">TuniDrive</span>
          </div>

          <nav className="hidden md:flex items-center gap-8">
            <button
              onClick={() => { navigate('/a-propos'); }}
              onMouseEnter={() => prefetchRoute('/a-propos')}
              onFocus={() => prefetchRoute('/a-propos')}
              className={navLinkClass(currentView === 'about')}
            >
              À propos
            </button>

            <button
              onClick={() => { navigate('/blog'); }}
              onMouseEnter={() => prefetchRoute('/blog')}
              onFocus={() => prefetchRoute('/blog')}
              className={navLinkClass(currentView === 'blog')}
            >
              Blog
            </button>

            <button
              onClick={() => { navigate('/transport-colis-europe-tunisie'); }}
              onMouseEnter={() => prefetchRoute('/transport-colis-europe-tunisie')}
              onFocus={() => prefetchRoute('/transport-colis-europe-tunisie')}
              className={navLinkClass(currentView === 'parcel-transport')}
            >
              Transport colis
            </button>

            <button
              onClick={() => { navigate('/signup'); }}
              onMouseEnter={() => prefetchRoute('/signup')}
              onFocus={() => prefetchRoute('/signup')}
              className={navLinkClass(currentView === 'signup')}
            >
              Devenir chauffeur
            </button>

            <button
              onClick={() => { navigate('/login'); }}
              onMouseEnter={() => prefetchRoute('/login')}
              onFocus={() => prefetchRoute('/login')}
              className={navLinkClass(currentView === 'login')}
            >
              Connexion
            </button>

            <button
              onClick={() => { navigate('/client-login'); }}
              onMouseEnter={() => prefetchRoute('/client-login')}
              onFocus={() => prefetchRoute('/client-login')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-black text-sm font-semibold hover:bg-gray-200 transition-colors"
            >
              <MapPin size={18} />
              <span>Réserver</span>
            </button>
          </nav>

          <button
            onClick={toggleMobileMenu}
            className="md:hidden p-2 text-gray-300 hover:text-white transition-colors"
            aria-label={isMobileMenuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {isMobileMenuOpen && (
          <div className="md:hidden absolute top-full left-0 right-0 bg-black border-t border-gray-800 shadow-lg z-50">
            <div className="px-4 py-4 space-y-1">
              <button
                onClick={() => { navigate('/client-login'); setIsMobileMenuOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 text-left text-black bg-white hover:bg-gray-200 rounded-lg transition-colors font-medium"
              >
                <MapPin size={20} />
                <span>Réserver une course</span>
              </button>

              <button
                onClick={() => { navigate('/a-propos'); setIsMobileMenuOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 text-left text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
              >
                <span>À propos</span>
              </button>

              <button
                onClick={() => { navigate('/blog'); setIsMobileMenuOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 text-left text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
              >
                <BookOpen size={20} />
                <span>Blog</span>
              </button>

              <button
                onClick={() => { navigate('/transport-colis-europe-tunisie'); setIsMobileMenuOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 text-left text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
              >
                <Package size={20} />
                <span>Transport colis Europe ↔ Tunisie</span>
              </button>

              <button
                onClick={() => { navigate('/signup'); setIsMobileMenuOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 text-left text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
              >
                <UserPlus size={20} />
                <span>Devenir chauffeur</span>
              </button>

              <button
                onClick={() => { navigate('/login'); setIsMobileMenuOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 text-left text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
              >
                <LogIn size={20} />
                <span>Connexion</span>
              </button>

              <div className="pt-4 border-t border-gray-800">
                <p className="text-gray-400 text-sm mb-3 px-4">Télécharger l'app</p>
                <div className="flex gap-3 px-4">
                  <a
                    href="https://play.google.com/store/apps/details?id=com.tunidrive.mobile"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:opacity-80 transition-opacity"
                  >
                    <img
                      src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg"
                      alt="Disponible sur Google Play"
                      className="h-8 w-auto"
                    />
                  </a>
                  <a
                    href="https://apps.apple.com/fr/app/tunidrive/id6753982765"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:opacity-80 transition-opacity"
                  >
                    <img
                      src="https://upload.wikimedia.org/wikipedia/commons/3/3c/Download_on_the_App_Store_Badge.svg"
                      alt="Télécharger sur l'App Store"
                      className="h-8 w-auto"
                    />
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
