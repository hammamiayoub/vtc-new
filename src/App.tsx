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
    // Timeout pour éviter le chargement infini
    const sessionTimeout = setTimeout(() => {
      console.warn('⏰ Timeout de vérification de session - arrêt du chargement');
      setIsLoading(false);
      setUserType(null);
      setCurrentView('home');
    }, 10000); // 10 secondes maximum

    // Vérifier la session existante au chargement
    const checkSession = async () => {
      try {
        console.log('🔍 Vérification de la session au chargement...');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Erreur lors de la vérification de session:', error);
          clearTimeout(sessionTimeout);
          setIsLoading(false);
          setUserType(null);
          setCurrentView('home');
          return;
        }

        console.log('📋 Session trouvée:', !!session, session?.user?.id);

        if (session?.user) {
          const userId = session.user.id;
          console.log('👤 ID utilisateur:', userId);
          
          // Fonction helper pour vérifier le type d'utilisateur
          const checkUserType = async () => {
            try {
            // Vérifier si c'est un admin
            console.log('🛡️ Vérification admin...');
            const { data: adminData, error: adminError } = await supabase
              .from('admin_users')
              .select('*')
              .eq('id', userId)
              .maybeSingle();
            
            if (adminError) {
              console.error('Erreur lors de la vérification admin:', adminError);
            } else if (adminData) {
              console.log('✅ Utilisateur admin trouvé');
              setUserType('admin');
              setCurrentView('admin-dashboard');
              clearTimeout(sessionTimeout);
              setIsLoading(false);
              return true;
            }
            
            // Vérifier si c'est un chauffeur
            console.log('🚗 Vérification chauffeur...');
            const { data: driverData, error: driverError } = await supabase
              .from('drivers')
              .select('*')
              .eq('id', userId)
              .maybeSingle();
            
            if (driverError) {
              console.error('Erreur lors de la vérification chauffeur:', driverError);
            } else if (driverData) {
              console.log('✅ Utilisateur chauffeur trouvé');
              setUserType('driver');
              clearTimeout(sessionTimeout);
              setIsLoading(false);
              setCurrentView('dashboard');
              return true;
            }
            
            // Vérifier si c'est un client
            console.log('👥 Vérification client...');
            const { data: clientData, error: clientError } = await supabase
              .from('clients')
              .select('*')
              .eq('id', userId)
              .maybeSingle();
            
            if (clientError) {
              console.error('Erreur lors de la vérification client:', clientError);
            } else if (clientData) {
              console.log('✅ Utilisateur client trouvé');
              setUserType('client');
              clearTimeout(sessionTimeout);
              setIsLoading(false);
              setCurrentView('client-dashboard');
              return true;
            }
            
            return false;
          } catch (typeError) {
            console.error('Erreur lors de la vérification du type utilisateur:', typeError);
            return false;
          }
          };
          
          const userFound = await checkUserType();
          
          if (!userFound) {
            console.log('❌ Aucun type d\'utilisateur trouvé, déconnexion...');
            await supabase.auth.signOut();
            setUserType(null);
            setCurrentView('home');
            clearTimeout(sessionTimeout);
            setIsLoading(false);
          }
        } else {
          console.log('❌ Aucune session trouvée');
          setUserType(null);
          setCurrentView('home');
          clearTimeout(sessionTimeout);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Erreur lors de la vérification de session:', error);
        setUserType(null);
        setCurrentView('home');
        clearTimeout(sessionTimeout);
        setIsLoading(false);
      }
    };

    checkSession();

    // Écouter les changements d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 Changement d\'auth:', event, session?.user?.id);
        
        if (event === 'SIGNED_OUT' || !session) {
          console.log('👋 Déconnexion détectée');
          setUserType(null);
          setCurrentView('home');
          setIsLoading(false);
        } else if (event === 'SIGNED_IN' && session?.user) {
          console.log('🔑 Connexion détectée');
          const userId = session.user.id;
          
          try {
            // Vérifier si c'est un admin
            const { data: adminData } = await supabase
              .from('admin_users')
              .select('*')
              .eq('id', userId)
              .maybeSingle();
            
            if (adminData) {
              console.log('✅ Admin connecté');
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
              console.log('✅ Chauffeur connecté');
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
              console.log('✅ Client connecté');
              setUserType('client');
              setCurrentView('client-dashboard');
              setIsLoading(false);
              return;
            }
            
            // Si aucun type trouvé, déconnecter
            console.log('❌ Type d\'utilisateur non trouvé après connexion, déconnexion...');
            await supabase.auth.signOut();
            setIsLoading(false);
          } catch (error) {
            console.error('Erreur lors de la vérification du type utilisateur:', error);
            setUserType(null);
            setCurrentView('home');
            setIsLoading(false);
          }
        }
      }
    );

    return () => {
      clearTimeout(sessionTimeout);
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    console.log('🚪 Déconnexion manuelle...');
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
          <p className="text-gray-600 mb-2">Vérification de la session...</p>
          <p className="text-sm text-gray-500">Si le chargement persiste, actualisez la page</p>
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