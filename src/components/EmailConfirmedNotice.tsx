import React, { useEffect, useState } from 'react';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from './ui/Button';
import { supabase } from '../lib/supabase';
import { useLocale } from '../i18n/locale';
import type { SignupCallback } from '../utils/signupCallback';

interface EmailConfirmedNoticeProps {
  status: SignupCallback;
  onLogin: () => void;
  onSignup: () => void;
  onOpenAccount: () => void;
}

export const EmailConfirmedNotice: React.FC<EmailConfirmedNoticeProps> = ({
  status,
  onLogin,
  onSignup,
  onOpenAccount,
}) => {
  const { locale } = useLocale();
  const en = locale === 'en';
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void supabase.auth.getSession().then(({ data }) => {
      if (!cancelled) setHasSession(Boolean(data.session));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const confirmed = status === 'confirmed';

  return (
    <div className="min-h-[100dvh] bg-gray-50 flex items-start sm:items-center justify-center p-4 sm:p-6 py-10">
      <div className="bg-white rounded-2xl shadow-lg max-w-lg w-full p-6 sm:p-10 text-center">
        <div
          className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 ${
            confirmed ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
          }`}
        >
          {confirmed ? <CheckCircle size={32} aria-hidden="true" /> : <AlertCircle size={32} aria-hidden="true" />}
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
          {confirmed
            ? en
              ? 'Your account is confirmed'
              : 'Votre inscription est confirmée'
            : en
              ? 'This confirmation link is no longer valid'
              : 'Ce lien de confirmation n’est plus valable'}
        </h1>
        <p className="text-gray-600 text-base sm:text-lg leading-relaxed mb-8">
          {confirmed
            ? en
              ? 'Your email address is validated. You can now sign in with the email and password you chose when you created the account.'
              : 'Votre adresse email est validée. Vous pouvez maintenant vous connecter avec l’email et le mot de passe choisis lors de la création du compte.'
            : en
              ? 'The link has expired or has already been used. If your account is already confirmed, sign in with your email and password. Otherwise, create the account again.'
              : 'Le lien a expiré ou a déjà été utilisé. Si votre compte est déjà confirmé, connectez-vous avec votre email et votre mot de passe. Sinon, créez à nouveau le compte.'}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button size="lg" onClick={onLogin} className="rounded-full">
            {en ? 'Sign in' : 'Se connecter'}
          </Button>
          {confirmed && hasSession ? (
            <Button size="lg" variant="outline" onClick={onOpenAccount} className="rounded-full">
              {en ? 'Open my account' : 'Ouvrir mon espace'}
            </Button>
          ) : (
            !confirmed && (
              <Button size="lg" variant="outline" onClick={onSignup} className="rounded-full">
                {en ? 'Create an account' : 'Créer un compte'}
              </Button>
            )
          )}
        </div>
      </div>
    </div>
  );
};
