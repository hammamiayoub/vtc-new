import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPin,
  Menu,
  X,
  Package,
  BookOpen,
  Users,
  Car,
  Info,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { prefetchRoute } from '../utils/prefetchRoute';
import { focusHomeBookingForm } from '../utils/focusHomeBooking';
import { LanguageSwitch, useLocale } from '../i18n/locale';
import { cn } from '../utils/cn';

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
    | 'group-travel'
    | 'vtc-tunisie'
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
  cn(
    'focus-ring rounded-full px-3 py-2 text-sm font-medium transition-colors',
    active ? 'bg-white/10 text-white' : 'text-gray-300 hover:text-white hover:bg-white/10'
  );

export const Header: React.FC<HeaderProps> = ({ currentView }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { logicalPath, href, locale } = useLocale();
  const en = locale === 'en';

  const go = (path: string) => {
    setIsMobileMenuOpen(false);
    setIsMoreOpen(false);
    navigate(href(path));
  };

  const goToBooking = () => {
    setIsMobileMenuOpen(false);
    if (logicalPath === '/') {
      focusHomeBookingForm();
      return;
    }
    navigate(href('/#reserver'));
  };

  const prefetchProps = (path: string) => ({
    onMouseEnter: () => prefetchRoute(path),
    onFocus: () => prefetchRoute(path),
  });

  useEffect(() => {
    if (!isMobileMenuOpen) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isMobileMenuOpen]);

  // Menu « Plus » : fermeture au clic extérieur et avec Échap
  useEffect(() => {
    if (!isMoreOpen) return;

    const onPointerDown = (e: MouseEvent) => {
      if (!moreRef.current?.contains(e.target as Node)) setIsMoreOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMoreOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isMoreOpen]);

  const moreActive = currentView === 'about' || currentView === 'blog';

  const mobileRowClass =
    'focus-ring w-full flex items-center gap-4 px-4 min-h-[56px] text-left text-lg font-medium text-white hover:bg-white/10 rounded-xl transition-colors';

  const mobileLinks = [
    { path: '/transport-colis-europe-tunisie', icon: Package, label: en ? 'Parcels Europe ↔ Tunisia' : 'Colis Europe ↔ Tunisie' },
    { path: '/transport-groupes-tunisie', icon: Users, label: en ? 'Groups in Tunisia' : 'Groupes en Tunisie' },
    { path: '/signup', icon: Car, label: en ? 'Become a driver' : 'Devenir chauffeur' },
    { path: '/blog', icon: BookOpen, label: 'Blog' },
    { path: '/a-propos', icon: Info, label: en ? 'About' : 'À propos' },
  ];

  return (
    <header className="bg-black border-b border-gray-800 sticky top-0 z-50">
      <div className="page-container">
        <div className="flex justify-between items-center h-16 gap-4">
          <div className="flex items-center gap-6 min-w-0">
            <button
              type="button"
              onClick={() => go('/')}
              className="focus-ring rounded-md text-xl font-bold text-white tracking-tight truncate min-w-0 hover:opacity-90 transition-opacity"
            >
              TuniDrive
            </button>

            <nav className="hidden lg:flex items-center gap-1" aria-label={en ? 'Main' : 'Principale'}>
              <button onClick={goToBooking} className={navLinkClass(false)}>
                {en ? 'Ride' : 'Course'}
              </button>

              <button
                onClick={() => go('/transport-colis-europe-tunisie')}
                {...prefetchProps('/transport-colis-europe-tunisie')}
                className={navLinkClass(currentView === 'parcel-transport')}
              >
                {en ? 'Parcels' : 'Colis'}
              </button>

              <button
                onClick={() => go('/transport-groupes-tunisie')}
                {...prefetchProps('/transport-groupes-tunisie')}
                className={navLinkClass(currentView === 'group-travel')}
              >
                {en ? 'Groups' : 'Groupes'}
              </button>

              <button
                onClick={() => go('/signup')}
                {...prefetchProps('/signup')}
                className={navLinkClass(currentView === 'signup')}
              >
                {en ? 'Drive with us' : 'Devenir chauffeur'}
              </button>

              <div ref={moreRef} className="relative">
                <button
                  type="button"
                  onClick={() => setIsMoreOpen((open) => !open)}
                  aria-haspopup="menu"
                  aria-expanded={isMoreOpen}
                  className={cn(navLinkClass(moreActive || isMoreOpen), 'inline-flex items-center gap-1')}
                >
                  {en ? 'More' : 'Plus'}
                  <ChevronDown
                    size={16}
                    aria-hidden="true"
                    className={cn('transition-transform', isMoreOpen && 'rotate-180')}
                  />
                </button>

                {isMoreOpen && (
                  <div
                    role="menu"
                    className="absolute left-0 top-full mt-2 w-48 overflow-hidden rounded-xl bg-white py-1 shadow-overlay animate-fade-in"
                  >
                    <button
                      role="menuitem"
                      onClick={() => go('/a-propos')}
                      {...prefetchProps('/a-propos')}
                      className="w-full px-4 py-3 text-left text-sm font-medium text-gray-900 hover:bg-gray-100 transition-colors"
                    >
                      {en ? 'About' : 'À propos'}
                    </button>
                    <button
                      role="menuitem"
                      onClick={() => go('/blog')}
                      {...prefetchProps('/blog')}
                      className="w-full px-4 py-3 text-left text-sm font-medium text-gray-900 hover:bg-gray-100 transition-colors"
                    >
                      Blog
                    </button>
                  </div>
                )}
              </div>
            </nav>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            <LanguageSwitch />

            <button
              onClick={() => go('/login')}
              {...prefetchProps('/login')}
              className={cn(navLinkClass(isLoginView(currentView)), 'hidden lg:inline-flex')}
            >
              {en ? 'Log in' : 'Connexion'}
            </button>

            <button
              onClick={() => go('/client-signup')}
              {...prefetchProps('/client-signup')}
              className="focus-ring hidden lg:inline-flex items-center rounded-full bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-gray-200 transition-colors"
            >
              {en ? 'Sign up' : 'Inscription'}
            </button>

            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="focus-ring touch-target lg:hidden flex items-center justify-center rounded-full text-gray-300 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0"
              aria-label={isMobileMenuOpen ? (en ? 'Close menu' : 'Fermer le menu') : (en ? 'Open menu' : 'Ouvrir le menu')}
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-x-0 top-16 bottom-0 z-50 flex flex-col bg-black animate-fade-in">
          <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 space-y-1">
            <button
              onClick={goToBooking}
              className="focus-ring w-full flex items-center justify-center gap-3 min-h-[56px] mb-3 rounded-full bg-white text-black text-lg font-semibold hover:bg-gray-200 transition-colors"
            >
              <MapPin size={20} aria-hidden="true" />
              {en ? 'Book a ride' : 'Réserver une course'}
            </button>

            {mobileLinks.map(({ path, icon: Icon, label }) => (
              <button
                key={path}
                onClick={() => go(path)}
                {...prefetchProps(path)}
                className={mobileRowClass}
              >
                <Icon size={22} className="text-gray-400" aria-hidden="true" />
                <span className="flex-1">{label}</span>
                <ChevronRight size={18} className="text-gray-600" aria-hidden="true" />
              </button>
            ))}
          </div>

          <div className="border-t border-gray-800 p-4 space-y-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <button
              onClick={() => go('/client-signup')}
              className="focus-ring w-full min-h-[52px] rounded-full bg-white text-black text-base font-semibold hover:bg-gray-200 transition-colors"
            >
              {en ? 'Create an account' : 'Créer un compte'}
            </button>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => go('/login')}
                className="focus-ring min-h-[52px] rounded-full border border-gray-600 text-white text-base font-semibold hover:bg-white/10 transition-colors"
              >
                {en ? 'Log in' : 'Connexion'}
              </button>
              <button
                onClick={() => go('/driver-login')}
                {...prefetchProps('/driver-login')}
                className="focus-ring min-h-[52px] rounded-full border border-gray-600 text-white text-base font-semibold hover:bg-white/10 transition-colors"
              >
                {en ? 'Driver login' : 'Espace chauffeur'}
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
