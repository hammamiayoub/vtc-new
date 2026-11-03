import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useLocale } from '../i18n/locale';

// Page publique de suppression de compte (URL à renseigner dans la Google Play Console).
export const DeleteAccountPage: React.FC = () => {
  const navigate = useNavigate();
  const { locale, href } = useLocale();
  const en = locale === 'en';
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    document.title = en ? 'Delete my account | TuniDrive' : 'Supprimer mon compte | TuniDrive';
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
  }, [en]);

  const handleDelete = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const { data, error } = await supabase.functions.invoke('delete-account');
      if (error || !data?.success) {
        let text = en ? 'Error while deleting your account.' : 'Erreur lors de la suppression du compte.';
        try {
          const body = await (error as { context?: Response } | null)?.context?.json();
          if (body?.error) text = body.error;
        } catch {
          // corps illisible : message par défaut
        }
        setMessage({ ok: false, text });
        return;
      }
      await supabase.auth.signOut({ scope: 'local' });
      setSignedIn(false);
      setMessage({
        ok: true,
        text: en
          ? 'Your account and personal data have been deleted.'
          : 'Votre compte et vos données personnelles ont été supprimés.',
      });
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <button onClick={() => navigate(href('/'))} className="text-sm text-gray-500 hover:text-gray-900 mb-6">
          ← {en ? 'Back to home' : "Retour à l'accueil"}
        </button>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          {en ? 'Delete my TuniDrive account' : 'Supprimer mon compte TuniDrive'}
        </h1>
        <p className="text-gray-700 mb-6">
          {en
            ? 'You can delete your client or driver account and the associated personal data at any time.'
            : 'Vous pouvez supprimer à tout moment votre compte client ou chauffeur et les données personnelles associées.'}
        </p>

        <h2 className="font-semibold text-gray-900 mb-2">{en ? 'What is deleted' : 'Ce qui est supprimé'}</h2>
        <ul className="list-disc pl-5 text-gray-700 space-y-1 mb-6">
          <li>
            {en
              ? 'Your profile (name, email, phone, city) and sign-in account'
              : 'Votre profil (nom, e-mail, téléphone, ville) et votre compte de connexion'}
          </li>
          <li>
            {en
              ? 'Profile photo, vehicles, driver documents, availabilities, subscriptions'
              : 'Photo de profil, véhicules, documents chauffeur, disponibilités, abonnements'}
          </li>
          <li>
            {en
              ? 'Your ratings, parcel quote requests and notification tokens'
              : 'Vos notations, demandes de devis colis et jetons de notification'}
          </li>
        </ul>

        <h2 className="font-semibold text-gray-900 mb-2">{en ? 'What is kept' : 'Ce qui est conservé'}</h2>
        <p className="text-gray-700 mb-6">
          {en
            ? 'Bookings (date, route, price) are kept in anonymised form, with no link to you, for accounting and legal obligations.'
            : 'Les réservations (date, trajet, prix) sont conservées sous forme anonymisée, sans lien avec vous, pour nos obligations comptables et légales.'}
        </p>

        {message && (
          <div className={`rounded-lg p-4 mb-6 text-sm ${message.ok ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
            {message.text}
          </div>
        )}

        {signedIn === true && !confirming && (
          <button
            onClick={() => setConfirming(true)}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-lg"
          >
            {en ? 'Delete my account' : 'Supprimer mon compte'}
          </button>
        )}
        {signedIn === true && confirming && (
          <div className="border border-red-200 bg-red-50 rounded-lg p-4">
            <p className="text-red-800 font-medium mb-3">
              {en ? 'This action is irreversible. Confirm deletion?' : 'Cette action est irréversible. Confirmer la suppression ?'}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirming(false)} disabled={busy} className="flex-1 border border-gray-300 rounded-lg py-2">
                {en ? 'Cancel' : 'Annuler'}
              </button>
              <button onClick={handleDelete} disabled={busy} className="flex-1 bg-red-600 text-white rounded-lg py-2 disabled:opacity-50">
                {busy ? '…' : en ? 'Delete permanently' : 'Supprimer définitivement'}
              </button>
            </div>
          </div>
        )}
        {signedIn === false && !message?.ok && (
          <div className="space-y-3">
            <p className="text-gray-700 text-sm">
              {en ? 'Sign in to delete your account:' : 'Connectez-vous pour supprimer votre compte :'}
            </p>
            <div className="flex gap-3">
              <button onClick={() => navigate(href('/client-login'))} className="flex-1 bg-gray-900 text-white rounded-lg py-2">
                {en ? 'Client sign-in' : 'Connexion client'}
              </button>
              <button onClick={() => navigate(href('/driver-login'))} className="flex-1 bg-gray-900 text-white rounded-lg py-2">
                {en ? 'Driver sign-in' : 'Connexion chauffeur'}
              </button>
            </div>
            <p className="text-gray-600 text-sm">
              {en
                ? "Can't sign in anymore? Email support@tunidrive.net from your account address and we will delete it within 30 days."
                : "Vous ne pouvez plus vous connecter ? Écrivez à support@tunidrive.net depuis l'adresse de votre compte : nous le supprimerons sous 30 jours."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
