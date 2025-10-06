import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { User, Mail, Lock, Eye, EyeOff, ArrowLeft, CheckCircle, Phone, MapPin, AlertCircle } from 'lucide-react';
import { Button } from './ui/Button';
import { CityInput } from './ui/CityInput';
import { PasswordStrengthIndicator } from './PasswordStrengthIndicator';
import { clientSignupSchema } from '../utils/validation';
import { ClientSignupFormData } from '../types';
import { supabase } from '../lib/supabase';

interface ClientSignupProps {
  onBack: () => void;
}

export const ClientSignup: React.FC<ClientSignupProps> = ({ onBack }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cityValue, setCityValue] = useState('');

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isValid }
  } = useForm<ClientSignupFormData>({
    resolver: zodResolver(clientSignupSchema),
    mode: 'onChange'
  });

  const watchPassword = watch('password', '');

  // Synchroniser la ville avec le formulaire
  useEffect(() => {
    setValue('city', cityValue);
  }, [cityValue, setValue]);

  const onSubmit = async (data: ClientSignupFormData) => {
    setIsSubmitting(true);
    setError(null);
    try {
      // Vérifier si l'email existe déjà AVANT de créer l'utilisateur
      console.log('🔍 Vérification de l\'email avant création...');
      
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
        setError('Cette adresse email est déjà utilisée par un compte client. Veuillez utiliser une autre adresse email ou vous connecter avec votre compte existant.');
        setIsSubmitting(false);
        return;
      }

      console.log('✅ Email libre, création de l\'utilisateur...');
      
      // Si l'email n'existe pas, créer l'utilisateur
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            first_name: data.firstName,
            last_name: data.lastName,
            user_type: 'client',
          },
        },
      });

      if (authError) {
        console.error("Erreur lors de l'inscription:", authError);
        if (authError.message.includes('email_address_invalid')) {
          setError('Cet email a été rejeté par le serveur. Veuillez essayer avec une adresse email différente.');
        } else if (authError.message.includes('over_email_send_rate_limit')) {
          setError('Trop de tentatives d\'inscription. Veuillez attendre quelques secondes avant de réessayer.');
        } else {
          setError(`Erreur lors de l'inscription: ${authError.message}`);
        }
        setIsSubmitting(false);
        return;
      }

      if (authData.user) {
        console.log('✅ Utilisateur créé, insertion du profil...');
        
        // Insérer le profil client
        const { error: profileError } = await supabase
          .from('clients')
          .insert({
            id: authData.user.id,
            first_name: data.firstName,
            last_name: data.lastName,
            email: data.email,
            phone: data.phone,
            city: data.city,
          });

        if (profileError) {
          console.error('Erreur lors de la création du profil client:', profileError);
          setError(`Erreur lors de la création du profil: ${profileError.message}`);
          setIsSubmitting(false);
          return;
        }

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
          
          const response = await fetch(notificationUrl, {
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
                phone: data.phone,
                city: data.city,
                created_at: new Date().toISOString()
              },
              userType: 'client'
            })
          });

          if (!response.ok) {
            console.warn('⚠️ Erreur lors de l\'envoi de la notification:', response.status, response.statusText);
            return; // Ne pas faire échouer l'inscription
          }
          
          console.log('✅ Notification d\'inscription envoyée au support');
        } catch (notificationError) {
          console.warn('⚠️ Erreur lors de l\'envoi de la notification:', notificationError);
          // Ne pas faire échouer l'inscription si la notification échoue
        }
      }

      setSubmitSuccess(true);
    } catch (error) {
      console.error("Erreur lors de l'inscription client:", error);
    } finally {
      setIsSubmitting(false);
    }
  };


  if (submitSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50 flex items-center justify-center p-4">
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
                  <strong> Cliquez sur le lien dans l'email pour activer votre compte.</strong>
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
              <li>• Connectez-vous à votre compte</li>
              <li>• Commencez à réserver vos courses !</li>
            </ul>
          </div>

          <Button onClick={onBack} className="w-full bg-purple-600 hover:bg-purple-700 text-lg py-3">
            Retour à l'accueil
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden max-w-4xl w-full">
        <div className="flex flex-col lg:flex-row">
          {/* Left side - Form */}
          <div className="flex-1 p-6 sm:p-8 lg:p-12">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-gray-600 hover:text-purple-600 mb-6 sm:mb-8 transition-colors group"
            >
              <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
              Retour
            </button>

            <div className="mb-6 sm:mb-8">
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">Créer un compte client</h1>
              <p className="text-gray-600 text-base sm:text-lg">Rejoignez TuniDrive pour réserver vos courses</p>
            </div>

            {/* Affichage des erreurs */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                  <p className="text-red-800 text-sm font-medium">{error}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 sm:space-y-6">
              {/* Prénom / Nom */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    {...register('firstName')}
                    type="text"
                    placeholder="Prénom"
                    autoComplete="given-name"
                    className={`block w-full pl-10 pr-3 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all ${
                      errors.firstName ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.firstName && <p className="mt-2 text-sm text-red-600">{errors.firstName.message}</p>}
                </div>

                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    {...register('lastName')}
                    type="text"
                    placeholder="Nom"
                    autoComplete="family-name"
                    className={`block w-full pl-10 pr-3 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all ${
                      errors.lastName ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.lastName && <p className="mt-2 text-sm text-red-600">{errors.lastName.message}</p>}
                </div>
              </div>

              {/* Email */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  {...register('email')}
                  type="email"
                  placeholder="Adresse email"
                  autoComplete="email"
                  inputMode="email"
                  className={`block w-full pl-10 pr-3 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all ${
                    errors.email ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.email && <p className="mt-2 text-sm text-red-600">{errors.email.message}</p>}
              </div>

              {/* Téléphone */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Phone className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  {...register('phone')}
                  type="tel"
                  placeholder="Numéro de téléphone (8 chiffres)"
                  autoComplete="tel"
                  inputMode="numeric"
                  pattern="[0-9]{8}"
                  className={`block w-full pl-10 pr-3 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all ${
                    errors.phone ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.phone && <p className="mt-2 text-sm text-red-600">{errors.phone.message}</p>}
              </div>

              {/* VILLE — déplacé ICI sous téléphone */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MapPin className="h-5 w-5 text-gray-400" />
                </div>
                  <CityInput
                    value={cityValue}
                    onChange={setCityValue}
                    placeholder="Ville de résidence"
                    error={errors.city?.message}
                    required
                  />
                {errors.city && <p className="mt-2 text-sm text-red-600">{errors.city.message}</p>}
              </div>

              {/* MOT DE PASSE — vient après la ville */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Mot de passe"
                  autoComplete="new-password"
                  className={`block w-full pl-10 pr-12 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all ${
                    errors.password ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                >
                  {showPassword ? <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" /> : <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />}
                </button>
                {errors.password && <p className="mt-2 text-sm text-red-600">{errors.password.message}</p>}
              </div>

              {/* Indicateur de force */}
              {watchPassword && (
                <PasswordStrengthIndicator password={watchPassword} className="bg-gray-50 p-4 rounded-lg" />
              )}

              {/* CONFIRMER — vient en dernier */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  {...register('confirmPassword')}
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirmer le mot de passe"
                  autoComplete="new-password"
                  className={`block w-full pl-10 pr-12 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all ${
                    errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  aria-label={showConfirmPassword ? 'Masquer la confirmation' : 'Afficher la confirmation'}
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" /> : <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />}
                </button>
                {errors.confirmPassword && (
                  <p className="mt-2 text-sm text-red-600">{errors.confirmPassword.message}</p>
                )}
              </div>

              <Button
                type="submit"
                loading={isSubmitting}
                disabled={!isValid || isSubmitting}
                className="w-full py-4 text-lg bg-purple-600 hover:bg-purple-700 focus:ring-purple-500"
              >
                {isSubmitting ? 'Création du compte...' : 'Créer mon compte client'}
              </Button>


              <p className="text-sm text-gray-500 text-center">
                En créant votre compte, vous acceptez nos{' '}
                <a
                  href="#"
                  className="text-purple-600 hover:underline"
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
                  className="text-purple-600 hover:underline"
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
            <h2 className="text-3xl font-bold mb-8">Avantages client</h2>
            <div className="space-y-6">
              {[
                'Réservation en quelques clics',
                'Chauffeurs professionnels vérifiés',
                'Tarifs transparents et compétitifs',
                'Suivi en temps réel de votre course',
                'Support client 24/7',
              ].map((benefit, index) => (
                <div key={index} className="flex items-center gap-3">
                  <CheckCircle size={20} className="text-gray-400 flex-shrink-0" />
                  <span className="text-gray-200">{benefit}</span>
                </div>
              ))}
            </div>

            <div className="mt-12 p-6 bg-gray-800 rounded-xl">
              <h3 className="font-semibold text-lg mb-2">Prêt à voyager ?</h3>
              <p className="text-gray-300 text-sm">
                Créez votre compte en quelques minutes et réservez votre première
                course dès maintenant.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
