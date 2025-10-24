import React from 'react';
import { Car, Clock, Shield, Star, ArrowRight, CheckCircle, Users, Truck, Bus, Crown, Smartphone, QrCode, Download } from 'lucide-react';
import { Button } from './ui/Button';
import { Footer } from './Footer';

interface HomePageProps {
  onGetStarted: () => void;
  onClientLogin: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onGetStarted, onClientLogin }) => {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-8 leading-tight tracking-tight max-w-5xl mx-auto">
              Votre transport sur mesure
            </h1>
            <p className="text-xl text-gray-600 mb-12 max-w-3xl mx-auto leading-relaxed">
              Des trajets fiables avec des chauffeurs professionnels. 
              Simple, rapide et sécurisé.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-2xl mx-auto">
              <Button 
                size="lg" 
                onClick={onClientLogin}
                className="text-lg px-8 py-4 bg-black hover:bg-gray-800 text-white rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 whitespace-nowrap"
              >
                Réserver une course
                <ArrowRight size={20} />
              </Button>
              <Button 
                size="lg" 
                onClick={onGetStarted} 
                className="text-lg px-8 py-4 bg-white border-2 border-gray-300 text-gray-900 hover:bg-gray-50 rounded-lg font-medium transition-all duration-200 whitespace-nowrap"
              >
                Devenir chauffeur
              </Button>
            </div>
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
        Réservez vos courses en quelques secondes et gérez tous vos trajets.
      </p>
      <p className="text-xl text-gray-600 mb-8 leading-relaxed">
        Devenez chauffeur et gagnez de l'argent en conduisant.
      </p>

      {/* Liste des avantages - centrée */}
      <div className="space-y-4 mb-10 inline-block text-left">
        {[
          'Réservation instantanée en 3 clics',
          'Historique de toutes vos courses',
          'Notifications push pour vos courses'
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
          href="https://apps.apple.com/us/app/tunidrive/id6753982765"
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
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-6 tracking-tight">
              Pourquoi choisir TuniDrive ?
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Une expérience de transport premium et accessible
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
              Une gamme complète de véhicules pour tous vos besoins de transport
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Van de transport collectif */}
            <div className="group bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100">
              <div className="relative h-48 overflow-hidden">
                <img 
                  src="/van.png" 
                  alt="Van de transport collectif"
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
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center" style={{display: 'none'}}>
                  <Users size={64} className="text-white opacity-90" />
                </div>
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
                <img 
                  src="/bus.png" 
                  alt="Bus de transport"
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
                <div className="absolute inset-0 bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center" style={{display: 'none'}}>
                  <Bus size={64} className="text-white opacity-90" />
                </div>
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
                <img 
                  src="/utilitaire.png" 
                  alt="Véhicule utilitaire"
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
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center" style={{display: 'none'}}>
                  <Truck size={64} className="text-white opacity-90" />
                </div>
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

            {/* Limousine */}
            <div className="group bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100">
              <div className="relative h-48 overflow-hidden">
                <img 
                  src="/limousine.png" 
                  alt="Limousine premium"
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
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center" style={{display: 'none'}}>
                  <Crown size={64} className="text-white opacity-90" />
                </div>
                <div className="absolute inset-0 bg-black bg-opacity-20"></div>
              </div>
              <div className="p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  Limousine premium
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

      {/* CTA Section */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-black rounded-3xl p-12 text-center text-white">
            <h2 className="text-4xl font-bold mb-6 tracking-tight">
              Devenez chauffeur partenaire
            </h2>
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              Rejoignez des milliers de chauffeurs qui ont choisi la liberté et la flexibilité
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

      {/* Footer */}
      <Footer />
    </div>
  );
};