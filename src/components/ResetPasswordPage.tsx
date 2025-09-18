import React, { useState, useEffect } from 'react';
import { Lock, Eye, EyeOff, CheckCircle, ArrowLeft } from 'lucide-react';
import { Button } from './ui/Button';
import { PasswordStrengthIndicator } from './PasswordStrengthIndicator';
import { supabase } from '../lib/supabase';

interface ResetPasswordPageProps {
  onBack: () => void;
  onSuccess: () => void;
}

export const ResetPasswordPage: React.FC<ResetPasswordPageProps> = ({ 
  onBack, 
  onSuccess 
}) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [userType, setUserType] = useState<'client' | 'driver' | null>(null);

  useEffect(() => {
    // Récupérer le type d'utilisateur depuis l'URL
    const urlParams = new URLSearchParams(window.location.search);
    const type = urlParams.get('type') as 'client' | 'driver';
    if (type) {
      setUserType(type);
    }

    // Vérifier si l'utilisateur a une session de réinitialisation
    const checkSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error('Erreur lors de la vérification de session:', error);
        setError('Session de réinitialisation invalide. Veuillez demander un nouveau lien de réinitialisation.');
        return;
      }
      
      if (!session) {
        console.log('Aucune session trouvée, redirection vers la page de connexion');
        setError('Session de réinitialisation expirée. Veuillez demander un nouveau lien de réinitialisation.');
        return;
      }
      
      console.log('Session de réinitialisation trouvée:', session.user?.id);
    };

    checkSession();
  }, []);

  const validatePassword = (pwd: string) => {
    const requirements = [
      { test: pwd.length >= 8, message: 'Au moins 8 caractères' },
      { test: /[a-z]/.test(pwd), message: 'Une lettre minuscule' },
      { test: /[A-Z]/.test(pwd), message: 'Une lettre majuscule' },
      { test: /\d/.test(pwd), message: 'Un chiffre' },
      { test: /[^a-zA-Z0-9]/.test(pwd), message: 'Un caractère spécial' }
    ];
    return requirements.every(req => req.test);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validatePassword(password)) {
      setError('Le mot de passe ne respecte pas les critères de sécurité');
      return;
    }

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    setIsSubmitting(true);

    try {
      // Vérifier d'abord que l'utilisateur a une session valide
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        console.error('Session invalide:', sessionError);
        setError('Session de réinitialisation expirée. Veuillez demander un nouveau lien de réinitialisation.');
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      });

      if (updateError) {
        console.error('Erreur lors de la mise à jour du mot de passe:', updateError);
        if (updateError.message.includes('AuthSessionMissingError')) {
          setError('Session de réinitialisation expirée. Veuillez demander un nouveau lien de réinitialisation.');
        } else {
          setError('Erreur lors de la mise à jour du mot de passe: ' + updateError.message);
        }
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 2000);
    } catch (error) {
      console.error('Erreur:', error);
      setError('Une erreur inattendue est survenue');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={40} className="text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Mot de passe mis à jour !
          </h1>
          <p className="text-gray-600 mb-8 leading-relaxed">
            Votre nouveau mot de passe a été enregistré avec succès. 
            Vous allez être redirigé vers la page de connexion.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden max-w-md w-full">
        <div className="p-8">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-8 transition-colors group"
          >
            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            Retour
          </button>

          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Lock size={36} className="text-purple-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-3">
              Nouveau mot de passe
            </h1>
            <p className="text-gray-600">
              Créez un nouveau mot de passe sécurisé pour votre compte {userType === 'client' ? 'client' : 'chauffeur'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nouveau mot de passe"
                className="block w-full pl-10 pr-12 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
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

            {password && (
              <PasswordStrengthIndicator 
                password={password} 
                className="bg-gray-50 p-4 rounded-lg"
              />
            )}

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirmer le nouveau mot de passe"
                className="block w-full pl-10 pr-12 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                ) : (
                  <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                )}
              </button>
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              loading={isSubmitting}
              disabled={!password || !confirmPassword || password !== confirmPassword}
              className="w-full py-3 bg-purple-600 hover:bg-purple-700"
            >
              Mettre à jour le mot de passe
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};