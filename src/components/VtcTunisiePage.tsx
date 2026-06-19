import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Car,
  CheckCircle,
  MapPin,
  Plane,
  Users,
  Shield,
  Clock,
} from 'lucide-react';
import { Button } from './ui/Button';
import { Footer } from './Footer';
import {
  vtcAirportTransfers,
  vtcSeoFaqItems,
  vtcServiceHighlights,
} from '../data/vtcSeoFaq';

interface VtcTunisiePageProps {
  onClientLogin: () => void;
}

export const VtcTunisiePage: React.FC<VtcTunisiePageProps> = ({ onClientLogin }) => {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero SEO */}
      <section className="bg-gray-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
          <div className="max-w-4xl">
            <p className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
              VTC Tunisie · Chauffeur privé
            </p>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight tracking-tight">
              VTC Tunisie — Réservez votre chauffeur privé en ligne
            </h1>
            <p className="text-xl text-gray-600 mb-4 leading-relaxed">
              TuniDrive est la plateforme pour{' '}
              <strong>réserver un chauffeur privé</strong>, un{' '}
              <strong>taxi VTC</strong> ou un{' '}
              <strong>transport collectif</strong> partout en Tunisie : trajets urbains,
              inter-villes, transferts aéroport et déplacements en groupe.
            </p>
            <p className="text-base text-gray-500 mb-8">
              Prix transparent affiché avant confirmation · Chauffeurs partenaires vérifiés ·
              Réservation web et application mobile
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                size="lg"
                onClick={onClientLogin}
                className="text-lg px-8 py-4 bg-black hover:bg-gray-800 text-white rounded-lg font-medium inline-flex items-center justify-center gap-2"
              >
                Réserver un chauffeur
                <ArrowRight size={20} />
              </Button>
              <Link
                to="/signup"
                className="text-lg px-8 py-4 bg-white border-2 border-gray-300 text-gray-900 hover:bg-gray-50 rounded-lg font-medium inline-flex items-center justify-center gap-2 text-center"
              >
                Devenir chauffeur VTC
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Services ciblés SEO */}
      <section className="py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 text-center">
            Nos services VTC en Tunisie
          </h2>
          <p className="text-lg text-gray-600 text-center max-w-3xl mx-auto mb-12">
            Que vous cherchiez un <strong>chauffeur privé Tunisie</strong>, un{' '}
            <strong>transfert aéroport</strong> ou un <strong>transport collectif</strong>,
            TuniDrive vous met en relation avec des chauffeurs professionnels.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {vtcServiceHighlights.map((item) => (
              <article
                key={item.title}
                className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Transfert aéroport */}
      <section id="transfert-aeroport-tunisie" className="py-16 md:py-20 bg-gray-50 border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 justify-center mb-4">
            <Plane className="text-gray-700" size={28} />
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 text-center">
              Transfert aéroport Tunisie
            </h2>
          </div>
          <p className="text-lg text-gray-600 text-center max-w-3xl mx-auto mb-12">
            Réservez votre <strong>transfert aéroport Tunisie</strong> à l&apos;avance : accueil
            avec pancarte, suivi de vol et trajet direct vers votre destination.
          </p>
          <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            {vtcAirportTransfers.map((airport) => (
              <article
                key={airport.name}
                className="bg-white rounded-xl border border-gray-200 p-6"
              >
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{airport.name}</h3>
                <p className="text-sm text-gray-600">{airport.description}</p>
              </article>
            ))}
          </div>
          <div className="text-center mt-10">
            <Button
              size="lg"
              onClick={onClientLogin}
              className="bg-black hover:bg-gray-800 text-white inline-flex items-center gap-2"
            >
              Réserver mon transfert aéroport
              <ArrowRight size={18} />
            </Button>
          </div>
        </div>
      </section>

      {/* Transport collectif + confiance */}
      <section className="py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Users className="text-gray-700" size={24} />
                <h2 className="text-3xl font-bold text-gray-900">
                  Transport collectif Tunisie
                </h2>
              </div>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Pour vos sorties en groupe, séminaires, mariages ou circuits touristiques,
                réservez un <strong>van</strong> (jusqu&apos;à 8 personnes), un{' '}
                <strong>minibus</strong> ou un <strong>bus</strong> (jusqu&apos;à 50 passagers).
                Idéal pour le <strong>transport collectif</strong> en Tunisie avec un seul
                chauffeur et un tarif adapté à votre distance.
              </p>
              <ul className="space-y-3 text-sm text-gray-700">
                {[
                  'Van et minibus pour familles et petits groupes',
                  'Bus pour événements et longues distances',
                  'Tarif calculé selon la distance et le véhicule',
                  'Réservation en ligne sur le site ou l\'app TuniDrive',
                ].map((line) => (
                  <li key={line} className="flex items-start gap-2">
                    <CheckCircle size={16} className="text-green-500 mt-0.5 flex-shrink-0" />
                    {line}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-gray-50 rounded-2xl p-8 border border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Pourquoi réserver sur TuniDrive ?
              </h2>
              <div className="space-y-5">
                {[
                  { icon: Shield, title: 'Chauffeurs vérifiés', text: 'Partenaires inscrits et contrôlés par TuniDrive.' },
                  { icon: Clock, title: 'Réservation rapide', text: 'Réservez un taxi ou un VTC en quelques minutes.' },
                  { icon: MapPin, title: 'Toute la Tunisie', text: 'Grandes villes, côtes, sud tunisien et trajets inter-villes.' },
                  { icon: Car, title: 'Tarif affiché à l\'avance', text: 'Grille tarifaire claire, sans mauvaise surprise.' },
                ].map(({ icon: Icon, title, text }) => (
                  <div key={title} className="flex gap-4">
                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-gray-200 flex-shrink-0">
                      <Icon size={20} className="text-gray-700" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{title}</h3>
                      <p className="text-sm text-gray-600">{text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ visible (rich snippets) */}
      <section id="faq-vtc" className="py-16 md:py-20 bg-gray-50 border-t border-gray-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            Questions fréquentes — VTC &amp; chauffeur privé
          </h2>
          <div className="space-y-4">
            {vtcSeoFaqItems.map((item) => (
              <details
                key={item.question}
                className="bg-white rounded-xl border border-gray-200 p-5 group open:shadow-sm"
              >
                <summary className="font-semibold text-gray-900 cursor-pointer list-none flex justify-between gap-4">
                  {item.question}
                  <span className="text-gray-400 group-open:rotate-45 transition-transform text-xl leading-none">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-black text-white">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Réservez votre VTC ou votre chauffeur privé maintenant
          </h2>
          <p className="text-gray-300 mb-8">
            Inscription gratuite · Disponible sur{' '}
            <Link to="/" className="underline hover:text-white">
              tunidrive.net
            </Link>{' '}
            et sur l&apos;application mobile iOS &amp; Android
          </p>
          <Button
            size="lg"
            onClick={onClientLogin}
            className="bg-white text-gray-900 hover:bg-gray-100 text-lg px-8 py-4"
          >
            Commencer ma réservation
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  );
};
