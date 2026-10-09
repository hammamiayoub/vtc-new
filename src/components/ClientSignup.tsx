import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { User, Mail, Lock, Eye, EyeOff, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import { SignupCountryPhoneFields } from './ui/SignupCountryPhoneFields';
import { Button } from './ui/Button';
import { CityInput } from './ui/CityInput';
import { PasswordStrengthIndicator } from './PasswordStrengthIndicator';
import { clientSignupSchema, normalizePhone } from '../utils/validation';
import { ClientSignupFormData } from '../types';
import type { SignupCountryCode } from '../utils/signupCountries';
import { supabase } from '../lib/supabase';
import { hasPendingQuote } from '../utils/pendingQuote';
import { TrustSignals } from './TrustSignals';
import { useLocale } from '../i18n/locale';
import { translateSignupMessage } from '../i18n/signupErrors';

interface ClientSignupProps {
  onBack: () => void;
}

export const ClientSignup: React.FC<ClientSignupProps> = ({ onBack }) => {
  const { locale, href } = useLocale();
  const en = locale === 'en';
  const te = (message?: string) => translateSignupMessage(message, locale);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isValid }
  } = useForm<ClientSignupFormData>({
    resolver: zodResolver(clientSignupSchema),
    mode: 'onChange',
    defaultValues: {
      country: 'TN',
      city: '',
    },
  });

  const watchPassword = watch('password', '');
  const watchCountry = watch('country', 'TN') as SignupCountryCode;
  const watchCity = watch('city', '');
  const prevCountryRef = useRef(watchCountry);

  const handleCityChange = (value: string) => {
    setValue('city', value, { shouldValidate: true, shouldDirty: true });
  };

  useEffect(() => {
    if (prevCountryRef.current !== watchCountry) {
      setValue('city', '', { shouldValidate: true });
      prevCountryRef.current = watchCountry;
    }
  }, [watchCountry, setValue]);

  const onSubmit = async (data: ClientSignupFormData) => {
    setIsSubmitting(true);
    setError(null);
    // Normalisation du numéro avant envoi (sécurité si onBlur n'a pas encore été déclenché)
    data.phone = normalizePhone(data.phone, data.country);
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
            country: data.country,
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
                country: data.country,
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-lg w-full text-center">
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
            <CheckCircle size={48} className="text-green-600" />
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-6">{en ? 'Signup complete' : 'Inscription réussie'}</h1>
          
          <div className="bg-blue-50 border-l-4 border-blue-400 p-6 mb-8 rounded-r-lg">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <Mail className="h-6 w-6 text-blue-600 mt-1" />
              </div>
              <div className="ml-3 text-left">
                <h3 className="text-lg font-semibold text-blue-800 mb-3">
                  {en ? 'Check your inbox' : 'Vérifiez votre boîte email'}
                </h3>
                <p className="text-blue-700 mb-4 leading-relaxed">
                  {en
                    ? 'We sent a confirmation email to your address. '
                    : 'Nous avons envoyé un email de confirmation à votre adresse. '}
                  <strong>{en ? 'Click the link in the email to activate your account.' : "Cliquez sur le lien dans l'email pour activer votre compte."}</strong>
                </p>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-yellow-800 text-sm font-medium">
                    <strong>{en ? 'Important:' : 'Important :'}</strong>{' '}
                    {en
                      ? 'Also check your spam folder if the email does not arrive in the next few minutes.'
                      : "Vérifiez aussi votre dossier Spam ou Courrier indésirable si vous ne recevez pas l'email dans les prochaines minutes."}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 mb-8">
            <h4 className="font-semibold text-gray-800 mb-2">{en ? 'Next steps:' : 'Prochaines étapes :'}</h4>
            <ul className="text-sm text-gray-600 space-y-1 text-left">
              {(en
                ? ['Check your inbox (and spam)', 'Click the confirmation link', 'Sign in to your account', 'Start booking your rides']
                : ['Vérifiez votre boîte email (et le dossier spam)', 'Cliquez sur le lien de confirmation', 'Connectez-vous à votre compte', 'Commencez à réserver vos courses !']
              ).map((line) => (
                <li key={line}>• {line}</li>
              ))}
            </ul>
          </div>

          <Button onClick={onBack} className="w-full bg-black hover:bg-gray-800 text-lg py-3">
            {en ? 'Back to home' : "Retour à l'accueil"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-gray-50 flex items-start sm:items-center justify-center p-4 sm:p-6 py-6 sm:py-8 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden max-w-4xl w-full my-auto">
        <div className="flex flex-col lg:flex-row">
          {/* Avantages — au-dessus du formulaire sur mobile */}
          <div className="order-1 lg:order-2 lg:w-96 bg-black p-6 sm:p-8 lg:p-12 text-white">
            <h2 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8">{en ? 'Rider benefits' : 'Avantages client'}</h2>
            <div className="space-y-4 sm:space-y-6">
              {(en
                ? ['Booking in a few clicks', 'Verified professional drivers', 'Transparent, competitive fares', 'Live tracking of your ride', '24/7 rider support']
                : ['Réservation en quelques clics', 'Chauffeurs professionnels vérifiés', 'Tarifs transparents et compétitifs', 'Suivi en temps réel de votre course', 'Support client 24/7']
              ).map((benefit, index) => (
                <div key={index} className="flex items-center gap-3">
                  <CheckCircle size={20} className="text-gray-400 flex-shrink-0" />
                  <span className="text-gray-200 text-sm sm:text-base">{benefit}</span>
                </div>
              ))}
            </div>

            <div className="mt-8 sm:mt-12 p-5 sm:p-6 bg-gray-800 rounded-xl">
              <h3 className="font-semibold text-lg mb-2">{en ? 'Ready to go?' : 'Prêt à voyager ?'}</h3>
              <p className="text-gray-300 text-sm">
                {en
                  ? 'Create your account in a few minutes and book your first ride now.'
                  : 'Créez votre compte en quelques minutes et réservez votre première course dès maintenant.'}
              </p>
            </div>
          </div>

          {/* Formulaire */}
          <div className="order-2 lg:order-1 flex-1 p-6 sm:p-8 lg:p-12">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 sm:mb-8 transition-colors group"
            >
              <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
              {en ? 'Back' : 'Retour'}
            </button>

            <div className="mb-6 sm:mb-8">
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">{en ? 'Create a rider account' : 'Créer un compte client'}</h1>
              <p className="text-gray-600 text-base sm:text-lg">
                {hasPendingQuote()
                  ? (en ? 'Finish your booking by creating an account' : 'Finalisez votre réservation en créant votre compte')
                  : (en ? 'Join TuniDrive to book your rides' : 'Rejoignez TuniDrive pour réserver vos courses')}
              </p>
            </div>

            {hasPendingQuote() && (
              <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                {en
                  ? 'Your homepage quote will be kept after you confirm your email and sign in.'
                  : "Votre devis depuis l'accueil sera repris après confirmation de l'email et connexion."}
              </div>
            )}

            <TrustSignals variant="compact" className="mb-6" />

            {/* Affichage des erreurs */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                  <p className="text-red-800 text-sm font-medium">{te(error ?? undefined)}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 sm:space-y-6">
              {/* Prénom / Nom */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <div className="relative">
                  <div className="absolute top-0 left-0 pl-3 h-12 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    {...register('firstName')}
                    type="text"
                    placeholder={en ? 'First name' : 'Prénom'}
                    autoComplete="given-name"
                    className={`block w-full pl-10 pr-3 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 transition-all ${
                      errors.firstName ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.firstName && <p className="mt-2 text-sm text-red-600">{te(errors.firstName.message)}</p>}
                </div>

                <div className="relative">
                  <div className="absolute top-0 left-0 pl-3 h-12 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    {...register('lastName')}
                    type="text"
                    placeholder={en ? 'Last name' : 'Nom'}
                    autoComplete="family-name"
                    className={`block w-full pl-10 pr-3 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 transition-all ${
                      errors.lastName ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.lastName && <p className="mt-2 text-sm text-red-600">{te(errors.lastName.message)}</p>}
                </div>
              </div>

              {/* Email */}
                <div className="relative">
                  <div className="absolute top-0 left-0 pl-3 h-12 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                <input
                  {...register('email')}
                  type="email"
                  placeholder={en ? 'Email address' : 'Adresse email'}
                  autoComplete="email"
                  inputMode="email"
                  className={`block w-full pl-10 pr-3 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 transition-all ${
                    errors.email ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.email && <p className="mt-2 text-sm text-red-600">{te(errors.email.message)}</p>}
              </div>

              <SignupCountryPhoneFields
                register={register}
                errors={errors}
                setValue={setValue}
                watch={watch}
                focusRingClass="focus:ring-2 focus:ring-gray-900"
              />

              <div>
                <label htmlFor="client-city" className="block text-sm font-medium text-gray-700 mb-1">
                  {en ? 'City' : 'Ville'}
                </label>
                <CityInput
                  value={watchCity}
                  onChange={handleCityChange}
                  country={watchCountry}
                  placeholder={en ? 'Search for your city' : 'Rechercher votre ville'}
                  error={te(errors.city?.message)}
                  required
                />
              </div>

              {/* MOT DE PASSE — vient après la ville */}
              <div className="relative">
                <div className="absolute top-0 left-0 pl-3 h-12 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  placeholder={en ? 'Password' : 'Mot de passe'}
                  autoComplete="new-password"
                  className={`block w-full pl-10 pr-12 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 transition-all ${
                    errors.password ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute top-0 right-0 pr-3 h-12 flex items-center"
                  aria-label={showPassword ? (en ? 'Hide password' : 'Masquer le mot de passe') : (en ? 'Show password' : 'Afficher le mot de passe')}
                >
                  {showPassword ? <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" /> : <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />}
                </button>
                {errors.password && <p className="mt-2 text-sm text-red-600">{te(errors.password.message)}</p>}
              </div>

              {/* Indicateur de force */}
              {watchPassword && (
                <PasswordStrengthIndicator password={watchPassword} className="bg-gray-50 p-4 rounded-lg" />
              )}

              {/* CONFIRMER — vient en dernier */}
              <div className="relative">
                <div className="absolute top-0 left-0 pl-3 h-12 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  {...register('confirmPassword')}
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder={en ? 'Confirm password' : 'Confirmer le mot de passe'}
                  autoComplete="new-password"
                  className={`block w-full pl-10 pr-12 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 transition-all ${
                    errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  className="absolute top-0 right-0 pr-3 h-12 flex items-center"
                  aria-label={showConfirmPassword ? (en ? 'Hide confirmation' : 'Masquer la confirmation') : (en ? 'Show confirmation' : 'Afficher la confirmation')}
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" /> : <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />}
                </button>
                {errors.confirmPassword && (
                  <p className="mt-2 text-sm text-red-600">{te(errors.confirmPassword.message)}</p>
                )}
              </div>

              <Button
                type="submit"
                loading={isSubmitting}
                disabled={!isValid || isSubmitting}
                className="w-full py-4 text-lg bg-black hover:bg-gray-800 focus:ring-gray-900"
              >
                {isSubmitting ? (en ? 'Creating account...' : 'Création du compte...') : (en ? 'Create my rider account' : 'Créer mon compte client')}
              </Button>


              <p className="text-sm text-gray-500 text-center">
                {en ? 'By creating an account, you accept our ' : 'En créant votre compte, vous acceptez nos '}
                <a
                  href="#"
                  className="text-gray-900 hover:underline font-medium"
                  onClick={(e) => {
                    e.preventDefault();
                    window.open(href('/terms-of-service'), '_blank');
                  }}
                >
                  {en ? 'terms of use' : "conditions d'utilisation"}
                </a>{' '}
                {en ? 'and our ' : 'et notre '}
                <a
                  href="#"
                  className="text-gray-900 hover:underline font-medium"
                  onClick={(e) => {
                    e.preventDefault();
                    window.open(href('/privacy-policy'), '_blank');
                  }}
                >
                  {en ? 'privacy policy' : 'politique de confidentialité'}
                </a>.
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
