import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Car,
  ArrowRight,
  CheckCircle,
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
import { HomeRoadAnimation } from './HomeRoadAnimation';
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
import {
  DeliveryHeroIllustration,
  GroupTransportIllustration,
  InternationalParcelIllustration,
} from './ui/ParcelIllustrations';
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
      className="h-full w-full object-cover object-center"
      onError={() => setFailed(true)}
    />
  );
}

const serviceOffers = [
  {
    icon: Car,
    title: 'Course VTC',
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
    <div className="min-h-screen bg-white">
      <AppDownloadModal isOpen={appDownloadPrompt.isOpen} onClose={appDownloadPrompt.close} />
      <main>
        {/* Hero — style Uber : le formulaire de réservation est l'élément principal */}
        <section className="bg-white">
          <div className="page-container py-10 sm:py-14 lg:py-24">
            {/* Trois blocs pour l'ordre mobile (texte, formulaire, réassurance) ; sur grand écran
                le formulaire occupe la colonne de droite, aligné en haut avec le titre. */}
            <div className="grid gap-8 lg:grid-cols-2 lg:grid-rows-[auto_1fr] lg:gap-x-16 lg:gap-y-8">
              <div className="lg:col-start-1 lg:row-start-1">
                <h1 className="text-display-md sm:text-display-lg xl:text-display-xl text-gray-900 mb-5">
                  {en ? 'Go wherever you want with TuniDrive' : 'Allez où vous voulez avec TuniDrive'}
                </h1>
                <p className="text-body-lg text-ink-muted max-w-xl">
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
                <p className="mt-6 text-body-sm text-ink-muted">
                  {en ? 'Are you a driver?' : 'Vous êtes chauffeur ?'}{' '}
                  <button
                    type="button"
                    onClick={onGetStarted}
                    className="focus-ring rounded-md font-semibold text-gray-900 underline underline-offset-4 hover:text-ink-muted"
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

        

        <HomeRoadAnimation />

        {/* Services */}
        <RevealSection className="py-16 bg-surface-muted">
          <div className="page-container">
            <div className="text-center mb-10 max-w-3xl mx-auto">
              <h2 className="page-heading">
                {en ? 'See what you can do with TuniDrive' : 'Découvrez ce que vous pouvez faire avec TuniDrive'}
              </h2>
            </div>
            {/* Grille de 4 colonnes (sm) / 6 colonnes (lg), chaque carte occupe 2 colonnes : la dernière
                rangée incomplète est centrée et toutes les cartes ont la même hauteur. */}
            <div className="grid auto-rows-fr sm:grid-cols-4 lg:grid-cols-6 gap-4">
              {serviceOffers.map(({ icon: Icon, title, titleEn, description, descriptionEn, href: offerHref, cta, ctaEn }, index) => {
                const lastIsAlone = serviceOffers.length % 2 === 1 && index === serviceOffers.length - 1;
                const lastRowHasTwo = serviceOffers.length % 3 === 2 && index === serviceOffers.length - 2;
                const position = [
                  lastIsAlone ? 'sm:col-start-2 lg:col-start-auto' : '',
                  lastRowHasTwo ? 'lg:col-start-2' : '',
                ].join(' ');
                const content = (
                  <>
                    <div className="w-10 h-10 rounded-full bg-gray-900 text-white flex items-center justify-center mb-4">
                      <Icon size={20} aria-hidden="true" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{en ? titleEn : title}</h3>
                    <p className="text-sm text-gray-600 leading-relaxed flex-1">{en ? descriptionEn : description}</p>
                    <span className="mt-4 text-sm font-semibold text-gray-900 group-hover:underline">
                      {en ? ctaEn : cta} →
                    </span>
                  </>
                );
                const cardClass = `focus-ring uber-card p-6 flex flex-col h-full group text-left sm:col-span-2 ${position}`;
                // Sans lien : la carte ramène au formulaire de réservation en haut de page.
                return offerHref ? (
                  <Link key={title} to={href(offerHref)} className={cardClass}>
                    {content}
                  </Link>
                ) : (
                  <button key={title} type="button" onClick={focusHomeBookingForm} className={cardClass}>
                    {content}
                  </button>
                );
              })}
            </div>
          </div>
        </RevealSection>

        {/* Transport VTC : étapes de réservation + véhicules */}
        <RevealSection id="transport-vtc" className="scroll-mt-20 py-16 md:py-20 bg-white">
          <div className="page-container">
            <div className="text-center max-w-3xl mx-auto mb-10">
              <h2 className="page-heading mb-4">
                {en ? 'Passenger transport & private hire in Tunisia' : 'Transport de personnes & VTC en Tunisie'}
              </h2>
              <p className="page-subheading">
                {en
                  ? 'Book a private driver for trips in Tunisia. Sedan, taxi, van, minibus or luxury vehicle.'
                  : 'Réservez un chauffeur privé ou un VTC pour vos déplacements en Tunisie. Berline, taxi, van, minibus ou véhicule de luxe.'}
              </p>
            </div>

            <ol className="grid md:grid-cols-3 gap-4 max-w-5xl mx-auto mb-12">
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
              ).map(({ title, text }, index) => (
                <li key={title} className="rounded-xl bg-surface-muted p-6">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-900 text-sm font-semibold text-white mb-4">
                    {index + 1}
                  </span>
                  <h3 className="text-base font-semibold text-gray-900 mb-2">{title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{text}</p>
                </li>
              ))}
            </ol>

            {/* Véhicules : défilement horizontal au doigt sur mobile, grille à partir de md */}
            <div
              className="flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide -mx-4 px-4 py-1 scroll-px-4 sm:-mx-6 sm:px-6 sm:scroll-px-6 md:mx-0 md:px-0 md:grid md:grid-cols-2 md:gap-6 md:overflow-visible lg:grid-cols-5"
              role="list"
              aria-label={en ? 'Available vehicles' : 'Véhicules disponibles'}
            >
              {[
                { Art: TaxiIllustration, photo: '/vehicles/taxi-jaune.webp', title: en ? 'Yellow taxi' : 'Taxi', desc: en ? 'Quick city rides and airport runs.' : 'Courses rapides en ville et vers l’aéroport.', cap: en ? 'Up to 4 passengers' : "Jusqu'à 4 passagers" },
                { Art: BlackSedanIllustration, photo: '/vehicles/berline-noire.webp', title: en ? 'Black sedan' : 'Berline', desc: en ? 'Comfortable private-hire sedan.' : 'Berline confortable avec chauffeur privé.', cap: en ? 'Up to 4 passengers' : "Jusqu'à 4 passagers" },
                { Art: GreyVanIllustration, photo: '/vehicles/van-gris.webp', title: en ? 'Grey van' : 'Van', desc: en ? 'Group transport for up to 8 people.' : "Transport de groupe jusqu'à 8 personnes.", cap: en ? 'Up to 8 passengers' : "Jusqu'à 8 passagers" },
                { Art: WhiteBusIllustration, photo: '/vehicles/bus-blanc.webp', title: en ? 'White coach' : 'Bus', desc: en ? 'Long-distance trips and large groups.' : 'Trajets longue distance et grands groupes.', cap: en ? 'Up to 50 passengers' : "Jusqu'à 50 passagers" },
                { Art: MercedesLuxuryIllustration, photo: '/vehicles/mercedes-luxe.webp', title: en ? 'Mercedes luxury' : 'Premium', desc: en ? 'Premium service for special occasions.' : 'Service premium pour occasions spéciales.', cap: en ? 'Premium service' : 'Service premium' },
              ].map(({ Art, photo, title, desc, cap }) => (
                <div
                  key={title}
                  role="listitem"
                  className="vehicle-card uber-card overflow-hidden snap-start shrink-0 w-[78%] sm:w-[46%] md:w-auto"
                >
                  <div className="relative aspect-[3/2] overflow-hidden bg-gradient-to-b from-gray-100 to-gray-300">
                    <div className="vehicle-art h-full"><VehicleArt photo={photo} alt={title} Fallback={Art} /></div>
                  </div>
                  <div className="p-5">
                    <h3 className="text-base font-semibold text-gray-900 mb-2">{title}</h3>
                    <p className="text-sm text-gray-600 mb-3 leading-relaxed">{desc}</p>
                    <span className="text-xs text-gray-500">{cap}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="text-center mt-10">
              <Button size="lg" onClick={focusHomeBookingForm} className="rounded-full">
                {en ? 'See the price of my trip' : 'Voir le prix de mon trajet'}
                <ArrowRight size={20} className="ml-2" aria-hidden="true" />
              </Button>
            </div>
          </div>
        </RevealSection>

        {/* Groupes */}
        <RevealSection id="groupes-tunisie" className="scroll-mt-20 py-16 md:py-20 bg-surface-muted">
          <div className="page-container">
            <div className="max-w-5xl mx-auto grid lg:grid-cols-2 gap-10 items-center">
              <div>
                <p className="text-sm font-semibold text-brand mb-3">
                  {en ? 'From abroad' : "Depuis l'étranger"}
                </p>
                <h2 className="page-heading mb-4">{en ? 'Transport for groups' : 'Transport de groupes'}</h2>
                <p className="page-subheading mb-6">
                  {en
                    ? 'Families, agencies and groups of friends landing for a stay: TuniDrive organizes their movements on the ground — airport welcome, hotel transfers, trips between cities and the return.'
                    : "Familles, agences et groupes d'amis qui arrivent pour un séjour : TuniDrive organise leurs déplacements sur place — accueil à l'aéroport, transferts hôtel, trajets entre villes et retour."}
                </p>
                <Link
                  to={href('/transport-groupes-tunisie')}
                  className="focus-ring rounded-md inline-flex items-center gap-2 text-sm font-semibold text-gray-900 hover:underline"
                >
                  {en ? 'See group transport' : 'Voir le transport de groupes'}
                  <ArrowRight size={16} aria-hidden="true" />
                </Link>
              </div>
              <div className="rounded-xl border border-surface-border bg-white overflow-hidden">
              <GroupTransportIllustration
                label={
                  en
                    ? 'A group is picked up at the airport and driven by bus to its hotel'
                    : "Un groupe est accueilli à l'aéroport puis conduit en bus jusqu'à son hôtel"
                }
              />
              <ul className="p-8 space-y-4">
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
                  <li key={item} className="flex gap-3 text-sm text-gray-700">
                    <Users size={18} className="text-gray-900 flex-shrink-0 mt-0.5" aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              </div>
            </div>
          </div>
        </RevealSection>

        <ReviewsCarousel />

        {/* Livraison locale de colis (Tunisie) */}
        <RevealSection id="livraison-colis-tunisie" className="scroll-mt-20 py-16 md:py-20 bg-surface-muted">
            <div className="page-container">
            <div className="max-w-5xl mx-auto grid lg:grid-cols-2 gap-10 items-center">
              <div>
                <p className="inline-flex items-center gap-2 text-sm font-semibold text-brand mb-3">
                  <Truck size={16} aria-hidden="true" />
                  {en ? 'Within Tunisia' : 'En Tunisie'}
                </p>
                <h2 className="page-heading mb-4">
                  {en ? 'Parcel and goods delivery in Tunisia' : 'Livraison de colis et marchandises en Tunisie'}
                </h2>
                <p className="page-subheading mb-6">
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
                    className="rounded-full"
                  >
                    {en ? 'Request a delivery quote' : 'Demander un devis livraison'}
                    <ArrowRight size={20} className="ml-2" aria-hidden="true" />
                  </Button>
                  <Link
                    to={href('/livraison-colis-tunisie')}
                    className="focus-ring rounded-md text-center text-sm font-semibold text-gray-700 hover:text-gray-900 underline-offset-4 hover:underline"
                  >
                    {en ? 'Learn more' : 'En savoir plus'}
                  </Link>
                </div>
              </div>
              <div className="rounded-xl border border-surface-border bg-surface-muted overflow-hidden">
              <DeliveryHeroIllustration
                label={
                  en
                    ? 'A delivery truck carrying parcels across Tunisia'
                    : 'Une camionnette transporte des colis en Tunisie'
                }
              />
              <ol className="p-8 space-y-4">
                {(en
                  ? ['Enter the pickup and delivery addresses in Tunisia', 'Receive offers from local carriers in your area', 'Compare and choose the best offer online']
                  : ["Indiquez l'adresse de départ et de livraison en Tunisie", 'Recevez les offres des transporteurs locaux de votre zone', 'Comparez et choisissez la meilleure offre en ligne']
                ).map((item, index) => (
                  <li key={item} className="flex gap-3 text-sm text-gray-700">
                    <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-gray-900 text-xs font-semibold text-white">
                      {index + 1}
                    </span>
                    <span className="pt-0.5">{item}</span>
                  </li>
                ))}
              </ol>
              </div>
            </div>
          </div>
        </RevealSection>

        {/* Transport colis (côté expéditeur) */}
        <RevealSection id="transport-colis" className="scroll-mt-20 py-16 md:py-20 bg-white">
          <div className="page-container">
            <div className="max-w-5xl mx-auto grid lg:grid-cols-2 gap-10 items-center">
              <div className="order-2 lg:order-1 rounded-xl border border-surface-border bg-white overflow-hidden">
              <InternationalParcelIllustration
                label={
                  en
                    ? 'Parcels travel by plane from Europe to Tunisia'
                    : "Des colis voyagent en avion de l'Europe vers la Tunisie"
                }
              />
              <ol className="p-8 space-y-4">
                {(en
                  ? ['Describe your shipment (addresses, date, photos)', 'Receive several price offers from carriers', 'Compare and choose the best offer online']
                  : ['Décrivez votre envoi (adresses, date, photos)', 'Recevez plusieurs propositions de prix des transporteurs', 'Comparez et choisissez la meilleure offre en ligne']
                ).map((item, index) => (
                  <li key={item} className="flex gap-3 text-sm text-gray-700">
                    <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-gray-900 text-xs font-semibold text-white">
                      {index + 1}
                    </span>
                    <span className="pt-0.5">{item}</span>
                  </li>
                ))}
              </ol>
              </div>
              <div className="order-1 lg:order-2">
                <p className="inline-flex items-center gap-2 text-sm font-semibold text-brand mb-3">
                  <Package size={16} aria-hidden="true" />
                  Europe ↔ {en ? 'Tunisia' : 'Tunisie'}
                </p>
                <h2 className="page-heading mb-4">{en ? 'Parcel and goods transport' : 'Transport de colis et marchandises'}</h2>
                <p className="page-subheading mb-6">
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
                    className="rounded-full"
                  >
                    {en ? 'Request a parcel quote' : 'Demander un devis colis'}
                    <ArrowRight size={20} className="ml-2" aria-hidden="true" />
                  </Button>
                  <Link
                    to={href('/transport-colis-europe-tunisie')}
                    className="focus-ring rounded-md text-center text-sm font-semibold text-gray-700 hover:text-gray-900 underline-offset-4 hover:underline"
                  >
                    {en ? 'Learn more' : 'En savoir plus'}
                  </Link>
                </div>
                <p className="mt-3 text-sm text-ink-muted">
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

        {/* App mobile */}
        <RevealSection className="py-16 bg-surface-muted">
          <div className="page-container">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="page-heading mb-4">{en ? 'It is easier in the app' : "C'est plus simple dans l'application"}</h2>
              <p className="page-subheading mb-8">
                {en
                  ? 'Book rides, request parcel quotes and manage every trip from the TuniDrive app.'
                  : "Réservez vos courses, demandez des devis colis et gérez tous vos transports depuis l'app TuniDrive."}
              </p>
              <AppStoreBadges className="justify-center" />
            </div>
          </div>
        </RevealSection>

        {/* FAQ */}
        <RevealSection id="faq-vtc-accueil" className="scroll-mt-20 py-16 md:py-20 bg-white">
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
                <details key={item.question} className="rounded-xl border border-surface-border bg-white p-4">
                  <summary className="font-medium text-gray-900 cursor-pointer text-sm">{item.question}</summary>
                  <p className="mt-2 text-sm text-gray-600 leading-relaxed">{item.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </RevealSection>

        {/* Chauffeurs et transporteurs : le seul bloc de la page qui s'adresse aux professionnels */}
        <RevealSection id="chauffeurs" className="scroll-mt-20 py-16 md:py-20 bg-surface-muted">
          <div className="page-container">
            <div className="max-w-6xl mx-auto bg-black rounded-2xl p-6 sm:p-12 text-white">
              <div className="max-w-2xl mb-8">
                <p className="text-sm font-semibold text-gray-400 mb-3">
                  {en ? 'Drivers and carriers' : 'Chauffeurs et transporteurs'}
                </p>
                <h2 className="text-3xl sm:text-4xl font-semibold mb-4 tracking-tight">
                  {en ? 'Drive when you want and earn on your own terms' : 'Conduisez quand vous voulez, générez des revenus sur mesure'}
                </h2>
                <p className="text-lg text-gray-300">
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
                    icon: Truck,
                    title: en ? 'International parcel carrier' : 'Transporteur international',
                    items: en
                      ? ['Receive requests that match your routes', 'Propose your price in EUR or TND', 'Exchange contact details after acceptance']
                      : ['Recevez les demandes correspondant à vos trajets', 'Proposez votre tarif en EUR ou TND', 'Échangez vos coordonnées après acceptation'],
                    cta: en ? 'Become a carrier' : 'Devenir transporteur',
                    onClick: () => navigate(href('/signup?activity=transporteur_international')),
                  },
                ].map(({ icon: Icon, title, items, cta, onClick }) => (
                  <div key={title} className="flex flex-col rounded-xl border border-white/15 bg-white/5 p-6">
                    <h3 className="flex items-center gap-3 text-lg font-semibold mb-4">
                      <Icon size={20} aria-hidden="true" />
                      {title}
                    </h3>
                    <ul className="space-y-2 text-sm text-gray-300 mb-6 flex-1">
                      {items.map((item) => (
                        <li key={item} className="flex items-start gap-2">
                          <CheckCircle size={16} className="text-white mt-0.5 flex-shrink-0" aria-hidden="true" />
                          {item}
                        </li>
                      ))}
                    </ul>
                    <Button
                      size="md"
                      onClick={onClick}
                      className="rounded-full bg-white text-gray-900 hover:bg-gray-200 focus-visible:ring-white focus-visible:ring-offset-black sm:self-start"
                    >
                      {cta}
                    </Button>
                  </div>
                ))}
              </div>

              <p className="mt-6 text-sm text-gray-400">
                {en ? 'Already registered?' : 'Déjà inscrit ?'}{' '}
                <button
                  type="button"
                  onClick={onDriverLogin}
                  className="rounded-md font-semibold text-white underline underline-offset-4 hover:text-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
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
