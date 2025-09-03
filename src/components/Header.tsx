import React from 'react';
import { Car, UserPlus, LogIn, Shield } from 'lucide-react';

interface HeaderProps {
  currentView: 'home' | 'signup' | 'login' | 'admin';
  onViewChange: (view: 'home' | 'signup' | 'login' | 'admin') => void;
}

export const Header: React.FC<HeaderProps> = ({ currentView, onViewChange }) => {
  return (
    <header className="bg-white shadow-sm border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div 
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => onViewChange('home')}
          >
            <div className="p-2 bg-blue-600 rounded-lg group-hover:bg-blue-700 transition-colors">
              <Car size={24} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">DriveConnect</h1>
          </div>
          
          <nav className="flex items-center gap-4">
            <button
              onClick={() => onViewChange('signup')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                currentView === 'signup'
                  ? 'bg-blue-100 text-blue-700 font-medium'
                  : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
              }`}
            >
              <UserPlus size={18} />
              <span className="hidden sm:inline">Devenir chauffeur</span>
            </button>
            
            <button
              onClick={() => onViewChange('login')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                currentView === 'login'
                  ? 'bg-gray-100 text-gray-700 font-medium'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              <LogIn size={18} />
              <span className="hidden sm:inline">Connexion</span>
            </button>
            
            <button
              onClick={() => onViewChange('admin')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                currentView === 'admin'
                  ? 'bg-red-100 text-red-700 font-medium'
                  : 'text-gray-600 hover:text-red-600 hover:bg-red-50'
              }`}
            >
              <Shield size={18} />
              <span className="hidden sm:inline">Admin</span>
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
};