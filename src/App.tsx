import React, { Suspense, lazy, useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Header } from './components/Header';
import { HomePage } from './components/HomePage';
import { PageLoader } from './components/ui/PageLoader';
import { ScrollToTop } from './components/ScrollToTop';
import { supabase } from './lib/supabase';
import { initAnalytics } from './utils/analytics';
import { updateSEO } from './utils/seo';
import {
  isPublicPath,
  isProtectedPath,
  resolveUserRole,
} from './utils/resolveUserRole';

const DriverSignup = lazy(() =>
  import('./components/DriverSignup').then((m) => ({ default: m.DriverSignup }))
);
const ClientSignup = lazy(() =>
  import('./components/ClientSignup').then((m) => ({ default: m.ClientSignup }))
);
const LoginSelection = lazy(() =>
  import('./components/LoginSelection').then((m) => ({ default: m.LoginSelection }))
);
const DriverLogin = lazy(() =>
  import('./components/DriverLogin').then((m) => ({ default: m.DriverLogin }))
);
const ClientLogin = lazy(() =>
  import('./components/ClientLogin').then((m) => ({ default: m.ClientLogin }))
);
const DriverDashboard = lazy(() =>
  import('./components/DriverDashboard').then((m) => ({ default: m.DriverDashboard }))
);
const ClientDashboard = lazy(() =>
  import('./components/ClientDashboard').then((m) => ({ default: m.ClientDashboard }))
);
const AdminLogin = lazy(() =>
  import('./components/AdminLogin').then((m) => ({ default: m.AdminLogin }))
);
const AdminDashboard = lazy(() =>
  import('./components/AdminDashboard').then((m) => ({ default: m.AdminDashboard }))
);
const PrivacyPolicy = lazy(() =>
  import('./components/PrivacyPolicy').then((m) => ({ default: m.PrivacyPolicy }))
);
const TermsOfService = lazy(() =>
  import('./components/TermsOfService').then((m) => ({ default: m.TermsOfService }))
);
const ResetPasswordPage = lazy(() =>
  import('./components/ResetPasswordPage').then((m) => ({ default: m.ResetPasswordPage }))
);
const ParcelTransportPage = lazy(() =>
  import('./components/ParcelTransportPage').then((m) => ({ default: m.ParcelTransportPage }))
);
const BlogPage = lazy(() =>
  import('./components/BlogPage').then((m) => ({ default: m.BlogPage }))
);
const VtcTunisiePage = lazy(() =>
  import('./components/VtcTunisiePage').then((m) => ({ default: m.VtcTunisiePage }))
);
const AboutPage = lazy(() =>
  import('./components/AboutPage').then((m) => ({ default: m.AboutPage }))
);
const PrivacyPolicyPage = lazy(() =>
  import('./components/PrivacyPolicyPage').then((m) => ({ default: m.PrivacyPolicyPage }))
);
const TermsOfServicePage = lazy(() =>
  import('./components/TermsOfServicePage').then((m) => ({ default: m.TermsOfServicePage }))
);
const ChatWidget = lazy(() =>
  import('./components/ChatWidget').then((m) => ({ default: m.ChatWidget }))
);

type View =
  | 'home'
  | 'signup'
  | 'login'
  | 'dashboard'
  | 'admin'
  | 'admin-dashboard'
  | 'client-signup'
  | 'login-selection'
  | 'driver-login'
  | 'client-login'
  | 'client-dashboard'
  | 'privacy-policy'
  | 'terms-of-service'
  | 'reset-password'
  | 'parcel-transport'
  | 'blog'
  | 'vtc-tunisie'
  | 'about';

function pathToView(path: string): { view: View; seoKey: string } {
  switch (path) {
    case '/':
      return { view: 'home', seoKey: 'home' };
    case '/signup':
      return { view: 'signup', seoKey: 'signup' };
    case '/client-signup':
      return { view: 'client-signup', seoKey: 'client-signup' };
    case '/login':
      return { view: 'login-selection', seoKey: 'home' };
    case '/driver-login':
      return { view: 'driver-login', seoKey: 'driver-login' };
    case '/client-login':
      return { view: 'client-login', seoKey: 'client-login' };
    case '/dashboard':
      return { view: 'dashboard', seoKey: 'home' };
    case '/client-dashboard':
      return { view: 'client-dashboard', seoKey: 'client-dashboard' };
    case '/admin':
      return { view: 'admin', seoKey: 'home' };
    case '/admin-dashboard':
      return { view: 'admin-dashboard', seoKey: 'home' };
    case '/transport-colis-europe-tunisie':
      return { view: 'parcel-transport', seoKey: 'parcel-transport' };
    case '/vtc-tunisie':
      return { view: 'vtc-tunisie', seoKey: 'vtc-tunisie' };
    case '/blog':
      return { view: 'blog', seoKey: 'blog' };
    case '/a-propos':
      return { view: 'about', seoKey: 'about' };
    case '/privacy-policy':
      return { view: 'privacy-policy', seoKey: 'privacy-policy' };
    case '/terms-of-service':
      return { view: 'terms-of-service', seoKey: 'terms-of-service' };
    case '/reset-password':
      return { view: 'reset-password', seoKey: 'home' };
    default:
      if (path.startsWith('/blog/')) {
        return { view: 'blog', seoKey: 'blog' };
      }
      return { view: 'home', seoKey: 'home' };
  }
}

function RouteFallback() {
  return <PageLoader />;
}

function AppContent() {
  const [currentView, setCurrentView] = useState<View>('home');
  const [authReady, setAuthReady] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const { view, seoKey } = pathToView(location.pathname);
    setCurrentView(view);
    updateSEO(seoKey);

    if (location.pathname !== '/' && view === 'home' && !location.pathname.startsWith('/blog/')) {
      navigate('/', { replace: true });
    }
  }, [location.pathname, navigate]);

  useEffect(() => {
    initAnalytics();

    const urlParams = new URLSearchParams(window.location.search);
    const hash = window.location.hash;
    const path = window.location.pathname;

    if (hash.includes('type=recovery') || urlParams.get('type') === 'recovery') {
      setCurrentView('reset-password');
      setAuthReady(true);
      return;
    }

    let cancelled = false;

    const bootstrapAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (cancelled) return;

        if (error) {
          console.error('Erreur session:', error.message);
          setAuthReady(true);
          return;
        }

        const onPublicPage = isPublicPath(path);

        if (!session?.user) {
          if (isProtectedPath(path)) {
            if (path.startsWith('/admin')) navigate('/admin', { replace: true });
            else if (path.includes('client')) navigate('/client-login', { replace: true });
            else navigate('/driver-login', { replace: true });
          }
          setAuthReady(true);
          return;
        }

        const role = await resolveUserRole(session.user.id);
        if (cancelled) return;

        if (path === '/admin-dashboard') {
          if (role !== 'admin') {
            navigate('/admin', { replace: true });
          } else {
            setCurrentView('admin-dashboard');
          }
        } else if (!onPublicPage && role) {
          if (role === 'admin') setCurrentView('admin-dashboard');
          else if (role === 'driver') setCurrentView('dashboard');
          else if (role === 'client') setCurrentView('client-dashboard');
        } else if (!role && path !== '/signup' && path !== '/client-signup') {
          await supabase.auth.signOut();
        }

        setAuthReady(true);
      } catch (error) {
        console.error('Erreur bootstrap auth:', error);
        setAuthReady(true);
      }
    };

    bootstrapAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      // Les écrans de connexion gèrent la redirection après SIGNED_IN
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [navigate]);

  useEffect(() => {
    const delayMs = 1500;
    const timer = window.setTimeout(() => setShowChat(true), delayMs);
    return () => window.clearTimeout(timer);
  }, []);

  const handleLogout = async () => {
    try {
      setCurrentView('home');
      await supabase.auth.signOut();
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Erreur déconnexion:', error);
      window.location.href = '/';
    }
  };

  if (!authReady && isProtectedPath(location.pathname)) {
    return <PageLoader fullScreen label="Préparation de votre espace…" />;
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
          <ResetPasswordPage onBack={() => navigate('/')} onSuccess={() => navigate('/')} />
        );
      case 'parcel-transport':
        return <ParcelTransportPage />;
      case 'vtc-tunisie':
        return <VtcTunisiePage onClientLogin={() => navigate('/client-login')} />;
      case 'blog':
        return <BlogPage />;
      case 'about':
        return (
          <AboutPage
            onClientLogin={() => navigate('/client-login')}
            onClientSignup={() => navigate('/client-signup')}
          />
        );
      default:
        return (
          <HomePage
            onGetStarted={() => navigate('/signup')}
            onClientLogin={() => navigate('/client-login')}
            onClientSignup={() => navigate('/client-signup')}
          />
        );
    }
  };

  const showHeader =
    currentView === 'home' ||
    currentView === 'admin' ||
    currentView === 'parcel-transport' ||
    currentView === 'vtc-tunisie' ||
    currentView === 'blog' ||
    currentView === 'about';

  return (
    <div className="min-h-screen bg-gray-50">
      {showHeader && <Header currentView={currentView} />}
      <Suspense fallback={<RouteFallback />}>{renderContent()}</Suspense>
      {showChat && (
        <Suspense fallback={null}>
          <ChatWidget />
        </Suspense>
      )}
    </div>
  );
}

function App() {
  return (
    <Router>
      <ScrollToTop />
      <Routes>
        <Route
          path="/privacy-policy"
          element={
            <Suspense fallback={<PageLoader fullScreen />}>
              <PrivacyPolicyPage />
            </Suspense>
          }
        />
        <Route
          path="/terms-of-service"
          element={
            <Suspense fallback={<PageLoader fullScreen />}>
              <TermsOfServicePage />
            </Suspense>
          }
        />
        <Route path="/*" element={<AppContent />} />
      </Routes>
    </Router>
  );
}

export default App;
