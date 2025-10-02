import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { User, Mail, Lock, Eye, EyeOff, ArrowLeft, CheckCircle } from 'lucide-react';
import { Button } from './ui/Button';
import { PasswordStrengthIndicator } from './PasswordStrengthIndicator';
import { signupSchema } from '../utils/validation';
import { SignupFormData } from '../types';
import { supabase } from '../lib/supabase';

interface DriverSignupProps {
  onBack: () => void;
}

export const DriverSignup: React.FC<DriverSignupProps> = ({ onBack }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isValid }
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    mode: 'onChange'
  });

  const watchPassword = watch('password', '');

  const onSubmit = async (data: SignupFormData) => {
    setIsSubmitting(true);
    setError(null);
    
    try {
      console.log('🔍 Vérification de l\'email avant création...');
      
      // Vérifier si l'email existe déjà AVANT de créer l'utilisateur
      // Vérifier si l'email existe déjà dans la table clients
      const { data: existingClient, error: clientCheckError } = await supabase
        .from('clients')
        .select('id, email')
        .eq('email', data.email)
        .maybeSingle();

      if (clientCheckError) {
        console.error('Erreur lors de la vérification des clients:', clientCheckError);
        setError('Erreur lors de la vérification de l\'email. Veuillez réessayer.');
        setIsSubmitting(false);
        return;
      }

      if (existingClient) {
        setError('Cette adresse email est déjà utilisée par un compte client. Veuillez utiliser une autre adresse email ou vous connecter avec votre compte client.');
        setIsSubmitting(false);
        return;
      }

      // Vérifier si l'email existe déjà dans la table drivers
      const { data: existingDriver, error: driverCheckError } = await supabase
        .from('drivers')
        .select('id, email')
        .eq('email', data.email)
        .maybeSingle();

      if (driverCheckError) {
        console.error('Erreur lors de la vérification des chauffeurs:', driverCheckError);
        setError('Erreur lors de la vérification de l\'email. Veuillez réessayer.');
        setIsSubmitting(false);
        return;
      }

      if (existingDriver) {
        setError('Cette adresse email est déjà utilisée par un compte chauffeur. Veuillez utiliser une autre adresse email ou vous connecter avec votre compte chauffeur.');
        setIsSubmitting(false);
        return;
      }

      console.log('✅ Email libre, création de l\'utilisateur...');
      
      // Si l'email n'existe pas, créer l'utilisateur
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: undefined, // Désactiver la redirection email
          data: {
            first_name: data.firstName,
            last_name: data.lastName,
            email_confirm: true // Désactiver la confirmation par email
          }
        }
      });

      console.log('📧 Réponse Supabase Auth:', { authData, authError });

      if (authError) {
        console.error('❌ Erreur Supabase Auth:', authError);
        
        if (authError.message.includes('email_address_invalid')) {
          setError('Cet email a été rejeté par le serveur. Veuillez essayer avec une adresse email différente.');
          setIsSubmitting(false);
          return;
        }
        
        if (authError.message.includes('invalid') && authError.message.includes('email')) {
          setError('Email rejeté par le serveur. Essayez avec un email différent.');
          setIsSubmitting(false);
          return;
        }
        
        if (authError.message.includes('over_email_send_rate_limit')) {
          setError('Trop de tentatives d\'inscription. Veuillez attendre quelques secondes avant de réessayer.');
        } else {
          setError(`Erreur lors de l'inscription: ${authError.message}`);
        }
        setIsSubmitting(false);
        return;
      }

      console.log('✅ Utilisateur créé avec succès:', authData.user?.id);

      // Insérer les détails du chauffeur dans la table drivers
      if (authData.user) {
        console.log('📝 Insertion du profil chauffeur...');
        
        const { error: profileError } = await supabase
          .from('drivers')
          .insert({
            id: authData.user.id,
            first_name: data.firstName,
            last_name: data.lastName,
            email: data.email
          });

        if (profileError) {
          console.error('❌ Erreur profil chauffeur:', profileError);
          setError(`Erreur lors de la création du profil: ${profileError.message}`);
          setIsSubmitting(false);
          return;
        }
        
        console.log('✅ Profil chauffeur créé avec succès');

        // Déclencher la conversion Google Ads
        try {
          import('../utils/googleAdsTrigger').then(({ triggerGoogleAdsConversion }) => {
            triggerGoogleAdsConversion('signup');
          });
        } catch (conversionError) {
          console.warn('⚠️ Erreur lors du déclenchement de la conversion Google Ads:', conversionError);
        }

        // Envoyer une notification au support
        try {
          const notificationUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-signup-notification`;
          
          await fetch(notificationUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              userData: {
                first_name: data.firstName,
                last_name: data.lastName,
                email: data.email,
                phone: '',
                city: '',
                vehicle_make: '',
                vehicle_model: '',
                status: 'pending',
                created_at: new Date().toISOString()
              },
              userType: 'driver'
            })
          });
          
          console.log('✅ Notification d\'inscription envoyée au support');
        } catch (notificationError) {
          console.warn('⚠️ Erreur lors de l\'envoi de la notification:', notificationError);
          // Ne pas faire échouer l'inscription si la notification échoue
        }
      }

      console.log('🎉 Inscription terminée avec succès');
      setSubmitSuccess(true);
      
    } catch (error) {
      setError('Une erreur inattendue s\'est produite. Veuillez réessayer.');
      console.error('Erreur lors de l\'inscription:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-lg w-full text-center">
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
            <CheckCircle size={48} className="text-green-600" />
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-6">🎉 Inscription réussie !</h1>
          
          <div className="bg-blue-50 border-l-4 border-blue-400 p-6 mb-8 rounded-r-lg">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <Mail className="h-6 w-6 text-blue-600 mt-1" />
              </div>
              <div className="ml-3 text-left">
                <h3 className="text-lg font-semibold text-blue-800 mb-3">
                  📧 Vérifiez votre boîte email
                </h3>
                <p className="text-blue-700 mb-4 leading-relaxed">
                  Nous avons envoyé un email de confirmation à votre adresse. 
                  <strong> Cliquez sur le lien dans l'email pour activer votre compte chauffeur.</strong>
                </p>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-yellow-800 text-sm font-medium">
                    ⚠️ <strong>Important :</strong> Vérifiez aussi votre dossier <strong>Spam</strong> ou <strong>Courrier indésirable</strong> si vous ne recevez pas l'email dans les prochaines minutes.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 mb-8">
            <h4 className="font-semibold text-gray-800 mb-2">Prochaines étapes :</h4>
            <ul className="text-sm text-gray-600 space-y-1 text-left">
              <li>• Vérifiez votre boîte email (et le dossier spam)</li>
              <li>• Cliquez sur le lien de confirmation</li>
              <li>• Connectez-vous à votre compte chauffeur</li>
              <li>• Complétez votre profil et commencez à recevoir des courses !</li>
            </ul>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-8">
            <h4 className="font-semibold text-green-800 mb-2">🚗 Bienvenue dans l'équipe TuniDrive !</h4>
            <p className="text-green-700 text-sm">
              Une fois votre compte activé, vous pourrez compléter votre profil chauffeur et commencer à recevoir des demandes de courses.
            </p>
          </div>

          <Button onClick={onBack} className="w-full bg-blue-600 hover:bg-blue-700 text-lg py-3">
            Retour à l'accueil
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden max-w-4xl w-full">
        <div className="flex flex-col lg:flex-row">
          {/* Left side - Form */}
          <div className="flex-1 p-8 lg:p-12">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-gray-600 hover:text-blue-600 mb-8 transition-colors group"
            >
              <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
              Retour
            </button>

            <div className="mb-8">
              <h1 className="text-4xl font-bold text-gray-900 mb-3">
                Devenez chauffeur
              </h1>
              <p className="text-gray-600 text-lg">
                Rejoignez TuniDrive - notre réseau de chauffeurs professionnels
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-800 text-sm">{error}</p>
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-6">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    {...register('firstName')}
                    type="text"
                    placeholder="Prénom"
                    className={`block w-full pl-10 pr-3 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                      errors.firstName ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.firstName && (
                    <p className="mt-2 text-sm text-red-600">{errors.firstName.message}</p>
                  )}
                </div>

                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    {...register('lastName')}
                    type="text"
                    placeholder="Nom"
                    className={`block w-full pl-10 pr-3 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                      errors.lastName ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.lastName && (
                    <p className="mt-2 text-sm text-red-600">{errors.lastName.message}</p>
                  )}
                </div>
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  {...register('email')}
                  type="email"
                  placeholder="Adresse email"
                  className={`block w-full pl-10 pr-3 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                    errors.email ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.email && (
                  <p className="mt-2 text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Mot de passe"
                  className={`block w-full pl-10 pr-12 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                    errors.password ? 'border-red-500' : 'border-gray-300'
                  }`}
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
                {errors.password && (
                  <p className="mt-2 text-sm text-red-600">{errors.password.message}</p>
                )}
              </div>

              {watchPassword && (
                <PasswordStrengthIndicator 
                  password={watchPassword} 
                  className="bg-gray-50 p-4 rounded-lg"
                />
              )}

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  {...register('confirmPassword')}
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirmer le mot de passe"
                  className={`block w-full pl-10 pr-12 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                    errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                  }`}
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
                {errors.confirmPassword && (
                  <p className="mt-2 text-sm text-red-600">{errors.confirmPassword.message}</p>
                )}
              </div>

              <Button
                type="submit"
                loading={isSubmitting}
                disabled={!isValid || isSubmitting}
                className="w-full py-4 text-lg"
              >
                {isSubmitting ? 'Création du compte...' : 'Créer mon compte chauffeur'}
              </Button>

              <p className="text-sm text-gray-500 text-center">
                En créant votre compte, vous acceptez nos{' '}
                <a 
                  href="#" 
                  className="text-blue-600 hover:underline"
                  onClick={(e) => {
                    e.preventDefault();
                    window.open('/terms-of-service', '_blank');
                  }}
                >
                  conditions d'utilisation
                </a>{' '}
                et notre{' '}
                <a 
                  href="#" 
                  className="text-blue-600 hover:underline"
                  onClick={(e) => {
                    e.preventDefault();
                    window.open('/privacy-policy', '_blank');
                  }}
                >
                  politique de confidentialité
                </a>.
              </p>
            </form>
          </div>

          {/* Right side - Benefits */}
          <div className="lg:w-96 bg-black p-8 lg:p-12 text-white">
            <h2 className="text-3xl font-bold mb-8">Avantages chauffeur</h2>
            <div className="space-y-6">
              {[
                'Revenus attractifs et transparents',
                'Flexibilité totale des horaires',
                'Support 24/7 dédiée aux chauffeurs'
              ].map((benefit, index) => (
                <div key={index} className="flex items-center gap-3">
                  <CheckCircle size={20} className="text-gray-400 flex-shrink-0" />
                  <span className="text-gray-200">{benefit}</span>
                </div>
              ))}
            </div>

            <div className="mt-12 p-6 bg-gray-800 rounded-xl">
              <h3 className="font-semibold text-lg mb-2">Prêt à commencer ?</h3>
              <p className="text-gray-300 text-sm">
                L'inscription ne prend que quelques minutes. Commencez à recevoir 
                vos premières courses dès aujourd'hui.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};