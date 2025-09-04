import React, { useState } from 'react';
import { Header } from './components/Header';
import { HomePage } from './components/HomePage';
import { DriverSignup } from './components/DriverSignup';
import { LoginPage } from './components/LoginPage';
import { DriverDashboard } from './components/DriverDashboard';
import { AdminLogin } from './components/AdminLogin';
import { AdminDashboard } from './components/AdminDashboard';
import { ClientSignup } from './components/ClientSignup';
import { LoginSelection } from './components/LoginSelection';
import { DriverLogin } from './components/DriverLogin';
import { ClientLogin } from './components/ClientLogin';
import { ClientDashboard } from './components/ClientDashboard';
import { AuthCallback } from './components/AuthCallback';

type View = 'home' | 'signup' | 'login' | 'dashboard' | 'admin' | 'admin-dashboard' | 'client-signup' | 'login-selection' | 'driver-login' | 'client-login' | 'client-dashboard' | 'auth-callback';

function App() {
  const [currentView, setCurrentView] = useState<View>('home');

  // Vérifier si nous sommes sur la page de callback OAuth
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (window.location.pathname === '/auth/callback' || urlParams.has('code')) {
      setCurrentView('auth-callback');
    }
  }, []);
  const renderContent = () => {
    switch (currentView) {
      case 'signup':
        return <DriverSignup onBack={() => setCurrentView('home')} />;
      case 'client-signup':
        return <ClientSignup onBack={() => setCurrentView('home')} />;
      case 'login-selection':
        return (
          <LoginSelection 
            onBack={() => setCurrentView('home')}
            onDriverLogin={() => setCurrentView('driver-login')}
            onClientLogin={() => setCurrentView('client-login')}
          />
        );
      case 'driver-login':
        return (
          <DriverLogin 
            onBack={() => setCurrentView('login-selection')} 
            onSignup={() => setCurrentView('signup')}
            onLoginSuccess={() => setCurrentView('dashboard')}
          />
        );
      case 'client-login':
        return (
          <ClientLogin 
            onBack={() => setCurrentView('home')} 
            onSignup={() => setCurrentView('client-signup')}
            onLoginSuccess={() => setCurrentView('client-dashboard')}
          />
        );
      case 'login':
        return (
          <LoginSelection 
            onBack={() => setCurrentView('home')}
            onDriverLogin={() => setCurrentView('driver-login')}
            onClientLogin={() => setCurrentView('client-login')}
          />
        );
      case 'dashboard':
        return <DriverDashboard onLogout={() => setCurrentView('home')} />;
      case 'client-dashboard':
        return <ClientDashboard onLogout={() => setCurrentView('home')} />;
      case 'auth-callback':
        return (
          <AuthCallback 
            onDriverSuccess={() => setCurrentView('dashboard')}
            onClientSuccess={() => setCurrentView('client-dashboard')}
            onError={() => setCurrentView('home')}
          />
        );
      case 'admin':
        return (
          <AdminLogin 
            onBack={() => setCurrentView('home')} 
            onLoginSuccess={() => setCurrentView('admin-dashboard')}
          />
        );
      case 'admin-dashboard':
        return <AdminDashboard onLogout={() => setCurrentView('home')} />;
      default:
        return (
          <HomePage 
            onGetStarted={() => setCurrentView('signup')}
            onClientLogin={() => setCurrentView('client-login')}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {(currentView === 'home' || currentView === 'admin') && currentView !== 'auth-callback' && (
        <Header currentView={currentView} onViewChange={setCurrentView} />
      )}
      {renderContent()}
    </div>
  );
}

export default App;