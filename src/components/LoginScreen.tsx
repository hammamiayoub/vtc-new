import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { Button } from './ui/Button';
import { BookingSteps } from './ui/BookingSteps';
import { ForgotPasswordModal } from './ForgotPasswordModal';
import { supabase } from '../lib/supabase';
import { analytics } from '../utils/analytics';
import { hasPendingQuote } from '../utils/pendingQuote';
import { TrustSignals } from './TrustSignals';
import { useLocale } from '../i18n/locale';
import { translateSignupMessage } from '../i18n/signupErrors';
import { cn } from '../utils/cn';

export type LoginRole = 'client' | 'driver';

interface LoginScreenProps {
  role: LoginRole;
  onRoleChange: (role: LoginRole) => void;
  onSignup: (role: LoginRole) => void;
  onLoginSuccess: (role: LoginRole) => void;
}

const inputClass =
  'block w-full pl-10 py-3 sm:py-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900 transition-colors text-base';

/**
 * Connexion client et chauffeur sur un seul écran : deux onglets au-dessus du même formulaire,
 * pour ne pas imposer une page de choix avant de pouvoir saisir ses identifiants.
 */
export const LoginScreen: React.FC<LoginScreenProps> = ({
  role,
  onRoleChange,
  onSignup,
  onLoginSuccess,
}) => {
  const { locale, href } = useLocale();
  const en = locale === 'en';
  const isClient = role === 'client';
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const pendingQuote = isClient && hasPendingQuote();

  const changeRole = (next: LoginRole) => {
    if (next === role) return;
    setError('');
    onRoleChange(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        if (authError.message.includes('Invalid login credentials')) {
          setError('Email ou mot de passe incorrect');
        } else if (authError.message.includes('Email not confirmed')) {
          setError('Veuillez confirmer votre email avant de vous connecter');
        } else {
          setError('Erreur de connexion: ' + authError.message);
        }
        return;
      }

      if (data.user) {
        if (rememberMe) {
          await supabase.auth.updateUser({
            data: { remember_me: true },
          });
        }

        // Le compte doit exister dans l'espace choisi (client ou chauffeur).
        const { data: profile, error: profileError } = await supabase
          .from(isClient ? 'clients' : 'drivers')
          .select('*')
          .eq('id', data.user.id)
          .maybeSingle();

        if (profileError) {
          console.error('Erreur lors de la vérification du compte:', profileError);
          setError('Erreur lors de la vérification du compte');
          await supabase.auth.signOut();
          return;
        }

        if (!profile) {
          setError(
            isClient
              ? "Identifiants incorrects. Ce compte n'est pas un compte client. Veuillez utiliser vos identifiants client ou créer un compte client."
              : "Identifiants incorrects. Ce compte n'est pas un compte chauffeur. Veuillez utiliser vos identifiants chauffeur ou créer un compte chauffeur.",
          );
          await supabase.auth.signOut();
          return;
        }

        if (isClient) analytics.trackLogin('client');

        onLoginSuccess(role);
      }
    } catch (err) {
      console.error('Erreur lors de la connexion:', err);
      setError('Une erreur est survenue lors de la connexion');
    } finally {
      setIsSubmitting(false);
    }
  };

  const tabClass = (active: boolean) =>
    cn(
      'focus-ring flex-1 min-h-[44px] rounded-full px-4 text-sm sm:text-base font-semibold transition-colors',
      active ? 'bg-white text-gray-900 shadow-raised' : 'text-ink-muted hover:text-gray-900',
    );

  return (
    <div className="min-h-[100dvh] bg-gray-50 flex items-start sm:items-center justify-center p-4 sm:p-6 py-6 sm:py-8 overflow-y-auto">
      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-card overflow-hidden max-w-md w-full my-auto">
        <div className="p-5 sm:p-8 lg:p-10">
          <Link
            to={href('/')}
            className="focus-ring rounded-md inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 sm:mb-8 transition-colors group"
          >
            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" aria-hidden="true" />
            {en ? 'Home' : 'Accueil'}
          </Link>

          <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 mb-5 tracking-tight">
            {en ? 'Log in' : 'Connexion'}
          </h1>

          <div
            role="tablist"
            aria-label={en ? 'Account type' : 'Type de compte'}
            className="flex gap-1 rounded-full bg-surface-muted p-1 mb-5"
          >
            <button
              type="button"
              role="tab"
              id="login-tab-client"
              aria-selected={isClient}
              aria-controls="login-panel"
              onClick={() => changeRole('client')}
              className={tabClass(isClient)}
            >
              {en ? 'Rider' : 'Client'}
            </button>
            <button
              type="button"
              role="tab"
              id="login-tab-driver"
              aria-selected={!isClient}
              aria-controls="login-panel"
              onClick={() => changeRole('driver')}
              className={tabClass(!isClient)}
            >
              {en ? 'Driver' : 'Chauffeur'}
            </button>
          </div>

          <div id="login-panel" role="tabpanel" aria-labelledby={isClient ? 'login-tab-client' : 'login-tab-driver'}>
            <p className="text-gray-600 text-base mb-6">
              {isClient
                ? pendingQuote
                  ? (en ? 'Sign in to finish the booking you started.' : 'Connectez-vous pour finaliser votre réservation en cours.')
                  : (en ? 'Book and manage your rides in Tunisia.' : 'Réservez et gérez vos courses en Tunisie.')
                : (en ? 'Manage your rides, availability and vehicles.' : 'Gérez vos courses, vos disponibilités et vos véhicules.')}
            </p>

            {pendingQuote && (
              <div className="mb-6 rounded-xl border border-gray-200 bg-gray-50 px-4 py-4 text-sm text-gray-700">
                <BookingSteps current={2} className="mb-3" />
                {en
                  ? 'The quote from the homepage will be applied automatically after you sign in.'
                  : "Le devis calculé sur l'accueil sera repris automatiquement après connexion."}
              </div>
            )}

            <TrustSignals variant="compact" className="mb-6 text-left" />

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-500" aria-hidden="true" />
                </div>
                <input
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={en ? 'Email address' : 'Adresse email'}
                  aria-label={en ? 'Email address' : 'Adresse email'}
                  className={cn(inputClass, 'pr-3')}
                  required
                />
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-500" aria-hidden="true" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={en ? 'Password' : 'Mot de passe'}
                  aria-label={en ? 'Password' : 'Mot de passe'}
                  className={cn(inputClass, 'pr-12')}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  aria-label={showPassword ? (en ? 'Hide password' : 'Masquer le mot de passe') : (en ? 'Show password' : 'Afficher le mot de passe')}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-500 hover:text-gray-700" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-500 hover:text-gray-700" />
                  )}
                </button>
              </div>

              <div className="flex items-center justify-between pt-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 text-gray-900 rounded border-gray-300 focus:ring-gray-900"
                  />
                  <span className="ml-2 text-sm text-gray-600">{en ? 'Remember me' : 'Se souvenir de moi'}</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-sm text-gray-900 hover:underline font-medium"
                >
                  {en ? 'Forgot password?' : 'Mot de passe oublié ?'}
                </button>
              </div>

              {error && (
                <div className="p-4 bg-danger-50 border border-danger-200 rounded-xl" role="alert">
                  <p className="text-sm text-danger-600">{translateSignupMessage(error, locale)}</p>
                </div>
              )}

              <Button
                type="submit"
                loading={isSubmitting}
                className="w-full py-4 bg-black hover:bg-gray-800 text-lg font-medium"
              >
                {en ? 'Sign in' : 'Se connecter'}
              </Button>
            </form>

            <p className="mt-8 text-center text-gray-600">
              {isClient
                ? (en ? 'Not a rider yet? ' : 'Pas encore client ? ')
                : (en ? 'Not a partner yet? ' : 'Pas encore partenaire ? ')}
              <button
                type="button"
                onClick={() => onSignup(role)}
                className="text-gray-900 hover:underline font-medium"
              >
                {isClient
                  ? (en ? 'Create a rider account' : 'Créer un compte client')
                  : (en ? 'Become a driver' : 'Devenir chauffeur')}
              </button>
            </p>
          </div>
        </div>

        {/* La clé remet la modale à zéro quand on change d'onglet. */}
        <ForgotPasswordModal
          key={role}
          isOpen={showForgotPassword}
          onClose={() => setShowForgotPassword(false)}
          userType={role}
        />
      </div>
    </div>
  );
};
