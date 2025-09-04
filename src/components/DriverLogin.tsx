import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, ArrowLeft, Car, Chrome } from 'lucide-react';
import { Button } from './ui/Button';
import { supabase } from '../lib/supabase';

interface DriverLoginProps {
  onBack: () => void;
  onSignup: () => void;
  onLoginSuccess: () => void;
}

export const DriverLogin: React.FC<DriverLoginProps> = ({ onBack, onSignup, onLoginSuccess }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);

  const handleOAuthLogin = async (provider: 'google' | 'facebook') => {
    setOauthLoading(provider);
    
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/#/auth/callback?type=driver`,
          queryParams: {
            user_type: 'driver'
          }
        }
      });

      if (error) {
        console.error(`Erreur lors de la connexion ${provider}:`, error);
        setError(`Erreur lors de la connexion avec ${provider}`);
      }
    } catch (error) {
      console.error('Erreur OAuth:', error);
      setError('Une erreur est survenue lors de la connexion');
    } finally {
      setOauthLoading(null);
    }
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
        setError('Email ou mot de passe incorrect');
        return;
      }

      if (data.user) {
        // Vérifier que c'est bien un chauffeur
        const { data: driverData, error: driverError } = await supabase
          .from('drivers')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (driverError || !driverData) {
          setError('Ce compte n\'est pas un compte chauffeur');
          await supabase.auth.signOut();
          return;
        }

        onLoginSuccess();
      }
    } catch (error) {
      console.error('Erreur lors de la connexion chauffeur:', error);
      setError('Une erreur est survenue lors de la connexion');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-lg overflow-hidden max-w-md w-full">
        <div className="p-10">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-8 transition-colors group"
          >
            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            Retour
          </button>

          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gray-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <Car size={36} className="text-gray-700" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-3 tracking-tight">
              Connexion chauffeur
            </h1>
            <p className="text-gray-600 text-lg">
              Accédez à votre espace chauffeur
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* OAuth Buttons */}
            <div className="space-y-3">
              <Button
                type="button"
                onClick={() => handleOAuthLogin('google')}
                loading={oauthLoading === 'google'}
                disabled={oauthLoading !== null || isSubmitting}
                className="w-full py-3 bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-3"
              >
                <Chrome size={20} className="text-blue-500" />
                {oauthLoading === 'google' ? 'Connexion...' : 'Continuer avec Google'}
              </Button>
              
              <Button
                type="button"
                onClick={() => handleOAuthLogin('facebook')}
                loading={oauthLoading === 'facebook'}
                disabled={oauthLoading !== null || isSubmitting}
                className="w-full py-3 bg-blue-600 text-white hover:bg-blue-700 flex items-center justify-center gap-3"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                {oauthLoading === 'facebook' ? 'Connexion...' : 'Continuer avec Facebook'}
              </Button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Ou se connecter avec email</span>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-500" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Adresse email"
                className="block w-full pl-10 pr-3 py-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900 transition-all text-base"
                required
              />
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-500" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mot de passe"
                className="block w-full pl-10 pr-12 py-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900 transition-all text-base"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
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
                <input type="checkbox" className="w-4 h-4 text-gray-900 rounded border-gray-300 focus:ring-gray-900" />
                <span className="ml-2 text-sm text-gray-600">Se souvenir de moi</span>
              </label>
              <a href="#" className="text-sm text-gray-900 hover:underline font-medium">
                Mot de passe oublié ?
              </a>
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              loading={isSubmitting}
              disabled={isSubmitting || oauthLoading !== null}
              className="w-full py-4 bg-black hover:bg-gray-800 text-lg font-medium"
            >
              Se connecter
            </Button>
          </form>

          <div className="mt-10 text-center">
            <p className="text-gray-600">
              Pas encore chauffeur ?{' '}
              <button
                onClick={onSignup}
                className="text-gray-900 hover:underline font-medium"
              >
                Devenir chauffeur
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};