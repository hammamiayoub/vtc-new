import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, ArrowLeft, Shield, KeyRound } from 'lucide-react';
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
  // Double authentification : 'password' -> 'verify' (code TOTP) ou 'enroll' (premier réglage, QR code)
  const [step, setStep] = useState<'password' | 'verify' | 'enroll'>('password');
  const [code, setCode] = useState('');
  const [factorId, setFactorId] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [mfaRequired, setMfaRequired] = useState(false);

  const finishLogin = async (userId: string) => {
    const { data: adminData, error: adminError } = await supabase
      .from('admin_users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (adminError || !adminData) {
      setError('Erreur lors de la vérification du compte administrateur');
      await supabase.auth.signOut();
      setStep('password');
      return;
    }
    onLoginSuccess();
  };

  const startEnrollment = async () => {
    // Un facteur commencé mais jamais confirmé bloquerait un nouvel enrôlement : on le supprime.
    const { data: factors } = await supabase.auth.mfa.listFactors();
    for (const f of factors?.all ?? []) {
      if (f.factor_type === 'totp' && f.status === 'unverified') {
        await supabase.auth.mfa.unenroll({ factorId: f.id });
      }
    }
    const { data, error: enrollError } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: `TuniDrive admin ${new Date().toISOString().slice(0, 10)}`,
    });
    if (enrollError || !data) {
      setError("Impossible de démarrer l'authentification à deux facteurs : " + (enrollError?.message ?? ''));
      await supabase.auth.signOut();
      setStep('password');
      return;
    }
    setFactorId(data.id);
    setQrCode(data.totp.qr_code);
    setSecret(data.totp.secret);
    setStep('enroll');
  };

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    try {
      const { error: mfaError } = await supabase.auth.mfa.challengeAndVerify({
        factorId,
        code: code.replace(/\s/g, ''),
      });
      if (mfaError) {
        setError('Code incorrect ou expiré. Réessayez avec le code affiché dans votre application.');
        setCode('');
        return;
      }
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        setError('Session introuvable, reconnectez-vous.');
        setStep('password');
        return;
      }
      await finishLogin(userData.user.id);
    } catch (err) {
      console.error('Erreur MFA admin:', err);
      setError('Une erreur est survenue lors de la vérification du code');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
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
        if (rememberMe) {
          await supabase.auth.updateUser({
            data: { remember_me: true },
          });
        }

        // Le statut est lu par une fonction dédiée : la table admin_users est masquée tant que la session
        // n'est pas validée par le code TOTP (aal2).
        const { data: status, error: statusError } = await supabase.rpc('admin_account_status');
        if (statusError) {
          console.error('Erreur lors de la vérification admin:', statusError);
          setError('Erreur lors de la vérification du compte administrateur');
          await supabase.auth.signOut();
          return;
        }
        if (!status?.is_admin) {
          setError("Identifiants incorrects. Ce compte n'a pas les droits administrateur. Accès refusé.");
          await supabase.auth.signOut();
          return;
        }
        setMfaRequired(!!status.mfa_required);

        const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (aal?.currentLevel === 'aal2') {
          await finishLogin(data.user.id);
          return;
        }
        if (aal?.nextLevel === 'aal2') {
          const { data: factors } = await supabase.auth.mfa.listFactors();
          const totp = factors?.totp?.[0];
          if (totp) {
            setFactorId(totp.id);
            setCode('');
            setStep('verify');
            return;
          }
        }
        // Aucun facteur configuré : enrôlement (obligatoire dès que l'exigence est activée)
        await startEnrollment();
      }
    } catch (err) {
      console.error('Erreur lors de la connexion admin:', err);
      setError('Une erreur est survenue lors de la connexion');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f7f7] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden max-w-md w-full">
        <div className="h-1.5 bg-brand" />
        <div className="p-8">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 hover:text-brand mb-8 transition-colors group"
          >
            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            Retour
          </button>

          <div className="text-center mb-8">
           
            <div className="w-16 h-16 bg-brand-muted rounded-2xl flex items-center justify-center mx-auto mb-5">
              <Shield size={28} className="text-brand" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2 tracking-tight">
              Administration
            </h1>
            <p className="text-gray-600">
              Accès réservé aux administrateurs TuniDrive
            </p>
          </div>

          {step !== 'password' && (
            <form onSubmit={handleCodeSubmit} className="space-y-6">
              {step === 'enroll' ? (
                <div className="space-y-4">
                  <p className="text-sm text-gray-700">
                    Activez la double authentification : scannez ce QR code avec une application
                    d&apos;authentification (Google Authenticator, Authy, 1Password…), puis saisissez le code à 6
                    chiffres affiché.
                  </p>
                  {qrCode && (
                    <img src={qrCode} alt="QR code d'authentification" className="mx-auto w-44 h-44" />
                  )}
                  {secret && (
                    <p className="text-xs text-gray-500 text-center break-all">
                      Saisie manuelle : <span className="font-mono">{secret}</span>
                    </p>
                  )}
                  <p className="text-xs text-gray-500">
                    Conseil : enregistrez aussi ce code secret dans un endroit sûr. En cas de perte du téléphone,
                    il n&apos;existe pas de code de secours.
                  </p>
                </div>
              ) : (
                <p className="text-sm text-gray-700">
                  Saisissez le code à 6 chiffres affiché dans votre application d&apos;authentification.
                </p>
              )}

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <KeyRound className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={7}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Code à 6 chiffres"
                  className="block w-full pl-10 pr-3 py-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all text-base tracking-widest"
                  required
                  autoFocus
                />
              </div>

              {error && (
                <div className="p-3 bg-danger-50 border border-danger-200 rounded-lg">
                  <p className="text-sm text-danger-600">{error}</p>
                </div>
              )}

              <Button
                type="submit"
                loading={isSubmitting}
                className="w-full py-4 bg-brand hover:bg-brand-hover text-lg font-medium"
              >
                {step === 'enroll' ? 'Activer et se connecter' : 'Valider le code'}
              </Button>

              {step === 'enroll' && !mfaRequired && (
                <button
                  type="button"
                  onClick={async () => {
                    // Exigence pas encore activée : on abandonne l'enrôlement et on continue sans code.
                    if (factorId) await supabase.auth.mfa.unenroll({ factorId });
                    const { data: userData } = await supabase.auth.getUser();
                    if (userData.user) await finishLogin(userData.user.id);
                  }}
                  className="w-full text-sm text-gray-500 hover:text-gray-700"
                >
                  Plus tard
                </button>
              )}
              <button
                type="button"
                onClick={async () => {
                  await supabase.auth.signOut();
                  setStep('password');
                  setError('');
                  setCode('');
                }}
                className="w-full text-sm text-gray-500 hover:text-gray-700"
              >
                Annuler
              </button>
            </form>
          )}

          <form onSubmit={handleSubmit} className={step === 'password' ? 'space-y-6' : 'hidden'}>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email administrateur"
                className="block w-full pl-10 pr-3 py-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all text-base"
                required
                autoComplete="username"
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
                className="block w-full pl-10 pr-12 py-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all text-base"
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5 text-gray-500 hover:text-gray-700" />
                ) : (
                  <Eye className="h-5 w-5 text-gray-500 hover:text-gray-700" />
                )}
              </button>
            </div>

            {error && (
              <div className="p-3 bg-danger-50 border border-danger-200 rounded-lg">
                <p className="text-sm text-danger-600">{error}</p>
              </div>
            )}

            <div className="flex items-center">
              <input
                type="checkbox"
                id="remember-admin"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 text-brand rounded border-gray-300 focus:ring-brand"
              />
              <label htmlFor="remember-admin" className="ml-2 text-sm text-gray-600">
                Se souvenir de moi
              </label>
            </div>

            <Button
              type="submit"
              loading={isSubmitting}
              className="w-full py-4 bg-brand hover:bg-brand-hover text-lg font-medium"
            >
              Connexion administrateur
            </Button>
          </form>

          <div className="mt-6 p-4 bg-brand-muted rounded-lg">
            <p className="text-xs text-gray-600 text-center">
              Accès sécurisé réservé aux administrateurs autorisés uniquement
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
