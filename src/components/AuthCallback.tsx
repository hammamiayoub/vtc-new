import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Button } from './ui/Button';

export const AuthCallback: React.FC = () => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [userType, setUserType] = useState<'driver' | 'client' | null>(null);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Récupérer les paramètres de l'URL
        const urlParams = new URLSearchParams(window.location.search);
        const accessToken = urlParams.get('access_token');
        const refreshToken = urlParams.get('refresh_token');
        const type = urlParams.get('type');

        if (type === 'signup' && accessToken && refreshToken) {
          // Définir la session avec les tokens
          const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });

          if (sessionError) {
            console.error('Erreur lors de la définition de la session:', sessionError);
            setStatus('error');
            setMessage('Erreur lors de la vérification de votre email');
            return;
          }

          if (sessionData.user) {
            // Déterminer le type d'utilisateur à partir des métadonnées
            const userData = sessionData.user.user_metadata;
            const detectedUserType = userData?.user_type;

            if (detectedUserType === 'driver') {
              // Créer le profil chauffeur
              const { error: driverError } = await supabase
                .from('drivers')
                .upsert({
                  id: sessionData.user.id,
                  first_name: userData.first_name,
                  last_name: userData.last_name,
                  email: sessionData.user.email
                }, {
                  onConflict: 'id'
                });

              if (driverError) {
                console.error('Erreur lors de la création du profil chauffeur:', driverError);
              }
              setUserType('driver');
            } else if (detectedUserType === 'client') {
              // Créer le profil client
              const { error: clientError } = await supabase
                .from('clients')
                .upsert({
                  id: sessionData.user.id,
                  first_name: userData.first_name,
                  last_name: userData.last_name,
                  email: sessionData.user.email,
                  phone: userData.phone || ''
                }, {
                  onConflict: 'id'
                });

              if (clientError) {
                console.error('Erreur lors de la création du profil client:', clientError);
              }
              setUserType('client');
            }

            setStatus('success');
            setMessage('Votre email a été vérifié avec succès !');
          }
        } else {
          setStatus('error');
          setMessage('Lien de vérification invalide ou expiré');
        }
      } catch (error) {
        console.error('Erreur lors du callback d\'authentification:', error);
        setStatus('error');
        setMessage('Une erreur est survenue lors de la vérification');
      }
    };

    handleAuthCallback();
  }, []);

  const handleContinue = () => {
    if (userType === 'driver') {
      window.location.href = '/';
    } else if (userType === 'client') {
      window.location.href = '/';
    } else {
      window.location.href = '/';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        {status === 'loading' && (
          <>
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Loader2 size={40} className="text-blue-600 animate-spin" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Vérification en cours...
            </h1>
            <p className="text-gray-600">
              Nous vérifions votre email, veuillez patienter.
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle size={40} className="text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Email vérifié !
            </h1>
            <p className="text-gray-600 mb-8">
              {message} Vous pouvez maintenant vous connecter à votre compte.
            </p>
            <Button onClick={handleContinue} className="w-full">
              Continuer vers l'application
            </Button>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle size={40} className="text-red-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Erreur de vérification
            </h1>
            <p className="text-gray-600 mb-8">
              {message}
            </p>
            <Button onClick={() => window.location.href = '/'} className="w-full">
              Retour à l'accueil
            </Button>
          </>
        )}
      </div>
    </div>
  );
};