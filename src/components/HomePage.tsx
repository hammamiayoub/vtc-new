import React from 'react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Car,
  Clock,
  Shield,
  Star,
  ArrowRight,
  CheckCircle,
  Users,
  Truck,
  Bus,
  Crown,
  Package,
  Globe,
  Plane,
} from 'lucide-react';
import { Button } from './ui/Button';
import { Footer } from './Footer';
import { AppDownloadModal } from './AppDownloadModal';
import { HomeBookingWidget } from './HomeBookingWidget';
import { TrustSignals } from './TrustSignals';
import { ReviewsCarousel } from './ReviewsCarousel';
import { vtcSeoFaqItems } from '../data/vtcSeoFaq';
import { vtcSeoFaqItemsEn } from '../data/vtcSeoFaq.en';
import { focusHomeBookingForm } from '../utils/focusHomeBooking';
import { useLocale } from '../i18n/locale';
import { RevealSection } from './ui/RevealSection';

interface HomePageProps {
  onGetStarted: () => void;
  onClientLogin: () => void;
  onClientSignup: () => void;
  onDriverLogin: () => void;
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

const serviceOffers = [
  {
    icon: Car,
    title: 'Course VTC',
    titleEn: 'Private ride',
    description: 'Réservez un chauffeur privé en quelques clics pour vos trajets en Tunisie.',
    descriptionEn: 'Book a private driver in a few clicks for trips across Tunisia.',
    href: '/client-login',
    cta: 'Réserver',
    ctaEn: 'Book',
  },
  {
    icon: Plane,
    title: 'Transfert aéroport',
    titleEn: 'Airport transfer',
    description: 'Tunis-Carthage, Enfidha, Monastir — prise en charge à l\'heure convenue.',
    descriptionEn: 'Tunis-Carthage, Enfidha, Monastir — pickup at the agreed time.',
    href: '/vtc-tunisie#transfert-aeroport-tunisie',
    cta: 'Détails',
    ctaEn: 'Details',
  },
  {
    icon: Users,
    title: 'Transport collectif',
    titleEn: 'Group transport',
    description: 'Van, minibus ou bus pour vos groupes, familles et déplacements pro.',
    descriptionEn: 'Van, minibus or bus for groups, families and business trips.',
    href: '/vtc-tunisie#faq-vtc',
    cta: 'Détails',
    ctaEn: 'Details',
  },
  {
    icon: Package,
    title: 'Colis Europe ↔ Tunisie',
    titleEn: 'Parcels Europe ↔ Tunisia',
    description: 'Comparez les offres de transporteurs pour vos envois internationaux.',
    descriptionEn: 'Compare carrier offers for your international shipments.',
    href: '/transport-colis-europe-tunisie',
    cta: 'Détails',
    ctaEn: 'Details',
  },
];

export const HomePage: React.FC<HomePageProps> = ({
  onGetStarted,
  onClientLogin,
  onClientSignup,
  onDriverLogin,
}) => {
  const { locale, href } = useLocale();
  const en = locale === 'en';
  const [isDownloadOpen, setIsDownloadOpen] = useState(false);
  const faqItems = en ? vtcSeoFaqItemsEn : vtcSeoFaqItems;

  const scrollToBooking = () => {
    focusHomeBookingForm();
  };

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

  return (
    <div className="min-h-screen bg-white">
      <AppDownloadModal isOpen={isDownloadOpen} onClose={() => setIsDownloadOpen(false)} />
      <main>
        {/* Hero — style Uber */}
        <section className="bg-white">
          <div className="page-container py-12 lg:py-20">
            <div className="lg:grid lg:grid-cols-2 lg:gap-16 lg:items-center">
              <div className="mb-10 lg:mb-0">
                <h1 className="text-4xl sm:text-5xl lg:text-[3.25rem] font-bold text-gray-900 leading-[1.1] tracking-tight mb-6">
                  {en ? 'Go wherever you want with TuniDrive' : 'Allez où vous voulez avec TuniDrive'}
                </h1>
                <p className="text-lg text-gray-600 leading-relaxed mb-4">
                  {en ? (
                    <>
                      Book a <strong>private driver</strong>, a <strong>taxi</strong> or an{' '}
                      <strong>airport transfer</strong> in Tunisia. Vans, buses and parcel transport between Europe and Tunisia.
                    </>
                  ) : (
                    <>
                      Réservez un <strong>chauffeur privé</strong>, un <strong>taxi</strong> ou un{' '}
                      <strong>transfert aéroport</strong> en Tunisie. Van, bus et transport de colis Europe ↔ Tunisie.
                    </>
                  )}
                </p>
                <TrustSignals variant="bar" className="mb-6 justify-start" />
                <p className="text-base text-gray-500 mb-6">
                  <Link to={href('/vtc-tunisie')} className="underline underline-offset-2 hover:text-gray-900">
                    {en ? 'Explore private driver services in Tunisia' : 'Découvrir nos services VTC en Tunisie'}
                  </Link>
                </p>
                <div className="hidden lg:grid grid-cols-2 gap-3 w-full max-w-xl">
                  <Button size="md" onClick={scrollToBooking} className="rounded-full w-full px-4">
                    {en ? 'Book a ride' : 'Réserver une course'}
                    <ArrowRight size={18} className="ml-2 shrink-0" />
                  </Button>
                  <Button size="md" variant="outline" onClick={onGetStarted} className="rounded-full w-full px-4">
                    {en ? 'Become a driver' : 'Devenir chauffeur'}
                  </Button>
                  <Button size="md" variant="outline" onClick={onDriverLogin} className="rounded-full w-full px-4">
                    {en ? 'Driver login' : 'Connexion chauffeur'}
                  </Button>
                  <Button size="md" variant="outline" onClick={onClientLogin} className="rounded-full w-full px-4">
                    {en ? 'Rider login' : 'Connexion client'}
                  </Button>
                </div>
              </div>

              <div id="reserver" className="scroll-mt-24">
                <HomeBookingWidget
                  onClientLogin={onClientLogin}
                  onClientSignup={onClientSignup}
                />
              </div>

              <div className="grid lg:hidden grid-cols-2 gap-3 mt-8">
                <Button size="md" onClick={scrollToBooking} className="rounded-full w-full px-3 text-sm">
                  {en ? 'Book a ride' : 'Réserver une course'}
                </Button>
                <Button size="md" variant="outline" onClick={onGetStarted} className="rounded-full w-full px-3 text-sm">
                  {en ? 'Become a driver' : 'Devenir chauffeur'}
                </Button>
                <Button size="md" variant="outline" onClick={onDriverLogin} className="rounded-full w-full px-3 text-sm">
                  {en ? 'Driver login' : 'Connexion chauffeur'}
                </Button>
                <Button size="md" variant="outline" onClick={onClientLogin} className="rounded-full w-full px-3 text-sm">
                  {en ? 'Rider login' : 'Connexion client'}
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Services — carrousel de cartes type Uber */}
        <RevealSection className="py-16 bg-surface-muted">
          <div className="page-container">
            <div className="text-center mb-10 max-w-3xl mx-auto">
              <h2 className="page-heading">
                {en ? 'See what you can do with TuniDrive' : 'Découvrez ce que vous pouvez faire avec TuniDrive'}
              </h2>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {serviceOffers.map(({ icon: Icon, title, titleEn, description, descriptionEn, href: offerHref, cta, ctaEn }) => (
                <Link
                  key={title}
                  to={href(offerHref)}
                  className="uber-card p-6 flex flex-col h-full group"
                >
                  <div className="w-10 h-10 rounded-full bg-gray-900 text-white flex items-center justify-center mb-4">
                    <Icon size={20} />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{en ? titleEn : title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed flex-1">{en ? descriptionEn : description}</p>
                  <span className="mt-4 text-sm font-semibold text-gray-900 group-hover:underline">
                    {en ? ctaEn : cta} →
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </RevealSection>

        {/* Transport VTC */}
        <RevealSection id="transport-vtc" className="py-16 bg-white">
          <div className="page-container">
            <div className="max-w-5xl mx-auto space-y-10">
              <div className="text-center">
                <h2 className="page-heading mb-4">
                  {en ? 'Passenger transport & private hire in Tunisia' : 'Transport de personnes & VTC en Tunisie'}
                </h2>
                <p className="page-subheading max-w-3xl mx-auto">
                  {en
                    ? 'Book a private driver for trips in Tunisia. Sedan, taxi, van, minibus or luxury vehicle.'
                    : 'Réservez un chauffeur privé ou un VTC pour vos déplacements en Tunisie. Berline, taxi, van, minibus ou véhicule de luxe.'}
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                {[
                  { icon: Plane, label: en ? 'Airport transfer in Tunisia' : 'Transfert aéroport Tunisie', href: '/vtc-tunisie#transfert-aeroport-tunisie' },
                  { icon: Car, label: en ? 'Book a taxi / driver' : 'Réserver taxi / chauffeur', href: '/client-login' },
                  { icon: Users, label: en ? 'Group transport' : 'Transport collectif', href: '/vtc-tunisie#faq-vtc' },
                ].map(({ icon: Icon, label, href: itemHref }) => (
                  <Link
                    key={label}
                    to={href(itemHref)}
                    className="flex items-center gap-3 uber-card p-4 text-sm font-medium text-gray-800"
                  >
                    <Icon size={20} className="text-gray-600 flex-shrink-0" />
                    {label}
                  </Link>
                ))}
              </div>

              <div className="grid md:grid-cols-2 gap-6">
              {[
                {
                  icon: Users,
                  title: en ? 'For riders' : 'Pour les clients',
                  items: en
                    ? ['Book your ride in a few clicks', 'Transparent fare shown before you confirm', 'Verified partner drivers']
                    : ['Réservez votre course en quelques clics', 'Tarif transparent communiqué avant validation', 'Chauffeurs partenaires vérifiés'],
                },
                {
                  icon: Car,
                  title: en ? 'For drivers' : 'Pour les chauffeurs',
                  items: en
                    ? ['Receive requests that match your availability', 'Manage your vehicles and schedule', 'Grow your private-hire activity']
                    : ['Recevez des demandes selon vos disponibilités', 'Gérez vos véhicules et votre planning', 'Développez votre activité VTC'],
                },
              ].map(({ icon: Icon, title, items }) => (
                <div key={title} className="uber-card p-8">
                  <div className="w-10 h-10 bg-surface-muted rounded-full flex items-center justify-center mb-4">
                    <Icon className="text-gray-700" size={20} />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">{title}</h3>
                  <ul className="space-y-2 text-gray-600 text-sm">
                    {items.map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <CheckCircle size={16} className="text-gray-900 mt-0.5 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" onClick={onClientLogin} className="rounded-full">
                  {en ? 'Book a ride' : 'Réserver une course'}
                  <ArrowRight size={20} className="ml-2" />
                </Button>
                <Button size="lg" variant="outline" onClick={onGetStarted} className="rounded-full">
                  {en ? 'Become a partner driver' : 'Devenir chauffeur partenaire'}
                </Button>
              </div>
            </div>
          </div>
        </RevealSection>

        {/* Transport colis */}
        <RevealSection id="transport-colis" className="py-16 bg-surface-muted">
          <div className="page-container">
            <div className="text-center mb-12 max-w-3xl mx-auto">
              <span className="inline-flex items-center gap-2 px-3 py-1 bg-white rounded-full text-xs font-semibold text-gray-700 border border-surface-border mb-4">
                <Globe size={14} />
                Europe ↔ Tunisie
              </span>
              <h2 className="page-heading mb-4">{en ? 'Parcel and goods transport' : 'Transport de colis et marchandises'}</h2>
              <p className="page-subheading">
                {en
                  ? 'Submit a quote request: qualified carriers send their prices, you compare and confirm online.'
                  : 'Déposez une demande de devis : les transporteurs qualifiés vous proposent leurs tarifs, vous comparez et validez en ligne.'}
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto mb-12">
              {[
                {
                  icon: Package,
                  title: en ? 'For clients' : 'Pour les clients',
                  items: en
                    ? ['Describe your shipment (addresses, date, photos)', 'Receive several price offers', 'Choose the best offer']
                    : ['Décrivez votre envoi (adresses, date, photos)', 'Recevez plusieurs propositions de prix', 'Choisissez la meilleure offre'],
                },
                {
                  icon: Truck,
                  title: en ? 'For carriers' : 'Pour les transporteurs',
                  items: en
                    ? ['Receive requests that match your routes', 'Propose your price in EUR or TND', 'Exchange contact details after acceptance']
                    : ['Recevez les demandes correspondant à vos trajets', 'Proposez votre tarif en EUR ou TND', 'Échangez vos coordonnées après acceptation'],
                },
              ].map(({ icon: Icon, title, items }) => (
                <div key={title} className="uber-card p-8">
                  <div className="w-10 h-10 bg-surface-muted rounded-full flex items-center justify-center mb-4">
                    <Icon className="text-gray-700" size={20} />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">{title}</h3>
                  <ul className="space-y-2 text-gray-600 text-sm">
                    {items.map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <CheckCircle size={16} className="text-gray-900 mt-0.5 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button size="lg" onClick={onClientLogin} className="rounded-full">
                {en ? 'Request a parcel quote' : 'Demander un devis colis'}
                <ArrowRight size={20} className="ml-2" />
              </Button>
              <Link
                to={href('/transport-colis-europe-tunisie')}
                className="text-sm font-semibold text-gray-700 hover:text-gray-900 underline-offset-4 hover:underline"
              >
                {en ? 'Learn more' : 'En savoir plus'}
              </Link>
            </div>
          </div>
        </RevealSection>

        {/* Pourquoi TuniDrive */}
        <RevealSection className="py-16 bg-white">
          <div className="page-container">
            <div className="text-center mb-12 max-w-2xl mx-auto">
              <h2 className="page-heading mb-4">{en ? 'Why choose TuniDrive?' : 'Pourquoi choisir TuniDrive ?'}</h2>
              <p className="page-subheading">
                {en
                  ? 'Passenger rides, international parcels and bulky goods'
                  : 'Courses de personnes, colis internationaux et marchandises volumineuses'}
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { icon: Shield, title: en ? 'Safety first' : 'Sécurité maximale', description: en ? 'Verified drivers and full insurance' : 'Chauffeurs vérifiés et assurance complète' },
                { icon: Clock, title: en ? 'On time' : 'Ponctualité garantie', description: en ? 'Instant booking and live tracking' : 'Réservation instantanée et suivi en temps réel' },
                { icon: Star, title: en ? 'Premium service' : 'Service premium', description: en ? 'Comfortable vehicles and 24/7 support' : 'Véhicules confortables et support 24/7' },
                { icon: Car, title: en ? 'Transparent fares' : 'Tarifs transparents', description: en ? 'A clear fare grid based on distance' : 'Grille tarifaire claire selon la distance' },
              ].map(({ icon: Icon, title, description }) => (
                <div key={title} className="uber-card p-6 text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-surface-muted rounded-full mb-4">
                    <Icon size={22} className="text-gray-700" />
                  </div>
                  <h3 className="text-base font-semibold text-gray-900 mb-2">{title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{description}</p>
                </div>
              ))}
            </div>
          </div>
        </RevealSection>

        <ReviewsCarousel />

        {/* Véhicules */}
        <RevealSection className="py-16 bg-surface-muted">
          <div className="page-container">
            <div className="text-center mb-12 max-w-3xl mx-auto">
              <h2 className="page-heading mb-4">{en ? 'Our transport services' : 'Nos services de transport'}</h2>
              <p className="page-subheading">
                {en
                  ? 'A full range of vehicles for your trips and for goods transport'
                  : 'Une gamme complète de véhicules pour vos trajets et le transport de marchandises'}
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { webp: '/van.webp', png: '/van.png', alt: en ? 'Group van' : 'Van de transport collectif', title: en ? 'Shared van' : 'Van collectif', desc: en ? 'Group transport for up to 8 people.' : 'Transport de groupe jusqu\'à 8 personnes.', cap: en ? 'Up to 8 passengers' : 'Jusqu\'à 8 passagers', icon: Users, color: 'from-blue-500 to-blue-600' },
                { webp: '/bus.webp', png: '/bus.png', alt: en ? 'Coach' : 'Bus de transport', title: en ? 'Coach' : 'Bus de transport', desc: en ? 'Long-distance trips and large groups.' : 'Trajets longue distance et grands groupes.', cap: en ? 'Up to 50 passengers' : 'Jusqu\'à 50 passagers', icon: Bus, color: 'from-green-500 to-green-600' },
                { webp: '/utilitaire.webp', png: '/utilitaire.png', alt: en ? 'Utility vehicle' : 'Véhicule utilitaire', title: en ? 'Utility vehicle' : 'Véhicule utilitaire', desc: en ? 'Goods transport and moving.' : 'Transport de marchandises et déménagement.', cap: en ? 'Goods transport' : 'Transport de marchandises', icon: Truck, color: 'from-orange-500 to-orange-600' },
                { webp: '/limousine.webp', png: '/limousine.png', alt: en ? 'Luxury vehicle' : 'Véhicule de luxe', title: en ? 'Luxury vehicle' : 'Véhicule de luxe', desc: en ? 'Premium service for special occasions.' : 'Service premium pour occasions spéciales.', cap: en ? 'Premium service' : 'Service premium', icon: Crown, color: 'from-purple-500 to-purple-600' },
              ].map(({ webp, png, alt, title, desc, cap, icon: Icon, color }) => (
                <div key={title} className="group uber-card overflow-hidden">
                  <div className="relative h-44 overflow-hidden">
                    <VehiclePicture
                      webp={webp}
                      png={png}
                      alt={alt}
                      fallback={
                        <div className={`absolute inset-0 bg-gradient-to-br ${color} flex items-center justify-center`} style={{ display: 'none' }}>
                          <Icon size={56} className="text-white opacity-90" />
                        </div>
                      }
                    />
                  </div>
                  <div className="p-5">
                    <h3 className="text-base font-semibold text-gray-900 mb-2">{title}</h3>
                    <p className="text-sm text-gray-600 mb-3 leading-relaxed">{desc}</p>
                    <span className="text-xs text-gray-500">{cap}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="text-center mt-12">
              <Button size="lg" onClick={onClientLogin} className="rounded-full">
                {en ? 'See all vehicles' : 'Voir tous les véhicules'}
                <ArrowRight size={20} className="ml-2" />
              </Button>
            </div>
          </div>
        </RevealSection>

        {/* App mobile */}
        <RevealSection className="py-16 bg-white">
          <div className="page-container">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="page-heading mb-4">{en ? 'It is easier in the app' : "C'est plus simple dans l'application"}</h2>
              <p className="page-subheading mb-8">
                {en
                  ? 'Book rides, request parcel quotes and manage every trip from the TuniDrive app.'
                  : "Réservez vos courses, demandez des devis colis et gérez tous vos transports depuis l'app TuniDrive."}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <a
                  href="https://play.google.com/store/apps/details?id=com.tunidrive.mobile"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:opacity-80 transition-opacity"
                >
                  <img
                    src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg"
                    alt={en ? 'Get it on Google Play' : 'Disponible sur Google Play'}
                    className="h-12 w-auto"
                  />
                </a>
                <a
                  href="https://apps.apple.com/fr/app/tunidrive/id6753982765"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:opacity-80 transition-opacity"
                >
                  <img
                    src="https://upload.wikimedia.org/wikipedia/commons/3/3c/Download_on_the_App_Store_Badge.svg"
                    alt={en ? 'Download on the App Store' : "Télécharger sur l'App Store"}
                    className="h-12 w-auto"
                  />
                </a>
              </div>
            </div>
          </div>
        </RevealSection>

        {/* FAQ */}
        <RevealSection id="faq-vtc-accueil" className="py-16 bg-surface-muted">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="page-heading mb-2 text-center">
              {en ? 'Private driver & airport transfer' : 'VTC, chauffeur privé & transfert aéroport'}
            </h2>
            <p className="text-center text-gray-600 mb-8 text-sm">
              <Link to={href('/vtc-tunisie')} className="underline underline-offset-2 hover:text-gray-900">
                {en ? 'See the full Tunisia private-driver page' : 'Voir la page complète VTC Tunisie'}
              </Link>
            </p>
            <div className="space-y-3">
              {faqItems.slice(0, 4).map((item) => (
                <details key={item.question} className="uber-card p-4">
                  <summary className="font-medium text-gray-900 cursor-pointer text-sm">{item.question}</summary>
                  <p className="mt-2 text-sm text-gray-600 leading-relaxed">{item.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </RevealSection>

        {/* CTA chauffeurs */}
        <RevealSection className="py-16 bg-white">
          <div className="page-container">
            <div className="max-w-6xl mx-auto bg-black rounded-2xl p-10 sm:p-14 text-center text-white border border-gray-800">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4 tracking-tight">
                {en ? 'Drive when you want and earn on your own terms' : 'Conduisez quand vous voulez, générez des revenus sur mesure'}
              </h2>
              <p className="text-lg text-gray-300 mb-8 max-w-2xl mx-auto">
                {en
                  ? 'Offer rides and parcel transport between Europe and Tunisia.'
                  : "Proposez vos courses et vos services de transport de colis entre l'Europe et la Tunisie."}
              </p>
              <div className="flex flex-wrap justify-center gap-6 mb-10 text-sm text-gray-300">
                {(en ? ['Attractive earnings', 'Flexible hours', 'Dedicated support'] : ['Revenus attractifs', 'Horaires flexibles', 'Support dédié']).map((benefit) => (
                  <span key={benefit} className="flex items-center gap-2">
                    <CheckCircle size={18} className="text-white" />
                    {benefit}
                  </span>
                ))}
              </div>
              <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-3">
                <Button
                  size="lg"
                  onClick={onGetStarted}
                  className="rounded-full bg-white text-gray-900 hover:bg-gray-100"
                >
                  {en ? 'Get started' : 'Commencer maintenant'}
                </Button>
                <Button
                  size="lg"
                  //variant="outline"
                  onClick={onDriverLogin}
                  className="rounded-full bg-white text-gray-900 hover:bg-gray-100"
                >
                  {en ? 'Driver login' : 'Connexion chauffeur'}
                </Button>
              </div>
            </div>
          </div>
        </RevealSection>
      </main>
      <Footer />
    </div>
  );
};
