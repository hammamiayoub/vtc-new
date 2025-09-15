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
      console.log('🔍 Envoi demande de réinitialisation pour:', email);
      console.log('🔍 Type utilisateur:', userType);
      
      // Envoyer directement l'email de réinitialisation via Supabase Auth
      // Supabase Auth vérifiera automatiquement si l'email existe
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}?type=${userType}#type=recovery`
      });

      if (resetError) {
        console.error('Erreur lors de l\'envoi de l\'email:', resetError);
        
        if (resetError.message.includes('User not found') || resetError.message.includes('user_not_found')) {
          setError(`Aucun compte ${userType === 'client' ? 'client' : 'chauffeur'} trouvé avec cet email.`);
        } else if (resetError.message.includes('rate limit')) {
          setError('Trop de tentatives. Veuillez attendre quelques minutes avant de réessayer.');
        } else if (resetError.message.includes('Error sending recovery email') || resetError.message.includes('unexpected_failure')) {
          setError('Service d\'email temporairement indisponible. Veuillez contacter l\'administrateur ou réessayer plus tard.');
        } else {
          setError('Erreur lors de l\'envoi de l\'email. Veuillez réessayer.');
        }
        return;
      }

      console.log('✅ Email de réinitialisation envoyé avec succès');
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