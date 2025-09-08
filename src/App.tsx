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
import { TermsOfService } from './components/TermsOfService';
import { supabase } from './lib/supabase';

type View = 'home' | 'signup' | 'login' | 'dashboard' | 'admin' | 'admin-dashboard' | 'client-signup' | 'login-selection' | 'driver-login' | 'client-login' | 'client-dashboard' | 'privacy-policy' | 'terms-of-service';

function App() {
  const [currentView, setCurrentView] = useState<View>('home');
  const [isLoading, setIsLoading] = useState(true);
  const [userType, setUserType] = useState<'driver' | 'client' | 'admin' | null>(null);

  useEffect(() => {
    // Vérifier la session existante au chargement
    const checkSession = async () => {
      console.log('🔍 Début de checkSession');
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        console.log('📋 Session récupérée:', !!session, error);
        
        if (error) {
          console.error('Erreur lors de la vérification de session:', error);
          setUserType(null);
          setCurrentView('home');
          setIsLoading(false);
          return;
        }

        if (session?.user) {
          console.log('👤 Utilisateur trouvé, vérification du type...');
          const userId = session.user.id;
          
          // Fonction helper pour vérifier le type d'utilisateur
          const checkUserType = async () => {
            // Vérifier si c'est un admin
            const { data: adminData, error: adminError } = await supabase
              .from('admin_users')
              .select('*')
              .eq('id', userId)
              .maybeSingle();
            
            if (adminError) {
              console.error('Erreur lors de la vérification admin:', adminError);
            } else if (adminData) {
              console.log('✅ Admin trouvé, redirection...');
              setUserType('admin');
              setCurrentView('admin-dashboard');
              setIsLoading(false);
              return true;
            }
            
            // Vérifier si c'est un chauffeur
            const { data: driverData, error: driverError } = await supabase
              .from('drivers')
              .select('*')
              .eq('id', userId)
              .maybeSingle();
            
            if (driverError) {
              console.error('Erreur lors de la vérification chauffeur:', driverError);
            } else if (driverData) {
              console.log('✅ Chauffeur trouvé, redirection...');
              setUserType('driver');
              setCurrentView('dashboard');
              setIsLoading(false);
              return true;
            }
            
            // Vérifier si c'est un client
            const { data: clientData, error: clientError } = await supabase
              .from('clients')
              .select('*')
              .eq('id', userId)
              .maybeSingle();
            
            if (clientError) {
              console.error('Erreur lors de la vérification client:', clientError);
            } else if (clientData) {
              console.log('✅ Client trouvé, redirection...');
              setUserType('client');
              setCurrentView('client-dashboard');
              setIsLoading(false);
              return true;
            }
            
            console.log('❌ Aucun type d\'utilisateur trouvé');
            return false;
          };
          
          const userFound = await checkUserType();
          
          if (!userFound) {
            console.log('🚪 Déconnexion - type non trouvé');
            await supabase.auth.signOut();
            setUserType(null);
            setCurrentView('home');
            setIsLoading(false);
          }
        } else {
          console.log('❌ Pas de session');
          setUserType(null);
          setCurrentView('home');
          setIsLoading(false);
        }
      } catch (error) {
        console.error('💥 Erreur checkSession:', error);
        setUserType(null);
        setCurrentView('home');
        setIsLoading(false);
      }
      console.log('✅ Fin de checkSession');
    };

    checkSession();

    // Écouter les changements d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 Auth change:', event);
        
        if (event === 'SIGNED_OUT' || !session) {
          setUserType(null);
          setCurrentView('home');
          setIsLoading(false);
        } else if (event === 'SIGNED_IN' && session?.user) {
          const userId = session.user.id;
          
          // Vérifier si c'est un admin
          const { data: adminData } = await supabase
            .from('admin_users')
            .select('*')
            .eq('id', userId)
            .maybeSingle();
          
          if (adminData) {
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
            .maybeSingle();
          
          if (driverData) {
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
            .maybeSingle();
          
          if (clientData) {
            setUserType('client');
            setCurrentView('client-dashboard');
            setIsLoading(false);
            return;
          }
          
          // Si aucun type trouvé, déconnecter
          console.log('❌ Type non trouvé, déconnexion');
          await supabase.auth.signOut();
          setIsLoading(false);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    setIsLoading(true);
    await supabase.auth.signOut();
    setUserType(null);
    setCurrentView('home');
    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Vérification de la session...</p>
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
      case 'terms-of-service':
        return <TermsOfService onBack={() => setCurrentView('home')} />;
      default:
        return (
          <HomePage 
            onGetStarted={() => setCurrentView('signup')}
            onClientLogin={() => setCurrentView('client-login')}
            onPrivacyPolicyClick={() => setCurrentView('privacy-policy')}
            onTermsClick={() => setCurrentView('terms-of-service')}
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