import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Car,
  ArrowRight,
  ChevronDown,
  Users,
  Truck,
  Package,
  Plane,
} from 'lucide-react';
import { Button } from './ui/Button';
import { Footer } from './Footer';
import { AppDownloadModal } from './AppDownloadModal';
import { AppStoreBadges } from './AppStoreBadges';
import { HomeBookingWidget } from './HomeBookingWidget';
import { TrustSignals } from './TrustSignals';
import {
  TaxiIllustration,
  BlackSedanIllustration,
  GreyVanIllustration,
  WhiteBusIllustration,
  MercedesLuxuryIllustration,
} from './VehicleIllustrations';
import { focusHomeBookingForm } from '../utils/focusHomeBooking';
import { ReviewsCarousel } from './ReviewsCarousel';
import { vtcSeoFaqItems } from '../data/vtcSeoFaq';
import { vtcSeoFaqItemsEn } from '../data/vtcSeoFaq.en';
import { useLocale } from '../i18n/locale';
import { setParcelScopeHint, clearParcelScopeHint } from '../utils/parcelScopeHint';
import { InternationalParcelIllustration } from './ui/ParcelIllustrations';
import { HomeRideSteps } from './HomeRideSteps';
import { RevealSection } from './ui/RevealSection';
import { useAppDownloadPrompt } from '../hooks/useAppDownloadPrompt';

interface HomePageProps {
  onGetStarted: () => void;
  onClientLogin: () => void;
  onClientSignup: () => void;
  onDriverLogin: () => void;
}

/** Photo détourée (fond transparent) ; retombe sur l'illustration si le fichier est absent. */
function VehicleArt({ photo, alt, Fallback }: { photo: string; alt: string; Fallback: React.ComponentType }) {
  const [failed, setFailed] = React.useState(false);
  if (failed) return <Fallback />;
  return (
    <img
      src={photo}
      alt={alt}
      loading="lazy"
      decoding="async"
      width={800}
      height={533}
      className="h-full w-full object-contain object-center p-6"
      onError={() => setFailed(true)}
    />
  );
}

const serviceOffers = [
  {
    icon: Car,
    title: 'Course VTC',
    photo: '/vehicles/berline-noire.webp',
    titleEn: 'Private ride',
    description: 'Réservez un chauffeur privé en quelques clics pour vos trajets en Tunisie.',
    descriptionEn: 'Book a private driver in a few clicks for trips across Tunisia.',
    href: null,
    cta: 'Voir le prix',
    ctaEn: 'See the price',
  },
  {
    icon: Plane,
    title: 'Transfert aéroport',
    photo: '/limousine.webp',
    titleEn: 'Airport transfer',
    description: 'Tunis-Carthage, Enfidha, Monastir — prise en charge à l\'heure convenue.',
    descriptionEn: 'Tunis-Carthage, Enfidha, Monastir — pickup at the agreed time.',
    href: '/vtc-tunisie#transfert-aeroport-tunisie',
    cta: 'Détails',
    ctaEn: 'Details',
  },
  {
    icon: Users,
    title: 'Groupes en séjour',
    photo: '/van.webp',
    titleEn: 'Groups on a stay',
    description: 'Visiteurs venant de l\'étranger : accueil à l\'aéroport et organisation des trajets du séjour.',
    descriptionEn: 'Visitors arriving from abroad: airport pickup and the trips of the stay, organized for the group.',
    href: '/transport-groupes-tunisie',
    cta: 'Découvrir',
    ctaEn: 'Discover',
  },
  {
    icon: Truck,
    title: 'Livraison de colis en Tunisie',
    photo: '/utilitaire.webp',
    titleEn: 'Parcel delivery in Tunisia',
    description: 'Faites livrer colis et marchandises partout en Tunisie : les transporteurs locaux vous proposent leur prix.',
    descriptionEn: 'Get parcels and goods delivered across Tunisia: local carriers send you their price.',
    href: '/livraison-colis-tunisie',
    cta: 'Détails',
    ctaEn: 'Details',
  },
  {
    icon: Package,
    title: 'Colis Europe ↔ Tunisie',
    photo: null,
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
  const navigate = useNavigate();
  const appDownloadPrompt = useAppDownloadPrompt();
  const faqItems = en ? vtcSeoFaqItemsEn : vtcSeoFaqItems;

  return (
    <div className="min-h-screen bg-surface-page">
      <AppDownloadModal isOpen={appDownloadPrompt.isOpen} onClose={appDownloadPrompt.close} />
      <main>
        {/* Hero : le formulaire de réservation est l'objet principal de l'écran */}
        <section>
          <div className="page-container pt-12 pb-16 sm:pt-16 lg:pt-24 lg:pb-28">
            {/* Trois blocs pour l'ordre mobile (texte, formulaire, réassurance) ; sur grand écran
                le formulaire occupe la colonne de droite, aligné en haut avec le titre. */}
            <div className="grid gap-10 lg:grid-cols-2 lg:grid-rows-[auto_1fr] lg:gap-x-16 lg:gap-y-8">
              <div className="lg:col-start-1 lg:row-start-1">
                <h1 className="text-display-md sm:text-display-lg xl:text-display-xl text-gray-900 mb-6 [text-wrap:balance]">
                  {en
                    ? 'Go wherever you want with TuniDrive'
                    : 'Allez où vous voulez avec TuniDrive'}
                </h1>
                <p className="text-body-lg text-gray-600 max-w-xl">
                  {en
                    ? 'The price is shown before you book. Vans and buses for groups, and parcel transport between Europe and Tunisia.'
                    : 'Le prix est affiché avant de réserver. Vans et bus pour les groupes, et transport de colis entre l’Europe et la Tunisie.'}
                </p>
              </div>

              <div
                id="reserver"
                className="scroll-mt-24 lg:col-start-2 lg:row-start-1 lg:row-span-2 lg:self-start"
              >
                <HomeBookingWidget
                  onClientLogin={onClientLogin}
                  onClientSignup={onClientSignup}
                />
              </div>

              <div className="lg:col-start-1 lg:row-start-2 lg:self-start max-w-xl">
                <TrustSignals variant="grid" limit={4} className="border-t border-surface-border pt-6 gap-x-6" />
                <p className="mt-6 text-body-sm text-gray-600">
                  {en ? 'Are you a driver?' : 'Vous êtes chauffeur ?'}{' '}
                  <button
                    type="button"
                    onClick={onGetStarted}
                    className="focus-ring rounded-md font-medium text-gray-900 underline underline-offset-4 hover:text-gray-600"
                  >
                    {en ? 'Drive with TuniDrive' : 'Devenir chauffeur'}
                  </button>
                  <span aria-hidden="true"> · </span>
                  <button
                    type="button"
                    onClick={onDriverLogin}
                    className="focus-ring rounded-md font-medium text-gray-900 hover:underline underline-offset-4"
                  >
                    {en ? 'Log in' : 'Se connecter'}
                  </button>
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* App mobile */}
        <RevealSection className="pb-20 md:pb-24">
          <div className="page-container">
            <div className="flex flex-col gap-6 rounded-card border border-surface-border bg-white p-6 sm:p-8 md:flex-row md:items-center md:justify-between">
              <div className="max-w-xl">
                <h2 className="text-heading-lg text-gray-900 mb-2">
                  {en ? 'Book and track from the app' : "Réservez et suivez depuis l'application"}
                </h2>
                <p className="text-body-md text-gray-600">
                  {en
                    ? 'Book rides, request parcel quotes and manage every trip from the TuniDrive app.'
                    : "Réservez vos courses, demandez des devis colis et gérez tous vos transports depuis l'app TuniDrive."}
                </p>
              </div>
              <AppStoreBadges />
            </div>
          </div>
        </RevealSection>

        {/* Parcours d'une réservation en cinq étapes */}
        <HomeRideSteps />

        {/* Transport VTC : étapes de réservation sur le fil de trajet + véhicules */}
        <RevealSection id="transport-vtc" className="py-20 md:py-28">
          <div className="page-container">
            <div className="max-w-2xl mb-14">
              <h2 className="page-heading mb-4 [text-wrap:balance]">
                {en ? 'Passenger transport & private hire in Tunisia' : 'Transport de personnes & VTC en Tunisie'}
              </h2>
              <p className="page-subheading">
                {en
                  ? 'Book a private driver for trips in Tunisia. Sedan, taxi, van, minibus or luxury vehicle.'
                  : 'Réservez un chauffeur privé ou un VTC pour vos déplacements en Tunisie. Berline, taxi, van, minibus ou véhicule de luxe.'}
              </p>
            </div>

            <ol className="grid md:grid-cols-3 mb-20">
              {(en
                ? [
                    { title: 'Enter your trip', text: 'Pickup and destination: the estimated fare is shown right away, no account needed.' },
                    { title: 'Choose your driver', text: 'Create a free account, then pick the vehicle and the verified driver that suit you.' },
                    { title: 'Confirm', text: 'The price is confirmed before departure and your driver picks you up at the agreed time.' },
                  ]
                : [
                    { title: 'Indiquez votre trajet', text: "Départ et destination : le tarif estimé s'affiche tout de suite, sans compte." },
                    { title: 'Choisissez votre chauffeur', text: 'Créez un compte gratuit, puis choisissez le véhicule et le chauffeur vérifié qui vous conviennent.' },
                    { title: 'Confirmez', text: "Le prix est confirmé avant le départ et votre chauffeur vient vous chercher à l'heure convenue." },
                  ]
              ).map(({ title, text }, index, all) => (
                <li key={title} className="relative border-t border-gray-300 pt-8 pb-8 md:pb-0 md:pr-12">
                  <span
                    aria-hidden="true"
                    className={`route-stop left-0 ${
                      index === 0 ? 'route-stop--start' : index === all.length - 1 ? 'route-stop--end' : 'route-stop--via'
                    }`}
                  />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed max-w-xs">{text}</p>
                </li>
              ))}
            </ol>

            {/* Véhicules : défilement horizontal au doigt sur mobile, grille à partir de md */}
            <div
              className="flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide -mx-4 px-4 py-1 scroll-px-4 sm:-mx-6 sm:px-6 sm:scroll-px-6 md:mx-0 md:px-0 md:grid md:grid-cols-2 md:gap-4 md:overflow-visible lg:grid-cols-6"
              role="list"
              aria-label={en ? 'Available vehicles' : 'Véhicules disponibles'}
            >
              {[
                { Art: TaxiIllustration, photo: '/vehicles/taxi-3d.webp', title: en ? 'Yellow taxi' : 'Taxi', desc: en ? 'Quick city rides and airport runs.' : 'Courses rapides en ville et vers l’aéroport.', cap: en ? 'Up to 4 passengers' : "Jusqu'à 4 passagers", span: 'lg:col-span-3' },
                { Art: BlackSedanIllustration, photo: '/vehicles/berline-3d.webp', title: en ? 'Black sedan' : 'Berline', desc: en ? 'Comfortable private-hire sedan.' : 'Berline confortable avec chauffeur privé.', cap: en ? 'Up to 4 passengers' : "Jusqu'à 4 passagers", span: 'lg:col-span-3' },
                { Art: GreyVanIllustration, photo: '/vehicles/van-3d.webp', title: en ? 'Grey van' : 'Van', desc: en ? 'Group transport for up to 8 people.' : "Transport de groupe jusqu'à 8 personnes.", cap: en ? 'Up to 8 passengers' : "Jusqu'à 8 passagers", span: 'lg:col-span-2' },
                { Art: WhiteBusIllustration, photo: '/vehicles/bus-3d.webp', title: en ? 'White coach' : 'Bus', desc: en ? 'Long-distance trips and large groups.' : 'Trajets longue distance et grands groupes.', cap: en ? 'Up to 50 passengers' : "Jusqu'à 50 passagers", span: 'lg:col-span-2' },
                { Art: MercedesLuxuryIllustration, photo: '/vehicles/premium-3d.webp', title: en ? 'Mercedes luxury' : 'Premium', desc: en ? 'Premium service for special occasions.' : 'Service premium pour occasions spéciales.', cap: en ? 'Premium service' : 'Service premium', span: 'lg:col-span-2' },
              ].map(({ Art, photo, title, desc, cap, span }) => (
                <div
                  key={title}
                  role="listitem"
                  className={`uber-card p-2 snap-start shrink-0 w-[78%] sm:w-[46%] md:w-auto ${span}`}
                >
                  <div className="relative aspect-[3/2] overflow-hidden rounded-lg bg-surface-muted">
                    <VehicleArt photo={photo} alt={title} Fallback={Art} />
                  </div>
                  <div className="px-3 pb-3 pt-4">
                    <h3 className="text-base font-medium text-gray-900 mb-1">{title}</h3>
                    <p className="text-sm text-gray-600 mb-3 leading-relaxed">{desc}</p>
                    <span className="text-xs text-gray-500">{cap}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-10">
              <Button size="lg" onClick={focusHomeBookingForm}>
                {en ? 'See the price of my trip' : 'Voir le prix de mon trajet'}
                <ArrowRight size={18} strokeWidth={1.5} className="ml-2" aria-hidden="true" />
              </Button>
            </div>
          </div>
        </RevealSection>

        {/* Groupes */}
        <RevealSection id="groupes-tunisie" className="scroll-mt-20 py-20 md:py-24 bg-surface-band">
          <div className="page-container">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-3">
                  {en ? 'From abroad' : "En Tunisie ou depuis l'étranger"}
                </p>
                <h2 className="page-heading mb-5 [text-wrap:balance]">{en ? 'Transport for groups' : 'Transport de groupes'}</h2>
                <p className="page-subheading mb-8 max-w-xl">
                  {en
                    ? 'Families, agencies and groups of friends landing for a stay: TuniDrive organizes their movements on the ground — airport welcome, hotel transfers, trips between cities and the return.'
                    : "Familles, agences et groupes d'amis qui arrivent pour un séjour : TuniDrive organise leurs déplacements sur place — accueil à l'aéroport, transferts hôtel, trajets entre villes et retour."}
                </p>
                <Link
                  to={href('/transport-groupes-tunisie')}
                  className="focus-ring rounded-md inline-flex items-center gap-2 text-sm font-medium text-gray-900 hover:underline underline-offset-4"
                >
                  {en ? 'See group transport' : 'Voir le transport de groupes'}
                  <ArrowRight size={16} strokeWidth={1.5} aria-hidden="true" />
                </Link>
              </div>
              <ul className="rounded-card border border-surface-border bg-white px-6 sm:px-8 divide-y divide-surface-border">
                {(en
                  ? [
                      'Pickup at Tunis-Carthage, Enfidha, Monastir or Djerba',
                      'Van, minibus or bus sized to the group',
                      'The stay programme is arranged before arrival',
                    ]
                  : [
                      'Prise en charge à Tunis-Carthage, Enfidha, Monastir ou Djerba',
                      'Van, minibus ou bus selon la taille du groupe',
                      "Le programme du séjour est préparé avant l'arrivée",
                    ]
                ).map((item) => (
                  <li key={item} className="py-5 text-base text-gray-900">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </RevealSection>

        <ReviewsCarousel />

        {/* Livraison locale de colis (Tunisie) */}
        <RevealSection id="livraison-colis-tunisie" className="scroll-mt-20 py-20 md:py-24 bg-surface-band">
          <div className="page-container">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-3">
                  {en ? 'Within Tunisia' : 'En Tunisie'}
                </p>
                <h2 className="page-heading mb-5 [text-wrap:balance]">
                  {en ? 'Parcel and goods delivery in Tunisia' : 'Livraison de colis et marchandises en Tunisie'}
                </h2>
                <p className="page-subheading mb-8 max-w-xl">
                  {en
                    ? 'Appliances, furniture, boxes or goods for your shop: local carriers send you their price in TND, you choose the best offer.'
                    : "Électroménager, meubles, cartons ou marchandises pour votre commerce : les transporteurs locaux vous proposent leur prix en TND, vous choisissez la meilleure offre."}
                </p>
                <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
                  <Button
                    size="lg"
                    onClick={() => {
                      setParcelScopeHint('local');
                      onClientSignup();
                    }}
                  >
                    {en ? 'Request a delivery quote' : 'Demander un devis livraison'}
                    <ArrowRight size={18} strokeWidth={1.5} className="ml-2" aria-hidden="true" />
                  </Button>
                  <Link
                    to={href('/livraison-colis-tunisie')}
                    className="focus-ring rounded-md text-center text-sm font-medium text-gray-700 hover:text-gray-900 underline-offset-4 hover:underline"
                  >
                    {en ? 'Learn more' : 'En savoir plus'}
                  </Link>
                </div>
              </div>
              <ol className="rounded-card border border-surface-border bg-white px-6 sm:px-8 divide-y divide-surface-border">
                {(en
                  ? ['Enter the pickup and delivery addresses in Tunisia', 'Receive offers from local carriers in your area', 'Compare and choose the best offer online']
                  : ["Indiquez l'adresse de départ et de livraison en Tunisie", 'Recevez les offres des transporteurs locaux de votre zone', 'Comparez et choisissez la meilleure offre en ligne']
                ).map((item, index) => (
                  <li key={item} className="flex gap-4 py-5 text-base text-gray-900">
                    <span className="w-6 flex-shrink-0 pt-0.5 text-sm tabular-nums text-gray-500">{String(index + 1).padStart(2, '0')}</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </RevealSection>

        {/* Transport colis (côté expéditeur) */}
        <RevealSection id="transport-colis" className="scroll-mt-20 py-20 md:py-24">
          <div className="page-container">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
              <ol className="order-2 lg:order-1 rounded-card border border-surface-border bg-white px-6 sm:px-8 divide-y divide-surface-border">
                {(en
                  ? ['Describe your shipment (addresses, date, photos)', 'Receive several price offers from carriers', 'Compare and choose the best offer online']
                  : ['Décrivez votre envoi (adresses, date, photos)', 'Recevez plusieurs propositions de prix des transporteurs', 'Comparez et choisissez la meilleure offre en ligne']
                ).map((item, index) => (
                  <li key={item} className="flex gap-4 py-5 text-base text-gray-900">
                    <span className="w-6 flex-shrink-0 pt-0.5 text-sm tabular-nums text-gray-500">{String(index + 1).padStart(2, '0')}</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ol>
              <div className="order-1 lg:order-2">
                <p className="text-sm font-medium text-gray-600 mb-3">
                  Europe ↔ {en ? 'Tunisia' : 'Tunisie'}
                </p>
                <h2 className="page-heading mb-5 [text-wrap:balance]">{en ? 'Parcel and goods transport' : 'Transport de colis et marchandises'}</h2>
                <p className="page-subheading mb-8 max-w-xl">
                  {en
                    ? 'Submit a quote request: qualified carriers send their prices, you compare and confirm online.'
                    : 'Déposez une demande de devis : les transporteurs qualifiés vous proposent leurs tarifs, vous comparez et validez en ligne.'}
                </p>
                <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
                  <Button
                    size="lg"
                    onClick={() => {
                      clearParcelScopeHint();
                      onClientSignup();
                    }}
                  >
                    {en ? 'Request a parcel quote' : 'Demander un devis colis'}
                    <ArrowRight size={18} strokeWidth={1.5} className="ml-2" aria-hidden="true" />
                  </Button>
                  <Link
                    to={href('/transport-colis-europe-tunisie')}
                    className="focus-ring rounded-md text-center text-sm font-medium text-gray-700 hover:text-gray-900 underline-offset-4 hover:underline"
                  >
                    {en ? 'Learn more' : 'En savoir plus'}
                  </Link>
                </div>
                <p className="mt-4 text-sm text-gray-600">
                  {en ? 'A free account is needed to submit a request.' : 'Un compte gratuit est nécessaire pour déposer une demande.'}{' '}
                  <button
                    type="button"
                    onClick={onClientLogin}
                    className="focus-ring rounded-md underline underline-offset-2 hover:text-gray-900"
                  >
                    {en ? 'I already have an account' : "J'ai déjà un compte"}
                  </button>
                </p>
              </div>
            </div>
          </div>
        </RevealSection>

        {/* FAQ */}
        <RevealSection id="faq-vtc-accueil" className="py-20 md:py-24 bg-surface-band">
          <div className="page-container">
            <div className="grid gap-10 lg:grid-cols-[5fr_7fr] lg:gap-20">
              <div>
                <h2 className="page-heading mb-4 [text-wrap:balance]">
                  {en ? 'Private driver & airport transfer' : 'VTC, chauffeur privé & transfert aéroport'}
                </h2>
                <Link
                  to={href('/vtc-tunisie')}
                  className="focus-ring rounded-md text-sm font-medium text-gray-900 underline underline-offset-4 hover:text-gray-600"
                >
                  {en ? 'See the full Tunisia private-driver page' : 'Voir la page complète VTC Tunisie'}
                </Link>
              </div>
              <div className="space-y-3">
                {faqItems.slice(0, 4).map((item) => (
                  <details key={item.question} className="group rounded-card border border-surface-border bg-white px-5 py-4">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-medium text-gray-900 [&::-webkit-details-marker]:hidden">
                      {item.question}
                      <ChevronDown size={18} strokeWidth={1.5} className="flex-shrink-0 text-gray-500 transition-transform group-open:rotate-180" aria-hidden="true" />
                    </summary>
                    <p className="mt-3 text-sm text-gray-600 leading-relaxed">{item.answer}</p>
                  </details>
                ))}
              </div>
            </div>
          </div>
        </RevealSection>

        {/* Chauffeurs et transporteurs : le seul bloc de la page qui s'adresse aux professionnels */}
        <RevealSection id="chauffeurs" className="scroll-mt-20 py-20 md:py-24">
          <div className="page-container">
            <div className="rounded-[20px] bg-brand p-6 sm:p-12 text-white">
              <div className="max-w-2xl mb-10">
                <p className="text-sm font-medium text-white/60 mb-3">
                  {en ? 'Drivers and carriers' : 'Chauffeurs et transporteurs'}
                </p>
                <h2 className="page-heading !text-white mb-4 [text-wrap:balance]">
                  {en ? 'Drive when you want and earn on your own terms' : 'Conduisez quand vous voulez, générez des revenus sur mesure'}
                </h2>
                <p className="text-lg text-white/75">
                  {en
                    ? 'Offer rides in Tunisia or parcel transport between Europe and Tunisia.'
                    : "Proposez vos courses en Tunisie ou vos services de transport de colis entre l'Europe et la Tunisie."}
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                {[
                  {
                    icon: Car,
                    title: en ? 'Private-hire driver' : 'Chauffeur VTC',
                    items: en
                      ? ['Receive requests that match your availability', 'Manage your vehicles and schedule', 'Grow your private-hire activity']
                      : ['Recevez des demandes selon vos disponibilités', 'Gérez vos véhicules et votre planning', 'Développez votre activité VTC'],
                    cta: en ? 'Become a driver' : 'Devenir chauffeur',
                    onClick: onGetStarted,
                  },
                  {
                    icon: Truck,
                    title: en ? 'Local delivery carrier' : 'Transporteur local',
                    items: en
                      ? ['Receive delivery requests from your governorates', 'Propose your price in TND', 'Exchange contact details after acceptance']
                      : ['Recevez les demandes de livraison de vos gouvernorats', 'Proposez votre tarif en TND', 'Échangez vos coordonnées après acceptation'],
                    cta: en ? 'Become a local carrier' : 'Devenir transporteur local',
                    onClick: () => navigate(href('/signup?activity=transporteur_local')),
                  },
                  {
                    icon: Package,
                    title: en ? 'International parcel carrier' : 'Transporteur international',
                    items: en
                      ? ['Receive requests that match your routes', 'Propose your price in EUR or TND', 'Exchange contact details after acceptance']
                      : ['Recevez les demandes correspondant à vos trajets', 'Proposez votre tarif en EUR ou TND', 'Échangez vos coordonnées après acceptation'],
                    cta: en ? 'Become a carrier' : 'Devenir transporteur',
                    onClick: () => navigate(href('/signup?activity=transporteur_international')),
                  },
                ].map(({ icon: Icon, title, items, cta, onClick }) => (
                  <div key={title} className="flex flex-col rounded-card border border-white/10 bg-white/5 p-6">
                    <h3 className="flex items-center gap-3 text-lg font-medium mb-4">
                      <Icon size={18} strokeWidth={1.5} className="text-white/60" aria-hidden="true" />
                      {title}
                    </h3>
                    <ul className="divide-y divide-white/10 text-sm text-white/75 mb-6 flex-1">
                      {items.map((item) => (
                        <li key={item} className="py-3 first:pt-0">
                          {item}
                        </li>
                      ))}
                    </ul>
                    <Button
                      size="md"
                      onClick={onClick}
                      className="bg-white text-brand hover:bg-gray-100 focus-visible:ring-white focus-visible:ring-offset-brand sm:self-start"
                    >
                      {cta}
                    </Button>
                  </div>
                ))}
              </div>

              <p className="mt-8 text-sm text-white/60">
                {en ? 'Already registered?' : 'Déjà inscrit ?'}{' '}
                <button
                  type="button"
                  onClick={onDriverLogin}
                  className="rounded-md font-medium text-white underline underline-offset-4 hover:text-white/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  {en ? 'Driver login' : 'Connexion chauffeur'}
                </button>
              </p>
            </div>
          </div>
        </RevealSection>
      </main>
      <Footer />
    </div>
  );
};
