import React from 'react';
import { ArrowLeft, Shield, Users, FileText, Mail, Calendar, Car, CreditCard, AlertTriangle, Scale, Package } from 'lucide-react';
import { Button } from './ui/Button';

interface TermsOfServiceProps {
  onBack: () => void;
}

export const TermsOfService: React.FC<TermsOfServiceProps> = ({ onBack }) => {
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
              <FileText size={40} className="text-blue-600" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Conditions générales d'utilisation
            </h1>
            <p className="text-xl text-gray-600">
              TuniDrive.net
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}
            </p>
          </div>

          {/* Introduction */}
          <div className="prose max-w-none">
            <p className="text-lg text-gray-700 mb-4 leading-relaxed">
              Bienvenue sur TuniDrive.net, une plateforme en ligne permettant la mise en relation entre des clients
              et des professionnels partenaires pour :
            </p>
            <ul className="text-lg text-gray-700 mb-4 list-disc pl-6 space-y-1">
              <li>la réservation de trajets en véhicule de transport avec chauffeur (VTC) ;</li>
              <li>la demande et la proposition de devis pour le transport international de colis et marchandises entre l&apos;Europe et la Tunisie.</li>
            </ul>
            <p className="text-lg text-gray-700 mb-4 leading-relaxed">
              TuniDrive n&apos;est pas un transporteur. Elle n&apos;exerce aucune activité de transport public de personnes
              au sens de la loi n°2004-33 du 19 avril 2004 portant organisation des transports terrestres, ni de transport
              de marchandises en son nom propre. Elle agit uniquement comme intermédiaire technique de mise en relation.
            </p>
            <p className="text-lg text-gray-700 mb-8 leading-relaxed">
              En utilisant notre site, notre application ou nos services, vous acceptez les présentes Conditions générales d&apos;utilisation (CGU).
            </p>
            

            {/* Section 1 */}
            <div className="mb-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <FileText size={24} className="text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">1. Objet</h2>
              </div>
              
              <p className="text-gray-700 mb-4">
                Les présentes CGU ont pour objet de définir les règles d'utilisation de la plateforme TuniDrive.net par :
              </p>
              
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-900 mb-2">Les clients :</h4>
                  <p className="text-blue-800">
                    toute personne qui réserve un trajet VTC ou qui dépose une demande de devis pour le transport de colis
                    via le site ou l&apos;application.
                  </p>
                </div>
                
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-semibold text-green-900 mb-2">Les chauffeurs et transporteurs partenaires :</h4>
                  <p className="text-green-800">
                    professionnels indépendants inscrits sur la plateforme selon leur type d&apos;activité :
                    transport de personnes (VTC), transport de colis international, ou les deux. Ils proposent leurs
                    prestations et tarifs en toute autonomie.
                  </p>
                </div>
              </div>
            </div>

            {/* Section 2 */}
            <div className="mb-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Users size={24} className="text-purple-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">2. Création de compte</h2>
              </div>
              
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-purple-600 rounded-full mt-2"></div>
                  <span className="text-gray-700">L'inscription est gratuite pour les clients.</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-purple-600 rounded-full mt-2"></div>
                  <span className="text-gray-700">
                    Lors de l&apos;inscription, le professionnel choisit son type d&apos;activité (transport de personnes ou transport de colis).
                    Il peut ultérieurement modifier ce choix depuis son profil.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-purple-600 rounded-full mt-2"></div>
                  <span className="text-gray-700">Pour les chauffeurs et transporteurs, l&apos;inscription peut être soumise à des frais d&apos;abonnement ou à des conditions particulières (précisées lors de l&apos;enregistrement).</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-purple-600 rounded-full mt-2"></div>
                  <span className="text-gray-700">L'utilisateur s'engage à fournir des informations exactes, à jour et complètes.</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-purple-600 rounded-full mt-2"></div>
                  <span className="text-gray-700">Chaque utilisateur est responsable de la confidentialité de ses identifiants et de toute activité effectuée depuis son compte.</span>
                </li>
              </ul>
            </div>

            {/* Section 3 */}
            <div className="mb-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <Car size={24} className="text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">3. Utilisation du service</h2>
              </div>
              
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-green-600 rounded-full mt-2"></div>
                  <span className="text-gray-700">Les clients peuvent rechercher, réserver et suivre un trajet via la plateforme.</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-green-600 rounded-full mt-2"></div>
                  <span className="text-gray-700">Les chauffeurs reçoivent des demandes de réservation et peuvent les accepter ou les refuser.</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-green-600 rounded-full mt-2"></div>
                  <span className="text-gray-700">La confirmation d'une réservation est envoyée aux deux parties (client et chauffeur) par email et/ou SMS.</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-green-600 rounded-full mt-2"></div>
                  <span className="text-gray-700">Les trajets doivent être réalisés dans le respect de la réglementation tunisienne et internationale en matière de transport.</span>
                </li>
              </ul>
            </div>

            {/* Section 4 — Transport de colis */}
            <div className="mb-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                  <Package size={24} className="text-gray-700" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">4. Transport international de colis et marchandises</h2>
              </div>

              <p className="text-gray-700 mb-4">
                Ce service permet aux clients de déposer une demande de devis (adresses, date souhaitée, description des objets,
                photos et documents le cas échéant). Les transporteurs partenaires dont le profil et les disponibilités
                correspondent reçoivent la demande et peuvent soumettre une proposition de prix libre.
              </p>

              <ul className="space-y-3 mb-4">
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-gray-600 rounded-full mt-2"></div>
                  <span className="text-gray-700">
                    Le client compare les propositions reçues et accepte celle de son choix. Les autres propositions sont alors rejetées automatiquement.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-gray-600 rounded-full mt-2"></div>
                  <span className="text-gray-700">
                    Les tarifs sont exprimés en EUR pour un trajet Europe → Tunisie et en TND pour un trajet Tunisie → Europe,
                    selon la direction indiquée par le client.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-gray-600 rounded-full mt-2"></div>
                  <span className="text-gray-700">
                    Après acceptation d&apos;une proposition, les coordonnées du client et du transporteur peuvent être échangées
                    afin d&apos;organiser la livraison. TuniDrive n&apos;intervient pas dans l&apos;exécution physique du transport ni dans le paiement entre les parties, sauf fonctionnalité spécifique indiquée sur la plateforme.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-gray-600 rounded-full mt-2"></div>
                  <span className="text-gray-700">
                    Le client s&apos;engage à décrire fidèlement le contenu de l&apos;envoi et à ne pas utiliser le service pour des marchandises
                    interdites, dangereuses ou soumises à des restrictions douanières sans les déclarations requises.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-gray-600 rounded-full mt-2"></div>
                  <span className="text-gray-700">
                    Les demandes non abouties peuvent expirer après un délai défini par la plateforme. Le transporteur reste libre
                    d&apos;accepter ou de refuser toute demande qui lui est adressée.
                  </span>
                </li>
              </ul>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <p className="text-gray-700 text-sm">
                  <strong>Rappel :</strong> TuniDrive facilite uniquement la mise en relation et la comparaison des devis.
                  Le contrat de transport et la responsabilité de l&apos;exécution incombent au client et au transporteur partenaire retenu.
                </p>
              </div>
            </div>

            {/* Section 5 */}
            <div className="mb-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <CreditCard size={24} className="text-yellow-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">5. Tarifs et paiement</h2>
              </div>
              
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-yellow-600 rounded-full mt-2"></div>
                  <span className="text-gray-700">Le prix du trajet est communiqué au client avant la validation de la réservation.</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-yellow-600 rounded-full mt-2"></div>
                  <span className="text-gray-700">Le paiement s'effectue directement entre le client et le chauffeur, sauf indication contraire (paiement en ligne via la plateforme, si disponible).</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-yellow-600 rounded-full mt-2"></div>
                  <span className="text-gray-700">
                    Pour les devis colis, le prix affiché dans la proposition du transporteur est indicatif du devis accepté ;
                    les modalités de paiement sont convenues directement entre le client et le transporteur, sauf indication contraire sur la plateforme.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-yellow-600 rounded-full mt-2"></div>
                  <span className="text-gray-700">Les chauffeurs et transporteurs peuvent être soumis à un abonnement mensuel pour l&apos;utilisation de la plateforme.</span>
                </li>
              </ul>
            </div>

            {/* Section 6 */}
            <div className="mb-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <AlertTriangle size={24} className="text-red-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">6. Annulation</h2>
              </div>
              
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-red-600 rounded-full mt-2"></div>
                  <span className="text-gray-700">Le client et le chauffeur peuvent annuler une réservation VTC jusqu&apos;à 24 heures avant l&apos;heure prévue du trajet.</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-red-600 rounded-full mt-2"></div>
                  <span className="text-gray-700">
                    Pour les demandes de devis colis, l&apos;annulation ou l&apos;abandon avant acceptation d&apos;une proposition peut être effectué
                    depuis l&apos;espace client ; après acceptation, les parties conviennent entre elles des conditions d&apos;annulation.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-red-600 rounded-full mt-2"></div>
                  <span className="text-gray-700">Toute annulation tardive ou répétée peut entraîner des pénalités ou la suspension du compte.</span>
                </li>
              </ul>
            </div>

            {/* Section 7 */}
            <div className="mb-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <Shield size={24} className="text-indigo-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">7. Obligations des utilisateurs</h2>
              </div>
              
              <div className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-900 mb-3">Pour les clients :</h4>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2"></div>
                      <span className="text-blue-800 text-sm">Respecter les chauffeurs et leur véhicule.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2"></div>
                      <span className="text-blue-800 text-sm">Ne pas utiliser la plateforme à des fins frauduleuses.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2"></div>
                      <span className="text-blue-800 text-sm">Pour les envois de colis : fournir une description exacte du contenu et respecter la réglementation douanière applicable.</span>
                    </li>
                  </ul>
                </div>
                
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-semibold text-green-900 mb-3">Pour les chauffeurs (transport de personnes) :</h4>
                  <ul className="space-y-2">
                     <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 bg-green-600 rounded-full mt-2"></div>
                      <span className="text-green-800 text-sm">Être titulaire d&apos;une carte d&apos;exploitation ou d&apos;une autorisation de transport de personnes.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 bg-green-600 rounded-full mt-2"></div>
                      <span className="text-green-800 text-sm">Disposer d&apos;une assurance couvrant le transport de personnes.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 bg-green-600 rounded-full mt-2"></div>
                      <span className="text-green-800 text-sm">Fournir un véhicule en bon état et conforme aux normes de sécurité.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 bg-green-600 rounded-full mt-2"></div>
                      <span className="text-green-800 text-sm">Être en règle avec les obligations légales et fiscales applicables.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 bg-green-600 rounded-full mt-2"></div>
                      <span className="text-green-800 text-sm">Respecter les horaires et trajets convenus avec les clients.</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3">Pour les transporteurs (colis internationaux) :</h4>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 bg-gray-600 rounded-full mt-2"></div>
                      <span className="text-gray-700 text-sm">Disposer des autorisations, assurances et capacités nécessaires au transport de marchandises sur les axes concernés.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 bg-gray-600 rounded-full mt-2"></div>
                      <span className="text-gray-700 text-sm">Proposer des tarifs sincères et tenir les engagements pris après acceptation du devis par le client.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 bg-gray-600 rounded-full mt-2"></div>
                      <span className="text-gray-700 text-sm">Respecter la réglementation douanière et les interdictions relatives aux marchandises transportées.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 bg-gray-600 rounded-full mt-2"></div>
                      <span className="text-gray-700 text-sm">Maintenir à jour ses disponibilités sur la plateforme pour un matching pertinent des demandes.</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Section 7 */}
            <div className="mb-12">
  {/* En-tête de section */}
  <div className="flex items-center gap-4 mb-6">
    <div className="w-14 h-14 bg-orange-100 rounded-xl flex items-center justify-center shadow-sm">
      <AlertTriangle size={26} className="text-orange-600" />
    </div>
    <div>
      <h2 className="text-3xl font-bold text-gray-900">8. Responsabilités</h2>
      <p className="text-sm text-gray-500 mt-1">Encadré juridique relatif à l’usage de la plateforme TuniDrive.net</p>
    </div>
  </div>

  {/* Bloc principal */}
  <div className="bg-gradient-to-br from-orange-50 to-white border border-orange-200 rounded-2xl shadow-sm p-8">
    <h3 className="text-lg font-semibold text-orange-700 mb-5">Principes de responsabilité</h3>

    <ul className="space-y-5">
      <li className="flex items-start gap-3">
        <div className="mt-1.5">
          <div className="w-2.5 h-2.5 bg-orange-600 rounded-full"></div>
        </div>
        <p className="text-gray-800 leading-relaxed">
          <strong className="text-orange-800">TuniDrive.net</strong> agit exclusivement comme un 
          <strong> intermédiaire technique </strong> facilitant la mise en relation entre clients et chauffeurs ou transporteurs indépendants.
        </p>
      </li>

      <li className="flex items-start gap-3">
        <div className="mt-1.5">
          <div className="w-2.5 h-2.5 bg-orange-600 rounded-full"></div>
        </div>
        <p className="text-gray-800 leading-relaxed">
          TuniDrive n&apos;assure ni le transport de personnes, ni le transport de colis, ni la gestion des prestations.
          Elle ne peut être tenue responsable de la qualité des services, des retards, des annulations, des pertes, avaries,
          retards douaniers ou de tout dommage subi lors d&apos;un trajet ou d&apos;une livraison.
        </p>
      </li>

      <li className="flex items-start gap-3">
        <div className="mt-1.5">
          <div className="w-2.5 h-2.5 bg-orange-600 rounded-full"></div>
        </div>
        <p className="text-gray-800 leading-relaxed">
          Chaque chauffeur ou transporteur est <strong>seul responsable</strong> de ses prestations vis-à-vis des clients et agit en toute indépendance.
        </p>
      </li>

      <li className="flex items-start gap-3">
        <div className="mt-1.5">
          <div className="w-2.5 h-2.5 bg-orange-600 rounded-full"></div>
        </div>
        <p className="text-gray-800 leading-relaxed">
          Les prestations sont exécutées sous la <strong>responsabilité exclusive</strong> des professionnels partenaires, qui doivent disposer
          de toutes les <strong>autorisations légales</strong> requises (transport de personnes, transport de marchandises, assurance, douane, etc.)
          conformément aux réglementations applicables en Tunisie, en Europe et sur les axes traversés.
          Ils assument les obligations relatives à la sécurité, la conformité des véhicules, l&apos;emballage, la déclaration du contenu des colis
          et au respect du code de la route.
        </p>
      </li>
    </ul>
  </div>
</div>


            {/* Section 8 */}
            <div className="mb-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <Users size={24} className="text-red-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">9. Suspension ou résiliation de compte</h2>
              </div>
              
              <p className="text-gray-700 mb-4">
                TuniDrive.net se réserve le droit de suspendre ou supprimer le compte de tout utilisateur (client, chauffeur ou transporteur) en cas de :
              </p>
              
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-red-600 rounded-full mt-2"></div>
                  <span className="text-gray-700">Non-respect des présentes CGU.</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-red-600 rounded-full mt-2"></div>
                  <span className="text-gray-700">Utilisation frauduleuse ou abusive de la plateforme.</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-red-600 rounded-full mt-2"></div>
                  <span className="text-gray-700">Fausses informations fournies lors de l'inscription.</span>
                </li>
              </ul>
            </div>

            {/* Section 9 */}
            <div className="mb-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Shield size={24} className="text-purple-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">10. Données personnelles</h2>
              </div>
              
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <p className="text-purple-800">
                  L'utilisation de la plateforme implique la collecte et le traitement de données personnelles.
                  La gestion de ces données est détaillée dans notre{' '}
                  <strong>Politique de confidentialité</strong>.
                </p>
              </div>
            </div>

            {/* Section 10 */}
            <div className="mb-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                  <FileText size={24} className="text-gray-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">11. Propriété intellectuelle</h2>
              </div>
              
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-gray-600 rounded-full mt-2"></div>
                  <span className="text-gray-700">Tous les contenus du site TuniDrive.net (textes, logos, design, code, etc.) sont protégés par le droit d'auteur.</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-gray-600 rounded-full mt-2"></div>
                  <span className="text-gray-700">Toute reproduction ou utilisation sans autorisation préalable est interdite.</span>
                </li>
              </ul>
            </div>

            {/* Section 11 */}
            <div className="mb-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Calendar size={24} className="text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">12. Modification des CGU</h2>
              </div>
              
              <div className="space-y-4">
                <p className="text-gray-700">
                  Nous pouvons modifier les présentes CGU à tout moment.
                </p>
                <p className="text-gray-700">
                  La version en vigueur sera toujours accessible sur le site.
                </p>
              </div>
            </div>

            {/* Section 12 */}
            <div className="mb-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <Scale size={24} className="text-indigo-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">13. Droit applicable</h2>
              </div>
              
              <div className="space-y-4">
                <p className="text-gray-700">
                  Les présentes CGU sont régies par le droit tunisien.
                </p>
                <p className="text-gray-700">
                  Tout litige relatif à l'utilisation du site sera soumis à la compétence exclusive des tribunaux tunisiens.
                </p>
              </div>
            </div>

            {/* Section 13 */}
            <div className="mb-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <Mail size={24} className="text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">14. Contact</h2>
              </div>
              
              <p className="text-gray-700 mb-4">
                Pour toute question relative aux présentes Conditions d'utilisation :
              </p>
              
              <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                <Mail size={32} className="text-green-600 mx-auto mb-3" />
                <p className="text-xl font-semibold text-green-900">
                  📧 support@tunidrive.net
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