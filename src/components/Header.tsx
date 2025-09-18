import React from 'react';
import { Car, UserPlus, LogIn, Shield, MapPin, Menu, X } from 'lucide-react';

interface HeaderProps {
  currentView: 'home' | 'signup' | 'login' | 'admin' | 'client-signup';
  onViewChange: (view: 'home' | 'signup' | 'login' | 'admin' | 'client-signup') => void;
}

export const Header: React.FC<HeaderProps> = ({ currentView, onViewChange }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const handleNavigation = (view: 'home' | 'signup' | 'login' | 'admin' | 'client-signup') => {
    onViewChange(view);
    setIsMobileMenuOpen(false); // Fermer le menu après navigation
  };

  return (
    <header className="bg-black border-b border-gray-800 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <div 
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => handleNavigation('home')}
          >
            <h1 className="text-3xl font-bold text-white tracking-tight">TuniDrive</h1>
          </div>
          
          <nav className="hidden md:flex items-center gap-2">
            <button
              onClick={() => handleNavigation('signup')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-200 font-medium ${
                currentView === 'signup'
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-300 hover:text-white hover:bg-gray-800'
              }`}
            >
              <UserPlus size={20} />
              <span className="hidden sm:inline">Devenir chauffeur</span>
            </button>
            
            <button
              onClick={() => handleNavigation('client-login')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl transition-all duration-200 font-medium ${
                currentView === 'client-login' || currentView === 'client-signup'
                  ? 'bg-white text-black'
                  : 'bg-white text-black hover:bg-gray-200'
              }`}
            >
              <MapPin size={20} />
              <span className="hidden sm:inline">Réserver une course</span>
            </button>
            
            <button
              onClick={() => handleNavigation('login')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-200 font-medium ${
                currentView === 'login'
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-300 hover:text-white hover:bg-gray-800'
              }`}
            >
              <LogIn size={20} />
              <span className="hidden sm:inline">Connexion</span>
            </button>
            
            <button
              onClick={() => handleNavigation('admin')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-200 font-medium ${
                currentView === 'admin'
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-300 hover:text-white hover:bg-gray-800'
              }`}
            >
              <Shield size={20} />
              <span className="hidden sm:inline">Admin</span>
            </button>
          </nav>
          
          {/* Mobile menu button */}
          <button 
            onClick={toggleMobileMenu}
            className="md:hidden p-2 text-gray-300 hover:text-white transition-colors"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden absolute top-full left-0 right-0 bg-black border-t border-gray-800 shadow-lg z-50">
            <div className="px-4 py-4 space-y-2">
              <button
                onClick={() => handleNavigation('client-login')}
                className="w-full flex items-center gap-3 px-4 py-3 text-left text-white hover:bg-gray-800 rounded-lg transition-colors"
              >
                <MapPin size={20} />
                <span>Réserver une course</span>
              </button>
              
              <button
                onClick={() => handleNavigation('signup')}
                className="w-full flex items-center gap-3 px-4 py-3 text-left text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
              >
                <UserPlus size={20} />
                <span>Devenir chauffeur</span>
              </button>
              
              <button
                onClick={() => handleNavigation('login')}
                className="w-full flex items-center gap-3 px-4 py-3 text-left text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
              >
                <LogIn size={20} />
                <span>Connexion</span>
              </button>
              
              <button
                onClick={() => handleNavigation('admin')}
                className="w-full flex items-center gap-3 px-4 py-3 text-left text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
              >
                <Shield size={20} />
                <span>Administration</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};