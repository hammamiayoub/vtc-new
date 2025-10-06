import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, ArrowLeft, MapPin } from 'lucide-react';
import { Button } from './ui/Button';
import { ForgotPasswordModal } from './ForgotPasswordModal';
import { supabase } from '../lib/supabase';
import { analytics } from '../utils/analytics';

interface ClientLoginProps {
  onBack: () => void;
  onSignup: () => void;
  onLoginSuccess: () => void;
}

export const ClientLogin: React.FC<ClientLoginProps> = ({ onBack, onSignup, onLoginSuccess }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
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
        // Configurer la persistance de session selon le choix de l'utilisateur
        if (rememberMe) {
          // Session persistante (30 jours)
          await supabase.auth.updateUser({
            data: { remember_me: true }
          });
        }

        // Vérifier que c'est bien un client
        const { data: clientData, error: clientError } = await supabase
          .from('clients')
          .select('*')
          .eq('id', data.user.id)
          .maybeSingle();

        if (clientError) {
          console.error('Erreur lors de la vérification du client:', clientError);
          setError('Erreur lors de la vérification du compte');
          await supabase.auth.signOut();
          setIsSubmitting(false);
          return;
        }
        
        if (!clientData) {
          setError('Identifiants incorrects. Ce compte n\'est pas un compte client. Veuillez utiliser vos identifiants client ou créer un compte client.');
          await supabase.auth.signOut();
          setIsSubmitting(false);
          return;
        }

        // Tracker la connexion
        analytics.trackLogin('client');
        
        onLoginSuccess();
      }
    } catch (error) {
      console.error('Erreur lors de la connexion client:', error);
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
              <MapPin size={36} className="text-gray-700" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-3 tracking-tight">
              Connexion client
            </h1>
            <p className="text-gray-600 text-lg">
              Accédez à votre espace de réservation
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
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
                <input 
                  type="checkbox" 
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 text-gray-900 rounded border-gray-300 focus:ring-gray-900" 
                />
                <span className="ml-2 text-sm text-gray-600">Se souvenir de moi</span>
              </label>
              <a href="#" className="text-sm text-gray-900 hover:underline font-medium">
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-sm text-gray-900 hover:underline font-medium"
                >
                  Mot de passe oublié ?
                </button>
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
              className="w-full py-4 bg-black hover:bg-gray-800 text-lg font-medium"
            >
              Se connecter
            </Button>
          </form>

          <div className="mt-10 text-center">
            <p className="text-gray-600">
              Pas encore client ?{' '}
              <button
                onClick={onSignup}
                className="text-gray-900 hover:underline font-medium"
              >
                Créer un compte client
              </button>
            </p>
          </div>
        </div>

        {/* Modal mot de passe oublié */}
        <ForgotPasswordModal
          isOpen={showForgotPassword}
          onClose={() => setShowForgotPassword(false)}
          userType="client"
        />
      </div>
    </div>
  );
};