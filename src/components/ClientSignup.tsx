import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { User, Mail, Lock, Eye, EyeOff, ArrowLeft, CheckCircle, Phone, MapPin } from 'lucide-react';
import { Button } from './ui/Button';
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

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isValid }
  } = useForm<ClientSignupFormData>({
    resolver: zodResolver(clientSignupSchema),
    mode: 'onChange'
  });

  const watchPassword = watch('password', '');

  const onSubmit = async (data: ClientSignupFormData) => {
    setIsSubmitting(true);
    
    try {
      // Créer l'utilisateur avec Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            first_name: data.firstName,
            last_name: data.lastName,
            user_type: 'client'
          }
        }
      });

      if (authError) {
        console.error('Erreur lors de l\'inscription:', authError);
        if (authError.message.includes('User already registered')) {
          setError('Un compte existe déjà avec cette adresse email');
        } else if (authError.message.includes('duplicate key value')) {
          if (authError.message.includes('email')) {
            setError('Cette adresse email est déjà utilisée');
          } else if (authError.message.includes('phone')) {
            setError('Ce numéro de téléphone est déjà utilisé');
          } else {
            setError('Ces informations sont déjà utilisées par un autre compte');
          }
        } else {
          setError(authError.message);
        }
        return;
      }

      // Insérer les détails du client dans la table clients
      if (authData.user) {
        const { error: profileError } = await supabase
          .from('clients')
          .insert({
            id: authData.user.id,
            first_name: data.firstName,
            last_name: data.lastName,
            email: data.email,
            phone: data.phone
          });

        if (profileError) {
          console.error('Erreur lors de la création du profil client:', profileError);
          if (profileError.message.includes('déjà utilisé')) {
            setError(profileError.message);
          } else if (profileError.message.includes('duplicate key value')) {
            if (profileError.message.includes('email')) {
              setError('Cette adresse email est déjà utilisée');
            } else if (profileError.message.includes('phone')) {
              setError('Ce numéro de téléphone est déjà utilisé');
            } else {
              setError('Ces informations sont déjà utilisées par un autre compte');
            }
          } else {
            setError('Erreur lors de la création du profil client');
          }
          return;
        }
      }

      setSubmitSuccess(true);
      
    } catch (error) {
      console.error('Erreur lors de l\'inscription client:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={40} className="text-purple-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Inscription réussie !
          </h1>
          <p className="text-gray-600 mb-8 leading-relaxed">
            Votre compte client a été créé avec succès. 
            Vous pouvez maintenant vous connecter et commencer à réserver des courses.
          </p>
          <Button onClick={onBack} className="w-full bg-purple-600 hover:bg-purple-700">
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
          <div className="flex-1 p-8 lg:p-12">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-gray-600 hover:text-purple-600 mb-8 transition-colors group"
            >
              <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
              Retour
            </button>

            <div className="mb-8">
              <h1 className="text-4xl font-bold text-gray-900 mb-3">
                Créer un compte client
              </h1>
              <p className="text-gray-600 text-lg">
                Rejoignez MyRide pour réserver vos courses
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    {...register('firstName')}
                    type="text"
                    placeholder="Prénom"
                    className={`block w-full pl-10 pr-3 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all ${
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
                    className={`block w-full pl-10 pr-3 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all ${
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
                  className={`block w-full pl-10 pr-3 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all ${
                    errors.email ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.email && (
                  <p className="mt-2 text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Phone className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  {...register('phone')}
                  type="tel"
                  placeholder="Numéro de téléphone"
                  className={`block w-full pl-10 pr-3 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all ${
                    errors.phone ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.phone && (
                  <p className="mt-2 text-sm text-red-600">{errors.phone.message}</p>
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
                  className={`block w-full pl-10 pr-12 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all ${
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
                  className={`block w-full pl-10 pr-12 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all ${
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
                className="w-full py-4 text-lg bg-purple-600 hover:bg-purple-700 focus:ring-purple-500"
              >
                {isSubmitting ? 'Création du compte...' : 'Créer mon compte client'}
              </Button>

              <p className="text-sm text-gray-500 text-center">
                En créant votre compte, vous acceptez nos{' '}
                <a href="#" className="text-purple-600 hover:underline">
                  conditions d'utilisation
                </a>{' '}
                et notre{' '}
                <a href="#" className="text-purple-600 hover:underline">
                  politique de confidentialité
                </a>.
              </p>
            </form>
          </div>

          {/* Right side - Benefits */}
          <div className="lg:w-96 bg-purple-600 p-8 lg:p-12 text-white">
            <h2 className="text-3xl font-bold mb-8">Avantages client</h2>
            <div className="space-y-6">
              {[
                'Réservation en quelques clics',
                'Chauffeurs professionnels vérifiés',
                'Tarifs transparents et compétitifs',
                'Suivi en temps réel de votre course',
                'Paiement sécurisé intégré',
                'Support client 24/7'
              ].map((benefit, index) => (
                <div key={index} className="flex items-center gap-3">
                  <CheckCircle size={20} className="text-purple-300 flex-shrink-0" />
                  <span className="text-purple-50">{benefit}</span>
                </div>
              ))}
            </div>

            <div className="mt-12 p-6 bg-purple-700 rounded-xl">
              <h3 className="font-semibold text-lg mb-2">Prêt à voyager ?</h3>
              <p className="text-purple-200 text-sm">
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