import React, { useState } from 'react';
import { Header } from './components/Header';
import { HomePage } from './components/HomePage';
import { DriverSignup } from './components/DriverSignup';
import { LoginPage } from './components/LoginPage';
import { DriverDashboard } from './components/DriverDashboard';
import { AdminLogin } from './components/AdminLogin';
import { AdminDashboard } from './components/AdminDashboard';

type View = 'home' | 'signup' | 'login' | 'dashboard' | 'admin' | 'admin-dashboard';

function App() {
  const [currentView, setCurrentView] = useState<View>('home');

  const renderContent = () => {
    switch (currentView) {
      case 'signup':
        return <DriverSignup onBack={() => setCurrentView('home')} />;
      case 'login':
        return (
          <LoginPage 
            onBack={() => setCurrentView('home')} 
            onSignup={() => setCurrentView('signup')}
            onLoginSuccess={() => setCurrentView('dashboard')}
          />
        );
      case 'dashboard':
        return <DriverDashboard onLogout={() => setCurrentView('home')} />;
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
            onClientSignup={() => setCurrentView('client-signup')}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {(currentView === 'home' || currentView === 'admin') && (
        <Header currentView={currentView} onViewChange={setCurrentView} />
      )}
      {renderContent()}
    </div>
  );
}

export default App;