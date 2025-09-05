import React from 'react';
import { Car, Clock, Shield, Star, ArrowRight, CheckCircle } from 'lucide-react';
import { Button } from './ui/Button';
import { Footer } from './Footer';

interface HomePageProps {
  onGetStarted: () => void;
  onClientLogin: () => void;
  onPrivacyPolicyClick: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onGetStarted, onClientLogin, onPrivacyPolicyClick }) => {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
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

      {/* Features Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-6 tracking-tight">
              Pourquoi choisir MyRide ?
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

      {/* CTA Section */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gray-900 rounded-3xl p-12 text-center text-white">
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
      <Footer onPrivacyPolicyClick={onPrivacyPolicyClick} />
    </div>
  );
};