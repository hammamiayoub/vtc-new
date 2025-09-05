import React from 'react';
import { ArrowLeft, Shield, Eye, Lock, Users, FileText, Mail, Calendar } from 'lucide-react';
import { Button } from './ui/Button';

interface PrivacyPolicyProps {
  onBack: () => void;
}

export const PrivacyPolicy: React.FC<PrivacyPolicyProps> = ({ onBack }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors group"
            >
              <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
              Retour
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-xl shadow-sm p-8">
          {/* Title */}
          <div className="text-center mb-12">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Shield size={40} className="text-blue-600" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Politique de confidentialité
            </h1>
            <p className="text-xl text-gray-600">
              My-Ride.net
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}
            </p>
          </div>

          {/* Introduction */}
          <div className="prose max-w-none">
            <p className="text-lg text-gray-700 mb-8 leading-relaxed">
              La présente Politique de confidentialité décrit la manière dont My-Ride.net collecte, 
              utilise, conserve et protège vos données personnelles lorsque vous utilisez notre 
              plateforme de réservation de véhicules de transport avec chauffeur (VTC) en Tunisie.
            </p>

            {/* Section 1 */}
            <div className="mb-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <Eye size={24} className="text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">1. Données collectées</h2>
              </div>
              
              <p className="text-gray-700 mb-4">
                Lorsque vous utilisez notre site ou application, nous pouvons collecter les informations suivantes :
              </p>
              
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Informations de compte :</h4>
                  <p className="text-gray-700">nom, prénom, adresse email, numéro de téléphone, mot de passe.</p>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Informations de réservation :</h4>
                  <p className="text-gray-700">adresses de départ et d'arrivée, date, heure, détails du trajet.</p>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Informations de paiement (le cas échéant) :</h4>
                  <p className="text-gray-700">données de facturation (aucune donnée bancaire sensible n'est stockée directement chez nous, elles sont traitées par notre prestataire de paiement sécurisé).</p>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Données de localisation :</h4>
                  <p className="text-gray-700">uniquement lorsque vous autorisez le partage de votre position pour faciliter la mise en relation avec un chauffeur.</p>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Données techniques :</h4>
                  <p className="text-gray-700">adresse IP, type de navigateur, appareil utilisé, cookies de session et préférences utilisateur.</p>
                </div>
              </div>
            </div>

            {/* Section 2 */}
            <div className="mb-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <FileText size={24} className="text-purple-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">2. Finalités de l'utilisation des données</h2>
              </div>
              
              <p className="text-gray-700 mb-4">
                Vos données sont collectées et utilisées afin de :
              </p>
              
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-purple-600 rounded-full mt-2"></div>
                  <span className="text-gray-700">Créer et gérer votre compte utilisateur.</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-purple-600 rounded-full mt-2"></div>
                  <span className="text-gray-700">Mettre en relation les clients avec les chauffeurs partenaires.</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-purple-600 rounded-full mt-2"></div>
                  <span className="text-gray-700">Assurer le suivi des réservations et l'historique des trajets.</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-purple-600 rounded-full mt-2"></div>
                  <span className="text-gray-700">Améliorer la qualité de nos services et personnaliser l'expérience utilisateur.</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-purple-600 rounded-full mt-2"></div>
                  <span className="text-gray-700">Communiquer avec vous (notifications de réservation, emails, SMS).</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-purple-600 rounded-full mt-2"></div>
                  <span className="text-gray-700">Respecter nos obligations légales et prévenir toute fraude ou usage abusif.</span>
                </li>
              </ul>
            </div>

            {/* Section 3 */}
            <div className="mb-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Users size={24} className="text-orange-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">3. Partage des données</h2>
              </div>
              
              <p className="text-gray-700 mb-4">
                Nous ne partageons vos données personnelles qu'avec :
              </p>
              
              <div className="space-y-4">
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <h4 className="font-semibold text-orange-900 mb-2">Les chauffeurs partenaires :</h4>
                  <p className="text-orange-800">uniquement les données nécessaires pour réaliser le trajet (nom, numéro de téléphone, adresse de départ et d'arrivée).</p>
                </div>
                
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <h4 className="font-semibold text-orange-900 mb-2">Les prestataires techniques :</h4>
                  <p className="text-orange-800">hébergement, envoi d'email/SMS, paiement sécurisé.</p>
                </div>
                
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <h4 className="font-semibold text-orange-900 mb-2">Les autorités compétentes :</h4>
                  <p className="text-orange-800">uniquement sur demande légale ou judiciaire.</p>
                </div>
              </div>
              
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
                <p className="text-red-800 font-semibold">
                  ⚠️ Nous ne vendons jamais vos données personnelles à des tiers.
                </p>
              </div>
            </div>

            {/* Section 4 */}
            <div className="mb-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Calendar size={24} className="text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">4. Conservation des données</h2>
              </div>
              
              <div className="space-y-4">
                <p className="text-gray-700">
                  Vos données sont conservées le temps nécessaire à la prestation du service et à la gestion de votre compte.
                </p>
                
                <p className="text-gray-700">
                  Certaines données (facturation, historiques de réservation) peuvent être conservées conformément aux obligations légales tunisiennes.
                </p>
                
                <p className="text-gray-700">
                  Vous pouvez demander la suppression de votre compte et de vos données à tout moment (voir section 7).
                </p>
              </div>
            </div>

            {/* Section 5 */}
            <div className="mb-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <Lock size={24} className="text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">5. Sécurité</h2>
              </div>
              
              <p className="text-gray-700 mb-4">
                Nous mettons en place toutes les mesures techniques et organisationnelles nécessaires pour protéger vos données contre l'accès non autorisé, la perte ou la divulgation :
              </p>
              
              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                  <Lock size={32} className="text-green-600 mx-auto mb-2" />
                  <h4 className="font-semibold text-green-900 mb-1">Chiffrement</h4>
                  <p className="text-sm text-green-800">Communications SSL/TLS</p>
                </div>
                
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                  <Shield size={32} className="text-green-600 mx-auto mb-2" />
                  <h4 className="font-semibold text-green-900 mb-1">Stockage sécurisé</h4>
                  <p className="text-sm text-green-800">Serveurs en Tunisie/UE</p>
                </div>
                
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                  <Users size={32} className="text-green-600 mx-auto mb-2" />
                  <h4 className="font-semibold text-green-900 mb-1">Accès restreint</h4>
                  <p className="text-sm text-green-800">Personnel autorisé uniquement</p>
                </div>
              </div>
            </div>

            {/* Section 6 */}
            <div className="mb-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Eye size={24} className="text-yellow-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">6. Cookies</h2>
              </div>
              
              <p className="text-gray-700 mb-4">
                Notre site utilise des cookies afin de :
              </p>
              
              <ul className="space-y-2 mb-4">
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-yellow-600 rounded-full mt-2"></div>
                  <span className="text-gray-700">Faciliter la navigation et la connexion.</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-yellow-600 rounded-full mt-2"></div>
                  <span className="text-gray-700">Mémoriser vos préférences.</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-yellow-600 rounded-full mt-2"></div>
                  <span className="text-gray-700">Analyser l'usage du site pour améliorer nos services.</span>
                </li>
              </ul>
              
              <p className="text-gray-700">
                Vous pouvez configurer votre navigateur pour refuser ou limiter les cookies. 
                Cependant, certaines fonctionnalités risquent de ne pas fonctionner correctement.
              </p>
            </div>

            {/* Section 7 */}
            <div className="mb-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <Shield size={24} className="text-indigo-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">7. Vos droits</h2>
              </div>
              
              <p className="text-gray-700 mb-4">
                Conformément à la loi tunisienne n°2004-63 sur la protection des données personnelles, vous disposez de droits :
              </p>
              
              <div className="grid md:grid-cols-2 gap-4 mb-6">
                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                  <h4 className="font-semibold text-indigo-900 mb-2">Accès</h4>
                  <p className="text-indigo-800 text-sm">savoir quelles données sont collectées.</p>
                </div>
                
                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                  <h4 className="font-semibold text-indigo-900 mb-2">Rectification</h4>
                  <p className="text-indigo-800 text-sm">corriger vos informations inexactes.</p>
                </div>
                
                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                  <h4 className="font-semibold text-indigo-900 mb-2">Suppression</h4>
                  <p className="text-indigo-800 text-sm">demander la suppression de vos données personnelles.</p>
                </div>
                
                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                  <h4 className="font-semibold text-indigo-900 mb-2">Opposition</h4>
                  <p className="text-indigo-800 text-sm">refuser certains traitements (par ex. marketing).</p>
                </div>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-blue-800">
                  <strong>Pour exercer vos droits, contactez-nous à :</strong> contact@my-ride.net
                </p>
              </div>
            </div>

            {/* Section 8 */}
            <div className="mb-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                  <FileText size={24} className="text-gray-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">8. Modifications de la politique</h2>
              </div>
              
              <div className="space-y-4">
                <p className="text-gray-700">
                  Nous pouvons mettre à jour cette Politique de confidentialité à tout moment.
                </p>
                <p className="text-gray-700">
                  La version en vigueur sera toujours disponible sur notre site.
                </p>
              </div>
            </div>

            {/* Section 9 */}
            <div className="mb-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <Mail size={24} className="text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">9. Contact</h2>
              </div>
              
              <p className="text-gray-700 mb-4">
                Pour toute question ou demande concernant vos données personnelles, vous pouvez nous écrire à :
              </p>
              
              <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                <Mail size={32} className="text-green-600 mx-auto mb-3" />
                <p className="text-xl font-semibold text-green-900">
                  📧 contact@my-ride.net
                </p>
              </div>
            </div>
          </div>

          {/* Back button */}
          <div className="text-center pt-8 border-t border-gray-200">
            <Button onClick={onBack} className="bg-black hover:bg-gray-800">
              Retour à l'accueil
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};