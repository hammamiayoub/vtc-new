import React, { useState } from 'react';
import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
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
import { PrivacyPolicyPage } from './components/PrivacyPolicyPage';
import { TermsOfServicePage } from './components/TermsOfServicePage';
import { ResetPasswordPage } from './components/ResetPasswordPage';
import { supabase } from './lib/supabase';
import { initAnalytics, analytics } from './utils/analytics';
import { updateSEO } from './utils/seo';

type View = 'home' | 'signup' | 'login' | 'dashboard' | 'admin' | 'admin-dashboard' | 'client-signup' | 'login-selection' | 'driver-login' | 'client-login' | 'client-dashboard' | 'privacy-policy' | 'terms-of-service' | 'reset-password';

function AppContent() {
  const [currentView, setCurrentView] = useState<View>('home');
  const [isLoading, setIsLoading] = useState(true);
  const [userType, setUserType] = useState<'driver' | 'client' | 'admin' | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Gérer la navigation basée sur l'URL
  useEffect(() => {
    const path = location.pathname;
    let viewKey: string;
    
    // Mapper les chemins aux vues
    switch (path) {
      case '/':
        setCurrentView('home');
        viewKey = 'home';
        break;
      case '/signup':
        setCurrentView('signup');
        viewKey = 'signup';
        break;
      case '/client-signup':
        setCurrentView('client-signup');
        viewKey = 'client-signup';
        break;
      case '/login':
        setCurrentView('login-selection');
        viewKey = 'home'; // Utiliser les meta de la page d'accueil pour la sélection de login
        break;
      case '/driver-login':
        setCurrentView('driver-login');
        viewKey = 'driver-login';
        break;
      case '/client-login':
        setCurrentView('client-login');
        viewKey = 'client-login';
        break;
      case '/dashboard':
        setCurrentView('dashboard');
        viewKey = 'home'; // Utiliser les meta de la page d'accueil pour le dashboard chauffeur
        break;
      case '/client-dashboard':
        setCurrentView('client-dashboard');
        viewKey = 'client-dashboard';
        break;
      case '/admin':
        setCurrentView('admin');
        viewKey = 'home'; // Utiliser les meta de la page d'accueil pour l'admin
        break;
      case '/admin-dashboard':
        setCurrentView('admin-dashboard');
        viewKey = 'home'; // Utiliser les meta de la page d'accueil pour le dashboard admin
        break;
      case '/privacy-policy':
        setCurrentView('privacy-policy');
        viewKey = 'privacy-policy';
        break;
      case '/terms-of-service':
        setCurrentView('terms-of-service');
        viewKey = 'terms-of-service';
        break;
      case '/reset-password':
        setCurrentView('reset-password');
        viewKey = 'home'; // Utiliser les meta de la page d'accueil pour la réinitialisation
        break;
      default:
        setCurrentView('home');
        viewKey = 'home';
        break;
    }
    
    // Mettre à jour les balises SEO
    updateSEO(viewKey);
  }, [location.pathname]);

  useEffect(() => {
    // Initialiser Google Analytics
    initAnalytics();
    
    // Vérifier si on est sur une page de réinitialisation de mot de passe
    const urlParams = new URLSearchParams(window.location.search);
    const hash = window.location.hash;

    console.log('URL params:', urlParams.get('type'));
    console.log('Hash:', hash);
    console.log('Full URL:', window.location.href);

    // Ne déclencher reset-password QUE pour la récupération de mot de passe
    if (hash.includes('type=recovery') || urlParams.get('type') === 'recovery') {
      console.log('Détection de réinitialisation de mot de passe, redirection vers reset-password');
      setCurrentView('reset-password');
      setIsLoading(false);
      return;
    }

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
          
          // Si aucun type trouvé, ne pas casser le flux d'inscription
          if (location.pathname === '/signup' || location.pathname === '/client-signup') {
            console.log('Utilisateur non typé mais sur une page signup: on laisse continuer.');
          } else {
            console.log('Type d\'utilisateur non trouvé, déconnexion...');
            await supabase.auth.signOut();
          }
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
        
        if (event === 'SIGNED_OUT') {
          setUserType(null);
          // Ne pas forcer la vue 'home' pour laisser la navigation par URL fonctionner
          return;
        }
        
        if (event === 'SIGNED_IN' && session) {
          // Ne pas rediriger automatiquement lors de la connexion
          // Laisser les composants de login gérer la redirection
          console.log('Connexion détectée, laisser le composant de login gérer la redirection');
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    try {
      console.log('🚪 Déconnexion en cours...');
      
      // Réinitialiser l'état avant la déconnexion
      setUserType(null);
      setCurrentView('home');
      
      // Déconnexion Supabase
      await supabase.auth.signOut();
      
      console.log('✅ Déconnexion réussie');
      
      // Redirection forcée vers la page d'accueil
      navigate('/', { replace: true });
      
      // Double sécurité : forcer le rechargement si la navigation ne fonctionne pas
      setTimeout(() => {
        if (window.location.pathname !== '/') {
          window.location.href = '/';
        }
      }, 100);
      
    } catch (error) {
      console.error('❌ Erreur lors de la déconnexion:', error);
      // En cas d'erreur, forcer la redirection quand même
      window.location.href = '/';
    }
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
        return <DriverSignup onBack={() => navigate('/')} />;
      case 'client-signup':
        return <ClientSignup onBack={() => navigate('/')} />;
      case 'login-selection':
        return (
          <LoginSelection 
            onBack={() => navigate('/')}
            onDriverLogin={() => navigate('/driver-login')}
            onClientLogin={() => navigate('/client-login')}
          />
        );
      case 'driver-login':
        return (
          <DriverLogin 
            onBack={() => navigate('/login')} 
            onSignup={() => navigate('/signup')}
            onLoginSuccess={() => {
              setUserType('driver');
              navigate('/dashboard');
            }}
          />
        );
      case 'client-login':
        return (
          <ClientLogin 
            onBack={() => navigate('/')} 
            onSignup={() => navigate('/client-signup')}
            onLoginSuccess={() => {
              setUserType('client');
              navigate('/client-dashboard');
            }}
          />
        );
      case 'login':
        return (
          <LoginSelection 
            onBack={() => navigate('/')}
            onDriverLogin={() => navigate('/driver-login')}
            onClientLogin={() => navigate('/client-login')}
          />
        );
      case 'dashboard':
        return <DriverDashboard onLogout={handleLogout} />;
      case 'client-dashboard':
        return <ClientDashboard onLogout={handleLogout} />;
      case 'admin':
        return (
          <AdminLogin 
            onBack={() => navigate('/')} 
            onLoginSuccess={() => {
              setUserType('admin');
              navigate('/admin-dashboard');
            }}
          />
        );
      case 'admin-dashboard':
        return <AdminDashboard onLogout={handleLogout} />;
      case 'privacy-policy':
        return <PrivacyPolicy onBack={() => navigate('/')} />;
      case 'terms-of-service':
        return <TermsOfService onBack={() => navigate('/')} />;
      case 'reset-password':
        return (
          <ResetPasswordPage 
            onBack={() => navigate('/')}
            onSuccess={() => navigate('/')}
          />
        );
      default:
        return (
          <HomePage 
            onGetStarted={() => navigate('/signup')}
            onClientLogin={() => navigate('/client-login')}
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

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
        <Route path="/terms-of-service" element={<TermsOfServicePage />} />
        <Route path="/*" element={<AppContent />} />
      </Routes>
    </Router>
  );
}

export default App;