import React, { useState } from 'react';
import { useEffect } from 'react';
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
import { PrivacyPolicy } from './components/PrivacyPolicy';
import { supabase } from './lib/supabase';

type View = 'home' | 'signup' | 'login' | 'dashboard' | 'admin' | 'admin-dashboard' | 'client-signup' | 'login-selection' | 'driver-login' | 'client-login' | 'client-dashboard' | 'privacy-policy';

function App() {
  const [currentView, setCurrentView] = useState<View>('home');
  const [isLoading, setIsLoading] = useState(true);
  const [userType, setUserType] = useState<'driver' | 'client' | 'admin' | null>(null);

  useEffect(() => {
    // Vérifier la session existante au chargement
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Erreur lors de la vérification de session:', error);
          setIsLoading(false);
          return;
        }

        if (session?.user) {
          console.log('Session trouvée:', session.user.id);
          
          // Vérifier le type d'utilisateur
          const userId = session.user.id;
          
          // Vérifier si c'est un admin
          const { data: adminData } = await supabase
            .from('admin_users')
            .select('*')
            .eq('id', userId)
            .limit(1);
          
          if (adminData && adminData.length > 0) {
            setUserType('admin');
            setCurrentView('admin-dashboard');
            setIsLoading(false);
            return;
          }
          
          // Vérifier si c'est un chauffeur
          const { data: driverData } = await supabase
            .from('drivers')
            .select('*')
            .eq('id', userId)
            .limit(1);
          
          if (driverData && driverData.length > 0) {
            setUserType('driver');
            setCurrentView('dashboard');
            setIsLoading(false);
            return;
          }
          
          // Vérifier si c'est un client
          const { data: clientData } = await supabase
            .from('clients')
            .select('*')
            .eq('id', userId)
            .limit(1);
          
          if (clientData && clientData.length > 0) {
            setUserType('client');
            setCurrentView('client-dashboard');
            setIsLoading(false);
            return;
          }
          
          // Si aucun type trouvé, déconnecter
          console.log('Type d\'utilisateur non trouvé, déconnexion...');
          await supabase.auth.signOut();
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error('Erreur lors de la vérification de session:', error);
        setIsLoading(false);
      }
    };

    checkSession();

    // Écouter les changements d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Changement d\'auth:', event, session?.user?.id);
        
        if (event === 'SIGNED_OUT' || !session) {
          setUserType(null);
          setCurrentView('home');
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUserType(null);
    setCurrentView('home');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

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
            onLoginSuccess={() => {
              setUserType('driver');
              setCurrentView('dashboard');
            }}
          />
        );
      case 'client-login':
        return (
          <ClientLogin 
            onBack={() => setCurrentView('home')} 
            onSignup={() => setCurrentView('client-signup')}
            onLoginSuccess={() => {
              setUserType('client');
              setCurrentView('client-dashboard');
            }}
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
        return <DriverDashboard onLogout={handleLogout} />;
      case 'client-dashboard':
        return <ClientDashboard onLogout={handleLogout} />;
      case 'admin':
        return (
          <AdminLogin 
            onBack={() => setCurrentView('home')} 
            onLoginSuccess={() => {
              setUserType('admin');
              setCurrentView('admin-dashboard');
            }}
          />
        );
      case 'admin-dashboard':
        return <AdminDashboard onLogout={handleLogout} />;
      case 'privacy-policy':
        return <PrivacyPolicy onBack={() => setCurrentView('home')} />;
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
      {(currentView === 'home' || currentView === 'admin') && (
        <Header currentView={currentView} onViewChange={setCurrentView} />
      )}
      {renderContent()}
    </div>
  );
}

export default App;