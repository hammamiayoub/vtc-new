import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, ArrowLeft, MapPin } from 'lucide-react';
import { Button } from './ui/Button';
import { supabase } from '../lib/supabase';

interface ClientLoginProps {
  onBack: () => void;
  onSignup: () => void;
  onLoginSuccess: () => void;
}

export const ClientLogin: React.FC<ClientLoginProps> = ({ onBack, onSignup, onLoginSuccess }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

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
        // Vérifier que c'est bien un client
        const { data: clientData, error: clientError } = await supabase
          .from('clients')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (clientError || !clientData) {
          setError('Ce compte n\'est pas un compte client');
          await supabase.auth.signOut();
          return;
        }

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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden max-w-md w-full">
        <div className="p-8">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 hover:text-purple-600 mb-8 transition-colors group"
          >
            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            Retour
          </button>

          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <MapPin size={32} className="text-purple-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Connexion client
            </h1>
            <p className="text-gray-600">
              Accédez à votre espace de réservation
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Adresse email"
                className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                required
              />
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mot de passe"
                className="block w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                ) : (
                  <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                )}
              </button>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input type="checkbox" className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500" />
                <span className="ml-2 text-sm text-gray-600">Se souvenir de moi</span>
              </label>
              <a href="#" className="text-sm text-purple-600 hover:underline">
                Mot de passe oublié ?
              </a>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              loading={isSubmitting}
              className="w-full py-3 bg-purple-600 hover:bg-purple-700"
            >
              Se connecter
            </Button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-gray-600">
              Pas encore client ?{' '}
              <button
                onClick={onSignup}
                className="text-purple-600 hover:underline font-medium"
              >
                Créer un compte client
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};