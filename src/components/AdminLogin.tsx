import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, ArrowLeft, Shield } from 'lucide-react';
import { Button } from './ui/Button';
import { supabase } from '../lib/supabase';

interface AdminLoginProps {
  onBack: () => void;
  onLoginSuccess: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onBack, onLoginSuccess }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    
    try {
      // Vérifier si c'est le superadmin et le créer si nécessaire
      if (email === 'superadmin@chauffeur.net' && password === 'Ma1805la!') {
        // Essayer de se connecter d'abord
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: 'superadmin@chauffeur.net',
          password: 'Ma1805la!',
          options: {
            shouldCreateUser: false,
            data: {
              remember_me: rememberMe
            }
          }
        });

        // Si la connexion échoue, essayer de créer le compte
        if (signInError && signInError.message.includes('Invalid login credentials')) {
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: 'superadmin@chauffeur.net',
            password: 'Ma1805la!',
            options: {
              emailRedirectTo: undefined,
              data: {
                role: 'superadmin'
              }
            }
          });

          if (signUpError) {
            console.error('Erreur lors de la création du superadmin:', signUpError);
            setError('Erreur lors de la création du compte administrateur');
            return;
          }

          // Après création, se connecter
          const { data: newSignInData, error: newSignInError } = await supabase.auth.signInWithPassword({
            email: 'superadmin@chauffeur.net',
            password: 'Ma1805la!',
            options: {
              shouldCreateUser: false,
              data: {
                remember_me: rememberMe
              }
            }
          });

          if (newSignInError) {
            setError('Erreur lors de la connexion après création du compte');
            return;
          }

          // Créer l'entrée dans admin_users
          if (newSignInData.user) {
            // Configurer la persistance de session
            if (rememberMe) {
              await supabase.auth.updateUser({
                data: { remember_me: true }
              });
            }

            const { error: upsertError } = await supabase
              .from('admin_users')
              .upsert({
                id: newSignInData.user.id,
                email: 'superadmin@chauffeur.net',
                role: 'superadmin'
              }, {
                onConflict: 'email'
              });

            if (upsertError) {
              console.error('Erreur lors de la création de l\'admin:', upsertError);
              setError('Erreur lors de la configuration du compte administrateur');
              return;
            }
          }

          onLoginSuccess();
          return;
        } else if (signInError) {
          setError('Erreur de connexion: ' + signInError.message);
          return;
        }

        // Connexion réussie, vérifier/créer l'entrée admin_users
        if (signInData.user) {
          // Configurer la persistance de session
          if (rememberMe) {
            await supabase.auth.updateUser({
              data: { remember_me: true }
            });
          }

          const { error: upsertError } = await supabase
            .from('admin_users')
            .upsert({
              id: signInData.user.id,
              email: 'superadmin@chauffeur.net',
              role: 'superadmin'
            }, {
              onConflict: 'email'
            });

          if (upsertError) {
            console.error('Erreur lors de la configuration de l\'admin:', upsertError);
            setError('Erreur lors de la configuration du compte administrateur');
            return;
          }

          onLoginSuccess();
          return;
        }
      }

      // Pour les autres comptes admin
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
        options: {
          shouldCreateUser: false,
          data: {
            remember_me: rememberMe
          }
        }
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
        // Configurer la persistance de session
        if (rememberMe) {
          await supabase.auth.updateUser({
            data: { remember_me: true }
          });
        }

        // Vérifier si l'utilisateur est un administrateur
        const { data: adminData, error: adminError } = await supabase
          .from('admin_users')
          .select('*')
          .eq('id', data.user.id)
          .maybeSingle();

        if (adminError) {
          console.error('Erreur lors de la vérification admin:', adminError);
          setError('Erreur lors de la vérification du compte administrateur');
          await supabase.auth.signOut();
          return;
        }
        
        if (!adminData) {
          setError('Ce compte n\'a pas les droits administrateur. Accès refusé.');
          await supabase.auth.signOut();
          return;
        }

        onLoginSuccess();
      }
    } catch (error) {
      console.error('Erreur lors de la connexion admin:', error);
      setError('Une erreur est survenue lors de la connexion');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden max-w-md w-full">
        <div className="p-8">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 hover:text-black mb-8 transition-colors group"
          >
            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            Retour
          </button>

          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gray-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <Shield size={36} className="text-gray-700" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-3 tracking-tight">
              Administration
            </h1>
            <p className="text-gray-600 text-lg">
              Accès réservé aux administrateurs
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
                placeholder="Email administrateur"
                className="block w-full pl-10 pr-3 py-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900 transition-all text-base"
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

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="flex items-center">
              <input 
                type="checkbox" 
                id="remember-admin"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 text-gray-900 rounded border-gray-300 focus:ring-gray-900" 
              />
              <label htmlFor="remember-admin" className="ml-2 text-sm text-gray-600">
                Se souvenir de moi
              </label>
            </div>

            <Button
              type="submit"
              loading={isSubmitting}
              className="w-full py-4 bg-black hover:bg-gray-800 text-lg font-medium"
            >
              Connexion administrateur
            </Button>
          </form>

          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500 text-center">
              Accès sécurisé réservé aux administrateurs autorisés uniquement
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};