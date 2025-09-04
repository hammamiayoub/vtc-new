import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

interface AuthCallbackProps {
  onDriverSuccess: () => void;
  onClientSuccess: () => void;
  onError: () => void;
}

export const AuthCallback: React.FC<AuthCallbackProps> = ({ 
  onDriverSuccess, 
  onClientSuccess, 
  onError 
}) => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Finalisation de la connexion...');

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Erreur lors de la récupération de la session:', error);
          setStatus('error');
          setMessage('Erreur lors de la connexion');
          setTimeout(onError, 2000);
          return;
        }

        if (data.session?.user) {
          const user = data.session.user;
          const userType = searchParams.get('type') || 'client';
          
          console.log('Utilisateur OAuth connecté:', user.id);
          console.log('Type d\'utilisateur:', userType);
          console.log('Métadonnées utilisateur:', user.user_metadata);

          // Créer le profil selon le type d'utilisateur
          if (userType === 'driver') {
            // Vérifier si le chauffeur existe déjà
            const { data: existingDriver, error: driverCheckError } = await supabase
              .from('drivers')
              .select('*')
              .eq('id', user.id)
              .single();

            if (driverCheckError && driverCheckError.code !== 'PGRST116') {
              console.error('Erreur lors de la vérification du chauffeur:', driverCheckError);
              throw driverCheckError;
            }

            if (!existingDriver) {
              // Créer le profil chauffeur
              const { error: driverError } = await supabase
                .from('drivers')
                .insert({
                  id: user.id,
                  first_name: user.user_metadata.full_name?.split(' ')[0] || user.user_metadata.name || 'Prénom',
                  last_name: user.user_metadata.full_name?.split(' ').slice(1).join(' ') || 'Nom',
                  email: user.email || '',
                  status: 'pending'
                });

              if (driverError) {
                console.error('Erreur lors de la création du profil chauffeur:', driverError);
                throw driverError;
              }
            }

            setStatus('success');
            setMessage('Connexion chauffeur réussie !');
            setTimeout(onDriverSuccess, 1500);
            
          } else {
            // Vérifier si le client existe déjà
            const { data: existingClient, error: clientCheckError } = await supabase
              .from('clients')
              .select('*')
              .eq('id', user.id)
              .single();

            if (clientCheckError && clientCheckError.code !== 'PGRST116') {
              console.error('Erreur lors de la vérification du client:', clientCheckError);
              throw clientCheckError;
            }

            if (!existingClient) {
              // Créer le profil client
              const { error: clientError } = await supabase
                .from('clients')
                .insert({
                  id: user.id,
                  first_name: user.user_metadata.full_name?.split(' ')[0] || user.user_metadata.name || 'Prénom',
                  last_name: user.user_metadata.full_name?.split(' ').slice(1).join(' ') || 'Nom',
                  email: user.email || '',
                  phone: user.user_metadata.phone || '',
                  status: 'active'
                });

              if (clientError) {
                console.error('Erreur lors de la création du profil client:', clientError);
                throw clientError;
              }
            }

            setStatus('success');
            setMessage('Connexion client réussie !');
            setTimeout(onClientSuccess, 1500);
          }
        } else {
          setStatus('error');
          setMessage('Aucune session utilisateur trouvée');
          setTimeout(onError, 2000);
        }
      } catch (error) {
        console.error('Erreur lors du callback OAuth:', error);
        setStatus('error');
        setMessage('Une erreur est survenue lors de la connexion');
        setTimeout(onError, 2000);
      }
    };

    handleAuthCallback();
  }, [searchParams, onDriverSuccess, onClientSuccess, onError]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        {status === 'loading' && (
          <>
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Loader2 size={32} className="text-blue-600 animate-spin" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Connexion en cours...
            </h2>
            <p className="text-gray-600">{message}</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle size={32} className="text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Connexion réussie !
            </h2>
            <p className="text-gray-600">{message}</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <XCircle size={32} className="text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Erreur de connexion
            </h2>
            <p className="text-gray-600">{message}</p>
          </>
        )}
      </div>
    </div>
  );
};