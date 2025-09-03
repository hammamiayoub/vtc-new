import React from 'react';
import { Car, UserPlus, LogIn, Shield, MapPin, Menu } from 'lucide-react';

interface HeaderProps {
  currentView: 'home' | 'signup' | 'login' | 'admin' | 'client-signup';
  onViewChange: (view: 'home' | 'signup' | 'login' | 'admin' | 'client-signup') => void;
}

export const Header: React.FC<HeaderProps> = ({ currentView, onViewChange }) => {
  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <div 
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => onViewChange('home')}
          >
            <div className="p-2 bg-black rounded-xl">
              <Car size={28} className="text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">MyRide</h1>
          </div>
          
          <nav className="hidden md:flex items-center gap-2">
            <button
              onClick={() => onViewChange('signup')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-200 font-medium ${
                currentView === 'signup'
                  ? 'bg-gray-100 text-gray-900'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <UserPlus size={20} />
              <span className="hidden sm:inline">Devenir chauffeur</span>
            </button>
            
            <button
              onClick={() => onViewChange('client-login')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl transition-all duration-200 font-medium ${
                currentView === 'client-login' || currentView === 'client-signup'
                  ? 'bg-black text-white'
                  : 'bg-black text-white hover:bg-gray-800'
              }`}
            >
              <MapPin size={20} />
              <span className="hidden sm:inline">Réserver une course</span>
            </button>
            
            <button
              onClick={() => onViewChange('login')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-200 font-medium ${
                currentView === 'login'
                  ? 'bg-gray-100 text-gray-900'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <LogIn size={20} />
              <span className="hidden sm:inline">Connexion</span>
            </button>
            
            <button
              onClick={() => onViewChange('admin')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-200 font-medium ${
                currentView === 'admin'
                  ? 'bg-gray-100 text-gray-900'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <Shield size={20} />
              <span className="hidden sm:inline">Admin</span>
            </button>
          </nav>
          
          {/* Mobile menu button */}
          <button className="md:hidden p-2 text-gray-600 hover:text-gray-900">
            <Menu size={24} />
          </button>
        </div>
      </div>
    </header>
  );
};