import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UserPlus,
  LogIn,
  MapPin,
  Menu,
  X,
  Package,
  BookOpen,
} from 'lucide-react';
import { prefetchRoute } from '../utils/prefetchRoute';

interface HeaderProps {
  currentView:
    | 'home'
    | 'signup'
    | 'login'
    | 'login-selection'
    | 'driver-login'
    | 'client-signup'
    | 'client-login'
    | 'parcel-transport'
    | 'blog'
    | 'about'
    | 'admin';
  onViewChange?: (view: 'home' | 'signup' | 'login' | 'client-signup' | 'client-login' | 'parcel-transport' | 'blog' | 'about' | 'admin') => void;
}

const isLoginView = (view: HeaderProps['currentView']) =>
  view === 'login' ||
  view === 'login-selection' ||
  view === 'client-login' ||
  view === 'driver-login';

const navLinkClass = (active: boolean) =>
  `text-sm font-medium transition-colors ${
    active ? 'text-white' : 'text-gray-300 hover:text-white'
  }`;

export const Header: React.FC<HeaderProps> = ({ currentView }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const navigate = useNavigate();

  const goToBooking = () => {
    if (window.location.pathname === '/') {
      document.getElementById('reserver')?.scrollIntoView({ behavior: 'smooth' });
    } else {
      navigate('/#reserver');
    }
    setIsMobileMenuOpen(false);
  };

  useEffect(() => {
    if (!isMobileMenuOpen) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isMobileMenuOpen]);

  return (
    <header className="bg-black border-b border-gray-800 relative sticky top-0 z-50">
      <div className="page-container">
        <div className="flex justify-between items-center h-16 gap-4">
          <button
            type="button"
            onClick={() => { navigate('/'); setIsMobileMenuOpen(false); }}
            className="text-xl font-bold text-white tracking-tight truncate min-w-0 hover:opacity-90 transition-opacity"
          >
            TuniDrive
          </button>

          <nav className="hidden lg:flex items-center gap-5 xl:gap-6">
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
              onClick={() => { navigate('/client-signup'); }}
              onMouseEnter={() => prefetchRoute('/client-signup')}
              onFocus={() => prefetchRoute('/client-signup')}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-300 hover:text-white transition-colors"
            >
              <UserPlus size={16} />
              Créer un compte
            </button>

            <button
              onClick={() => { navigate('/login'); }}
              onMouseEnter={() => prefetchRoute('/login')}
              onFocus={() => prefetchRoute('/login')}
              className={navLinkClass(isLoginView(currentView))}
            >
              <LogIn size={16} className="inline mr-1 -mt-0.5" />
              Connexion
            </button>

            <button
              onClick={goToBooking}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-black text-sm font-semibold hover:bg-gray-200 transition-colors"
            >
              <MapPin size={18} />
              <span>Réserver</span>
            </button>
          </nav>

          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 text-gray-300 hover:text-white transition-colors flex-shrink-0"
            aria-label={isMobileMenuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {isMobileMenuOpen && (
          <div className="lg:hidden absolute top-full left-0 right-0 bg-black border-t border-gray-800 shadow-lg z-50 max-h-[calc(100dvh-4rem)] overflow-y-auto overscroll-contain">
            <div className="px-4 py-4 space-y-1">
              <button
                onClick={goToBooking}
                className="w-full flex items-center gap-3 px-4 py-3 text-left text-black bg-white hover:bg-gray-200 rounded-lg transition-colors font-medium"
              >
                <MapPin size={20} />
                <span>Réserver une course</span>
              </button>

              <button
                onClick={() => { navigate('/client-signup'); setIsMobileMenuOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 text-left text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
              >
                <UserPlus size={20} />
                <span>Créer un compte client</span>
              </button>

              <button
                onClick={() => { navigate('/login'); setIsMobileMenuOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 text-left text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
              >
                <LogIn size={20} />
                <span>Connexion</span>
              </button>

              <button
                onClick={() => { navigate('/driver-login'); setIsMobileMenuOpen(false); }}
                onMouseEnter={() => prefetchRoute('/driver-login')}
                className="w-full flex items-center gap-3 px-4 py-3 text-left text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
              >
                <LogIn size={20} />
                <span>Connexion chauffeur</span>
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
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
