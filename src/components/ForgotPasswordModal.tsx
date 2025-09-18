import React, { useState } from 'react';
import { Mail, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from './ui/Button';
import { supabase } from '../lib/supabase';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  userType: 'client' | 'driver';
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  isOpen,
  onClose,
  userType
}) => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      console.log('🔍 Vérification email et envoi reset pour:', email);
      console.log('🔍 Type utilisateur:', userType);
      
      // Étape 1: Vérifier que l'email existe via Edge Function
      const checkUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-user-email`;
      
      const checkResponse = await fetch(checkUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          userType: userType
        })
      });

      if (!checkResponse.ok) {
        console.error('Erreur lors de la vérification de l\'email');
        setError('Erreur lors de la vérification de l\'email. Veuillez réessayer.');
        return;
      }

      const checkResult = await checkResponse.json();
      console.log('📊 Résultat vérification email:', checkResult);

      if (!checkResult.exists) {
        setError(`Aucun compte ${userType === 'client' ? 'client' : 'chauffeur'} trouvé avec cet email.`);
        return;
      }

      // Étape 2: Envoyer l'email de réinitialisation via Edge Function
      const resetUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-password-reset`;
      
      const resetResponse = await fetch(resetUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          firstName: checkResult.userData.first_name,
          lastName: checkResult.userData.last_name,
          userType: userType
        })
      });

      if (!resetResponse.ok) {
        console.error('Erreur lors de l\'envoi de l\'email de reset');
        setError('Erreur lors de l\'envoi de l\'email. Veuillez réessayer.');
        return;
      }

      const resetResult = await resetResponse.json();
      console.log('📧 Résultat envoi email:', resetResult);

      if (!resetResult.success) {
        setError('Erreur lors de l\'envoi de l\'email. Veuillez contacter l\'administrateur.');
        return;
      }

      // Étape 3: Envoyer aussi via Supabase Auth pour le lien de reset fonctionnel
      const { error: authResetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}?type=${userType}#type=recovery`
      });

      if (authResetError) {
        console.warn('Supabase Auth reset failed, but custom email sent:', authResetError);
        // Ne pas faire échouer si l'email personnalisé a été envoyé
      }

      console.log('✅ Processus de réinitialisation terminé avec succès');
      setSuccess(true);
    } catch (error) {
      console.error('Erreur:', error);
      setError('Une erreur inattendue est survenue.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setEmail('');
    setError('');
    setSuccess(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
        <div className="p-8">
          {success ? (
            <div className="text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle size={40} className="text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Email envoyé !
              </h2>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Un email avec les instructions pour réinitialiser votre mot de passe 
                a été envoyé à <strong>{email}</strong>.
              </p>
              <p className="text-sm text-gray-500 mb-8">
                Vérifiez votre boîte de réception et vos spams. 
                Le lien sera valide pendant 1 heure.
              </p>
              <Button onClick={handleClose} className="w-full">
                Fermer
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  Mot de passe oublié
                </h2>
                <button
                  onClick={handleClose}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  ×
                </button>
              </div>

              <p className="text-gray-600 mb-6">
                Saisissez votre adresse email et nous vous enverrons un lien 
                pour créer un nouveau mot de passe.
              </p>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Votre adresse email"
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                    required
                  />
                </div>

                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}

                <Button
                  type="submit"
                  loading={isSubmitting}
                  className="w-full py-3 bg-purple-600 hover:bg-purple-700"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={16} className="mr-2 animate-spin" />
                      Envoi en cours...
                    </>
                  ) : (
                    'Envoyer le lien de réinitialisation'
                  )}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <button
                  onClick={handleClose}
                  className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Retour à la connexion
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};