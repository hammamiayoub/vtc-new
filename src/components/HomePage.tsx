import React from 'react';
import { Car, Clock, Shield, Star } from 'lucide-react';
import { Button } from './ui/Button';

interface HomePageProps {
  onGetStarted: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onGetStarted }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Votre plateforme de
              <span className="text-blue-600 block">transport privé</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto leading-relaxed">
              Connectez chauffeurs professionnels et passagers pour des trajets sûrs, 
              confortables et ponctuels dans toute la région.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" onClick={onGetStarted} className="text-lg px-8 py-4">
                Devenir chauffeur
              </Button>
              <Button variant="outline" size="lg" onClick={onClientSignup} className="text-lg px-8 py-4">
                Réserver une course
              </Button>
            </div>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute top-20 left-10 w-20 h-20 bg-blue-200 rounded-full opacity-20 animate-pulse"></div>
        <div className="absolute top-40 right-20 w-16 h-16 bg-green-200 rounded-full opacity-30 animate-pulse delay-1000"></div>
        <div className="absolute bottom-20 left-1/4 w-24 h-24 bg-orange-200 rounded-full opacity-25 animate-pulse delay-500"></div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Pourquoi choisir DriveConnect ?
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Une plateforme moderne qui révolutionne le transport privé
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: Shield,
                title: 'Sécurité maximale',
                description: 'Chauffeurs vérifiés et assurance complète pour tous les trajets'
              },
              {
                icon: Clock,
                title: 'Ponctualité garantie',
                description: 'Réservation en temps réel et suivi GPS en direct'
              },
              {
                icon: Star,
                title: 'Service premium',
                description: 'Véhicules haut de gamme et service client 24/7'
              },
              {
                icon: Car,
                title: 'Flotte moderne',
                description: 'Véhicules récents, confortables et écologiques'
              }
            ].map((feature, index) => (
              <div 
                key={index}
                className="text-center p-6 rounded-xl border border-gray-100 hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
              >
                <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                  <feature.icon size={32} className="text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-gray-900 mb-6">
            Rejoignez notre communauté de chauffeurs
          </h2>
          <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
            Développez votre activité avec notre plateforme. 
            Inscriptions rapides, commissions attractives, support dédié.
          </p>
          <Button size="lg" onClick={onGetStarted} className="text-lg px-8 py-4">
            Commencer maintenant
          </Button>
        </div>
      </section>
    </div>
  );
};