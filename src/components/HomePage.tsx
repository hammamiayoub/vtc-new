import React from 'react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Car, Clock, Shield, Star, ArrowRight, CheckCircle, Users, Truck, Bus, Crown, Package, Globe, Plane } from 'lucide-react';
import { Button } from './ui/Button';
import { Footer } from './Footer';
import { AppDownloadModal } from './AppDownloadModal';
import { vtcSeoFaqItems } from '../data/vtcSeoFaq';

interface HomePageProps {
  onGetStarted: () => void;
  onClientLogin: () => void;
}

function VehiclePicture({
  webp,
  png,
  alt,
  fallback,
}: {
  webp: string;
  png: string;
  alt: string;
  fallback: React.ReactNode;
}) {
  return (
    <picture>
      <source srcSet={webp} type="image/webp" />
      <img
        src={png}
        alt={alt}
        loading="lazy"
        decoding="async"
        width={800}
        height={600}
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        onError={(e) => {
          const target = e.currentTarget as HTMLImageElement;
          target.style.display = 'none';
          const nextElement = target.nextElementSibling as HTMLElement;
          if (nextElement) {
            nextElement.style.display = 'flex';
          }
        }}
      />
      {fallback}
    </picture>
  );
}

export const HomePage: React.FC<HomePageProps> = ({ onGetStarted, onClientLogin }) => {
  const [isDownloadOpen, setIsDownloadOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const flagKey = 'td_app_modal_shown_session';
    const alreadyShown = window.sessionStorage.getItem(flagKey) === '1';
    if (alreadyShown) return;
    const t = setTimeout(() => {
      setIsDownloadOpen(true);
      window.sessionStorage.setItem(flagKey, '1');
    }, 600);
    return () => clearTimeout(t);
  }, []);

  const handleCloseDownload = () => {
    setIsDownloadOpen(false);
  };

  return (
    <div className="min-h-screen bg-white">
      <AppDownloadModal isOpen={isDownloadOpen} onClose={handleCloseDownload} />
      <main>
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-gray-900 mb-4 leading-tight tracking-tight max-w-5xl mx-auto">
              Chauffeur privé &amp; transport sur mesure en Tunisie
            </h1>
            <p className="text-xl md:text-2xl font-semibold text-gray-700 mb-6 max-w-4xl mx-auto">
              Réservez un taxi, un transfert aéroport ou un transport collectif · Colis Europe ↔ Tunisie
            </p>
            <p className="text-lg text-gray-600 mb-6 max-w-3xl mx-auto leading-relaxed">
              TuniDrive vous permet de <strong>réserver un chauffeur privé en Tunisie</strong> en ligne :
              trajets urbains, inter-villes, aéroports Tunis-Carthage, Enfidha et Monastir, van et bus pour groupes.
            </p>
            <p className="text-base text-gray-500 mb-8 max-w-2xl mx-auto">
              <Link to="/vtc-tunisie" className="text-gray-700 underline underline-offset-2 hover:text-black">
                Découvrir nos services VTC en Tunisie
              </Link>
              {' '}— devis colis personnalisés, rapides et transparents.
            </p>
            <div className="flex flex-col sm:flex-row flex-wrap gap-4 justify-center max-w-3xl mx-auto">
              <Button 
                size="lg" 
                onClick={onClientLogin}
                className="text-lg px-8 py-4 bg-black hover:bg-gray-800 text-white rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 whitespace-nowrap"
              >
                Réservez une course
                <ArrowRight size={20} />
              </Button>
              <Button 
                size="lg" 
                onClick={onClientLogin}
                className="text-lg px-8 py-4 bg-black hover:bg-gray-800 text-white rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 whitespace-nowrap"
              >
                
                Envoyez vos colis
                <ArrowRight size={20} />
              </Button>
              <Button 
                size="lg" 
                onClick={onGetStarted} 
                className="text-lg px-8 py-4 bg-white border-2 border-gray-300 text-gray-900 hover:bg-gray-50 rounded-lg font-medium transition-all duration-200 whitespace-nowrap"
              >
                Devenir chauffeur / transporteur
                
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Transport de personnes — activité principale */}
      <section id="transport-vtc" className="py-20 bg-gray-50 border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 tracking-tight">
              Transport de personnes &amp; VTC en Tunisie
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Réservez un <strong>chauffeur privé</strong> ou un <strong>VTC</strong> pour vos déplacements en Tunisie.
              Berline, taxi, van, minibus ou véhicule de luxe — choisissez le véhicule adapté à votre trajet.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-4 max-w-5xl mx-auto mb-10">
            {[
              { icon: Plane, label: 'Transfert aéroport Tunisie', href: '/vtc-tunisie#transfert-aeroport-tunisie' },
              { icon: Car, label: 'Réserver taxi / chauffeur', href: '/client-login' },
              { icon: Users, label: 'Transport collectif', href: '/vtc-tunisie#faq-vtc' },
            ].map(({ icon: Icon, label, href }) => (
              <Link
                key={label}
                to={href}
                className="flex items-center gap-3 bg-white rounded-xl border border-gray-200 p-4 hover:border-gray-400 transition-colors text-sm font-medium text-gray-800"
              >
                <Icon size={20} className="text-gray-600 flex-shrink-0" />
                {label}
              </Link>
            ))}
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto mb-12">
            <div className="bg-gray-50 rounded-2xl p-8 shadow-sm border border-gray-200">
              <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mb-4">
                <Users className="text-gray-700" size={24} />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Pour les clients</h3>
              <ul className="space-y-2 text-gray-600 text-sm">
                <li className="flex items-start gap-2">
                  <CheckCircle size={16} className="text-green-500 mt-0.5 flex-shrink-0" />
                  Réservez votre course en quelques clics (adresse, date, véhicule)
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle size={16} className="text-green-500 mt-0.5 flex-shrink-0" />
                  Tarif transparent communiqué avant validation
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle size={16} className="text-green-500 mt-0.5 flex-shrink-0" />
                  Chauffeurs partenaires vérifiés et suivi de votre réservation
                </li>
              </ul>
            </div>
            <div className="bg-gray-50 rounded-2xl p-8 shadow-sm border border-gray-200">
              <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mb-4">
                <Car className="text-gray-700" size={24} />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Pour les chauffeurs</h3>
              <ul className="space-y-2 text-gray-600 text-sm">
                <li className="flex items-start gap-2">
                  <CheckCircle size={16} className="text-green-500 mt-0.5 flex-shrink-0" />
                  Recevez des demandes de courses selon vos disponibilités
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle size={16} className="text-green-500 mt-0.5 flex-shrink-0" />
                  Gérez vos véhicules et votre planning depuis votre espace
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle size={16} className="text-green-500 mt-0.5 flex-shrink-0" />
                  Développez votre activité VTC avec une visibilité accrue
                </li>
              </ul>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              size="lg"
              onClick={onClientLogin}
              className="text-lg px-8 py-4 bg-black hover:bg-gray-800 text-white rounded-lg font-medium transition-all duration-200 inline-flex items-center gap-2"
            >
              Réserver une course
              <ArrowRight size={20} />
            </Button>
            <Button
              size="lg"
              onClick={onGetStarted}
              className="text-lg px-8 py-4 bg-white border-2 border-gray-300 text-gray-900 hover:bg-gray-50 rounded-lg font-medium transition-all duration-200 inline-flex items-center gap-2"
            >
              Devenir chauffeur partenaire
              <ArrowRight size={20} />
            </Button>
          </div>
        </div>
      </section>

      {/* Transport international de colis */}
      <section id="transport-colis" className="py-20 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-800 rounded-full text-sm font-medium">
                <Globe size={16} />
                Europe ↔ Tunisie
              </span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 tracking-tight">
              Transport de colis et marchandises
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Vous envoyez ou recevez des colis à l&apos;international ? Déposez une demande de devis :
              les transporteurs qualifiés vous proposent leurs tarifs, vous comparez et validez en ligne.
              France, Italie, Allemagne, Espagne, Belgique, Luxembourg, Suisse, Pays-Bas ↔ Tunisie.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto mb-12">
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200">
              <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mb-4">
                <Package className="text-gray-700" size={24} />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Pour les clients</h3>
              <ul className="space-y-2 text-gray-600 text-sm">
                <li className="flex items-start gap-2">
                  <CheckCircle size={16} className="text-green-500 mt-0.5 flex-shrink-0" />
                  Décrivez votre envoi (adresses, date, photos, factures)
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle size={16} className="text-green-500 mt-0.5 flex-shrink-0" />
                  Recevez plusieurs propositions de prix
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle size={16} className="text-green-500 mt-0.5 flex-shrink-0" />
                  Choisissez la meilleure offre et organisez la livraison
                </li>
              </ul>
            </div>
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200">
              <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mb-4">
                <Truck className="text-gray-700" size={24} />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Pour les transporteurs</h3>
              <ul className="space-y-2 text-gray-600 text-sm">
                <li className="flex items-start gap-2">
                  <CheckCircle size={16} className="text-green-500 mt-0.5 flex-shrink-0" />
                  Recevez les demandes correspondant à vos disponibilités
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle size={16} className="text-green-500 mt-0.5 flex-shrink-0" />
                  Proposez votre tarif en EUR ou TND selon le trajet
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle size={16} className="text-green-500 mt-0.5 flex-shrink-0" />
                  Échangez vos coordonnées avec le client après acceptation
                </li>
              </ul>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              size="lg"
              onClick={onClientLogin}
              className="text-lg px-8 py-4 bg-black hover:bg-gray-800 text-white rounded-lg font-medium transition-all duration-200 inline-flex items-center gap-2"
            >
              Demander un devis transport de colis
              <ArrowRight size={20} />
            </Button>
            <Link
              to="/transport-colis-europe-tunisie"
              className="text-lg px-8 py-4 text-gray-700 hover:text-gray-900 font-medium underline-offset-4 hover:underline"
            >
              En savoir plus sur le transport de colis
            </Link>
          </div>
        </div>
      </section>

      {/* App Download Section */}
      {/* App Download Section */}
<section className="py-20 bg-gray-50">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div className="max-w-3xl mx-auto text-center">
      <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 tracking-tight">
        Téléchargez l'application TuniDrive
      </h2>
      
      <p className="text-xl text-gray-600 mb-8 leading-relaxed">
        Réservez vos courses, demandez des devis pour vos colis et gérez tous vos transports.
      </p>
      <p className="text-xl text-gray-600 mb-8 leading-relaxed">
        Devenez chauffeur ou transporteur et développez votre activité.
      </p>

      {/* Liste des avantages - centrée */}
      <div className="space-y-4 mb-10 inline-block text-left">
        {[
          'Réservation instantanée en 3 clics',
          'Historique de toutes vos courses',
          'Notifications push pour vos courses',
          'Suivi en temps réel de votre course'
        ].map((feature, index) => (
          <div key={index} className="flex items-center gap-3">
            <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span className="text-gray-700 font-medium">{feature}</span>
          </div>
        ))}
      </div>

      {/* Badges des stores - centrés */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
        <a 
          href="https://play.google.com/store/apps/details?id=com.tunidrive.mobile"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:scale-105 transition-transform duration-200"
        >
          <img 
            src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg" 
            alt="Disponible sur Google Play"
            className="h-14 w-auto"
          />
        </a>
        <a 
          href="https://apps.apple.com/fr/app/tunidrive/id6753982765"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:scale-105 transition-transform duration-200"
        >
          <img 
            src="https://upload.wikimedia.org/wikipedia/commons/3/3c/Download_on_the_App_Store_Badge.svg" 
            alt="Télécharger sur l'App Store"
            className="h-14 w-auto"
          />
        </a>
      </div>
      

    </div>
  </div>
</section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50" style={{backgroundColor: '#f5f5f5'}}>
      
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-6 tracking-tight">
              Pourquoi choisir TuniDrive ?
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Courses de personnes, colis internationaux et marchandises volumineuses
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Shield,
                title: 'Sécurité maximale',
                description: 'Chauffeurs vérifiés et assurance complète'
              },
              {
                icon: Clock,
                title: 'Ponctualité garantie',
                description: 'Réservation instantanée et suivi en temps réel'
              },
              {
                icon: Star,
                title: 'Service premium',
                description: 'Véhicules confortables et support 24/7'
              },
              {
                icon: Car,
                title: 'Tarifs transparents',
                description: 'Grille tarifaire claire selon la distance'
              }
            ].map((feature, index) => (
              <div 
                key={index}
                className="text-center p-8 bg-white rounded-2xl shadow-sm hover:shadow-md transition-all duration-300"
              >
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-2xl mb-6">
                  <feature.icon size={28} className="text-gray-700" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600 leading-relaxed text-sm">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-6 tracking-tight">
              Nos services de transport
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Une gamme complète de véhicules pour vos trajets et le transport de marchandises
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Van de transport collectif */}
            <div className="group bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100">
              <div className="relative h-48 overflow-hidden">
                <VehiclePicture
                  webp="/van.webp"
                  png="/van.png"
                  alt="Van de transport collectif"
                  fallback={
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center" style={{ display: 'none' }}>
                      <Users size={64} className="text-white opacity-90" />
                    </div>
                  }
                />
                <div className="absolute inset-0 bg-black bg-opacity-20"></div>
              </div>
              <div className="p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  Van collectif
                </h3>
                <p className="text-gray-600 mb-4 text-sm leading-relaxed">
                  Transport de groupe jusqu'à 8 personnes. Idéal pour les familles et les équipes.
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Jusqu'à 8 passagers</span>
                </div>
              </div>
            </div>

            {/* Bus */}
            <div className="group bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100">
              <div className="relative h-48 overflow-hidden">
                <VehiclePicture
                  webp="/bus.webp"
                  png="/bus.png"
                  alt="Bus de transport"
                  fallback={
                    <div className="absolute inset-0 bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center" style={{ display: 'none' }}>
                      <Bus size={64} className="text-white opacity-90" />
                    </div>
                  }
                />
                <div className="absolute inset-0 bg-black bg-opacity-20"></div>
              </div>
              <div className="p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  Bus de transport
                </h3>
                <p className="text-gray-600 mb-4 text-sm leading-relaxed">
                  Transport en commun confortable pour les trajets longue distance et les groupes.
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Jusqu'à 50 passagers</span>
                </div>
              </div>
            </div>

            {/* Utilitaire */}
            <div className="group bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100">
              <div className="relative h-48 overflow-hidden">
                <VehiclePicture
                  webp="/utilitaire.webp"
                  png="/utilitaire.png"
                  alt="Véhicule utilitaire"
                  fallback={
                    <div className="absolute inset-0 bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center" style={{ display: 'none' }}>
                      <Truck size={64} className="text-white opacity-90" />
                    </div>
                  }
                />
                <div className="absolute inset-0 bg-black bg-opacity-20"></div>
              </div>
              <div className="p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  Véhicule utilitaire
                </h3>
                <p className="text-gray-600 mb-4 text-sm leading-relaxed">
                  Transport de marchandises et déménagement. Spacieux et pratique.
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Transport de marchandises</span>
                </div>
              </div>
            </div>

            {/* Taxi */}
            <div className="group bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100">
              <div className="relative h-48 overflow-hidden">
                <VehiclePicture
                  webp="/limousine.webp"
                  png="/limousine.png"
                  alt="Véhicule de luxe"
                  fallback={
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center" style={{ display: 'none' }}>
                      <Crown size={64} className="text-white opacity-90" />
                    </div>
                  }
                />
                <div className="absolute inset-0 bg-black bg-opacity-20"></div>
              </div>
              <div className="p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  Véhicule de luxe
                </h3>
                <p className="text-gray-600 mb-4 text-sm leading-relaxed">
                  Service de luxe pour les occasions spéciales. Confort et élégance garantis.
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Service premium</span>
                </div>
              </div>
            </div>
          </div>

          {/* CTA pour réserver */}
          <div className="text-center mt-16">
            <div className="bg-gray-50 rounded-2xl p-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Trouvez le véhicule parfait pour votre trajet
              </h3>
              <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
                Choisissez parmi notre large gamme de véhicules et réservez en quelques clics
              </p>
              <Button 
                size="lg" 
                onClick={onClientLogin}
                className="text-lg px-8 py-4 bg-black hover:bg-gray-800 text-white rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 mx-auto"
              >
                Voir tous les véhicules
                <ArrowRight size={20} />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ VTC — contenu indexable */}
      <section id="faq-vtc-accueil" className="py-16 bg-white border-t border-gray-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2 text-center">
            VTC, chauffeur privé &amp; transfert aéroport
          </h2>
          <p className="text-center text-gray-600 mb-8 text-sm">
            <Link to="/vtc-tunisie" className="underline underline-offset-2 hover:text-gray-900">
              Voir la page complète VTC Tunisie
            </Link>
          </p>
          <div className="space-y-3">
            {vtcSeoFaqItems.slice(0, 4).map((item) => (
              <details key={item.question} className="bg-gray-50 rounded-xl border border-gray-200 p-4">
                <summary className="font-medium text-gray-900 cursor-pointer text-sm">{item.question}</summary>
                <p className="mt-2 text-sm text-gray-600 leading-relaxed">{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-black rounded-3xl p-12 text-center text-white">
            <h2 className="text-4xl font-bold mb-6 tracking-tight">
              Devenez chauffeur ou transporteur partenaire
            </h2>
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              Proposez vos courses et vos services de transport de colis entre l&apos;Europe et la Tunisie
            </p>
            <div className="grid md:grid-cols-3 gap-8 mb-10">
              {[
                'Revenus attractifs',
                'Horaires flexibles', 
                'Support dédié'
              ].map((benefit, index) => (
                <div key={index} className="flex items-center justify-center gap-3">
                  <CheckCircle size={20} className="text-green-400" />
                  <span className="text-gray-200">{benefit}</span>
                </div>
              ))}
            </div>
            <Button 
              size="lg" 
              onClick={onGetStarted} 
              className="text-lg px-8 py-4 bg-white text-gray-900 hover:bg-gray-100 rounded-lg font-medium transition-all duration-200"
            >
              Commencer maintenant
            </Button>
          </div>
        </div>
      </section>

      </main>
      {/* Footer */}
      <Footer />
    </div>
  );
};