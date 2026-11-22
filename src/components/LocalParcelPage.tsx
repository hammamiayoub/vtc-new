import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle,
  ChevronDown,
  MapPin,
  Package,
  Truck,
} from 'lucide-react';
import { Button } from './ui/Button';
import {
  ApplianceIcon,
  BoxesIcon,
  DeliveryHeroIllustration,
  FurnitureIcon,
  ShopIcon,
  StepAddressIllustration,
  StepConfirmIllustration,
  StepOffersIllustration,
} from './ui/ParcelIllustrations';
import { Footer } from './Footer';
import { RevealSection } from './ui/RevealSection';
import { localParcelFaqItems, localParcelFaqItemsEn } from '../data/localParcelFaq';
import { setFaqJsonLd } from '../utils/seo';
import { TUNISIA_GOVERNORATES } from '../utils/tunisiaGovernorates';
import { setParcelScopeHint } from '../utils/parcelScopeHint';
import { useLocale } from '../i18n/locale';

const STEPS = [
  {
    title: 'Décrivez votre livraison',
    description:
      "Indiquez l'adresse de départ et l'adresse de livraison en Tunisie, la date souhaitée, le contenu de vos colis, et ajoutez des photos si besoin.",
  },
  {
    title: 'Recevez des offres en TND',
    description:
      'Les transporteurs locaux de la zone de départ lisent votre demande et vous proposent leur prix et leur délai.',
  },
  {
    title: 'Choisissez la meilleure offre',
    description:
      "Comparez, validez en ligne, puis échangez vos coordonnées avec le transporteur retenu pour organiser l'enlèvement.",
  },
];

const STEPS_EN = [
  {
    title: 'Describe your delivery',
    description:
      'Enter the pickup and delivery addresses in Tunisia, the date you want and what is in the parcels. Add photos if needed.',
  },
  {
    title: 'Receive offers in TND',
    description:
      'Local carriers covering the pickup area read your request and send their price and estimated time.',
  },
  {
    title: 'Pick the best offer',
    description:
      'Compare, confirm online, then exchange contact details with the chosen carrier to arrange the pickup.',
  },
];

const STEP_ILLUSTRATIONS = [StepAddressIllustration, StepOffersIllustration, StepConfirmIllustration];

const GOODS = [
  {
    Icon: BoxesIcon,
    title: 'Cartons et effets personnels',
    titleEn: 'Boxes and personal belongings',
    text: 'Déménagement, cadeaux, affaires à envoyer à un proche.',
    textEn: 'Moving, gifts, belongings to send to a relative.',
  },
  {
    Icon: ApplianceIcon,
    title: 'Électroménager',
    titleEn: 'Appliances',
    text: 'Réfrigérateur, lave-linge, four : indiquez le poids et ajoutez une photo.',
    textEn: 'Fridge, washing machine, oven: state the weight and add a photo.',
  },
  {
    Icon: FurnitureIcon,
    title: 'Meubles',
    titleEn: 'Furniture',
    text: 'Canapé, armoire, lit : précisez les dimensions et les étages.',
    textEn: 'Sofa, wardrobe, bed: give the dimensions and floors.',
  },
  {
    Icon: ShopIcon,
    title: 'Marchandises de commerçants',
    titleEn: "Shop goods",
    text: 'Réapprovisionnement de boutique ou livraison à vos clients.',
    textEn: 'Restocking a shop or delivering to your customers.',
  },
];

const VEHICLES = [
  {
    photo: '/utilitaire.webp',
    title: 'Camion utilitaire',
    titleEn: 'Box truck',
    text: 'Pour les meubles, l’électroménager et les marchandises volumineuses.',
    textEn: 'For furniture, appliances and bulky goods.',
  },
];

export const LocalParcelPage: React.FC = () => {
  const navigate = useNavigate();
  const { locale, href } = useLocale();
  const en = locale === 'en';
  const faq = en ? localParcelFaqItemsEn : localParcelFaqItems;
  const steps = en ? STEPS_EN : STEPS;
  const [openFaqId, setOpenFaqId] = useState<string | null>(faq[0]?.id ?? null);

  useEffect(() => {
    setFaqJsonLd(faq.map(({ question, answer }) => ({ question, answer })));
    return () => {
      document.querySelector('script[data-seo-jsonld="faq-page"]')?.remove();
    };
  }, [faq]);

  /** Mémorise « local » pour présélectionner le bon formulaire après connexion / inscription. */
  const goClient = (path: '/client-signup' | '/client-login') => {
    setParcelScopeHint('local');
    navigate(href(path));
  };

  const goCarrier = () => navigate(href('/signup?activity=transporteur_local'));

  return (
    <div className="min-h-screen bg-white">
      <section className="py-16 md:py-24 bg-gray-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-800 rounded-full text-sm font-medium mb-6">
              <MapPin size={16} aria-hidden="true" />
              {en ? 'Within Tunisia' : 'En Tunisie'}
            </span>
            <h1 className="text-4xl md:text-6xl font-semibold text-gray-900 mb-6 tracking-tight leading-tight">
              {en
                ? 'Parcel and goods delivery in Tunisia'
                : 'Livraison de colis et marchandises en Tunisie'}
            </h1>
            <p className="text-xl text-gray-600 mb-4 leading-relaxed">
              {en
                ? 'Describe your delivery, receive prices from local carriers in TND and choose the best offer. Free request, no obligation.'
                : "Décrivez votre livraison, recevez les prix de transporteurs locaux en TND et choisissez la meilleure offre. Demande gratuite et sans engagement."}
            </p>
            <p className="text-base text-gray-500 mb-10 max-w-2xl mx-auto">
              {en
                ? 'Appliances, furniture, boxes or goods for your shop: from one city to another, or within the same city.'
                : "Électroménager, meubles, cartons ou marchandises pour votre commerce : d'une ville à l'autre, ou dans la même ville."}
            </p>
            <div className="flex flex-col sm:flex-row flex-wrap gap-4 justify-center">
              <Button
                size="lg"
                onClick={() => goClient('/client-signup')}
                className="text-lg px-8 py-4 bg-black hover:bg-gray-800 text-white rounded-lg font-medium inline-flex items-center justify-center gap-2"
              >
                {en ? 'Request a free quote' : 'Demander un devis gratuit'}
                <ArrowRight size={20} aria-hidden="true" />
              </Button>
              <Button
                size="lg"
                onClick={() => goClient('/client-login')}
                className="text-lg px-8 py-4 bg-white border-2 border-gray-300 text-gray-900 hover:bg-gray-50 rounded-lg font-medium"
              >
                {en ? 'I already have an account' : "J'ai déjà un compte"}
              </Button>
              <Button
                size="lg"
                onClick={goCarrier}
                className="text-lg px-8 py-4 bg-white border-2 border-gray-300 text-gray-900 hover:bg-gray-50 rounded-lg font-medium"
              >
                {en ? 'Become a local carrier' : 'Devenir transporteur local'}
              </Button>
            </div>
          </div>
          <div className="max-w-3xl mx-auto mt-12 overflow-hidden rounded-2xl border border-gray-200 shadow-sm">
            <DeliveryHeroIllustration
              label={
                en
                  ? 'A delivery truck carrying parcels from a pickup point to a delivery point'
                  : "Une camionnette transporte des colis d'un point de départ à un point de livraison"
              }
            />
          </div>
        </div>
      </section>

      <RevealSection className="py-16 md:py-20" aria-labelledby="local-parcel-how-heading">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 id="local-parcel-how-heading" className="text-3xl md:text-4xl font-semibold text-gray-900 mb-4">
              {en ? 'How it works' : 'Comment ça marche ?'}
            </h2>
            <p className="text-lg text-gray-600">
              {en
                ? 'Three simple steps, the same quote system as our international service.'
                : 'Trois étapes simples, avec le même système de devis que notre service international.'}
            </p>
          </div>
          <ol className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto list-none">
            {steps.map((step, index) => {
              const Illustration = STEP_ILLUSTRATIONS[index];
              return (
              <li key={step.title} className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200">
                <div className="h-28 mb-6 overflow-hidden rounded-xl border border-gray-100">
                  <Illustration />
                </div>
                <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-black text-white font-semibold mb-4">
                  {index + 1}
                </span>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">{step.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{step.description}</p>
              </li>
              );
            })}
          </ol>
        </div>
      </RevealSection>

      <RevealSection className="py-16 md:py-20 bg-gray-50" aria-labelledby="local-parcel-goods-heading">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 id="local-parcel-goods-heading" className="text-3xl md:text-4xl font-semibold text-gray-900 mb-4">
              {en ? 'What can you have delivered?' : 'Que pouvez-vous faire livrer ?'}
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              {en
                ? 'From a single box to a full piece of furniture, describe your shipment and carriers will quote it.'
                : "D'un simple carton à un meuble complet, décrivez votre envoi et les transporteurs vous font une offre."}
            </p>
          </div>
          <ul className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto list-none">
            {GOODS.map(({ Icon, title, titleEn, text, textEn }) => (
              <li key={title} className="bg-white rounded-2xl p-6 border border-gray-200">
                <div className="w-14 h-14 p-3 mb-4 rounded-xl bg-gray-100">
                  <Icon />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{en ? titleEn : title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{en ? textEn : text}</p>
              </li>
            ))}
          </ul>
        </div>
      </RevealSection>

      <RevealSection className="py-16 md:py-20" aria-labelledby="local-parcel-vehicles-heading">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 id="local-parcel-vehicles-heading" className="text-3xl md:text-4xl font-semibold text-gray-900 mb-4">
              {en ? 'A vehicle suited to each shipment' : 'Un véhicule adapté à chaque envoi'}
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              {en
                ? 'Depending on the volume you describe, carriers offer the vehicle that fits.'
                : 'Selon le volume que vous décrivez, les transporteurs proposent le véhicule qui convient.'}
            </p>
          </div>
          <ul className="grid gap-6 max-w-xl mx-auto list-none">
            {VEHICLES.map(({ photo, title, titleEn, text, textEn }) => (
              <li key={photo} className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
                <div className="aspect-[3/2] bg-gray-100">
                  <img
                    src={photo}
                    alt={en ? titleEn : title}
                    loading="lazy"
                    decoding="async"
                    width={800}
                    height={533}
                    className="h-full w-full object-cover object-center"
                  />
                </div>
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">{en ? titleEn : title}</h3>
                  <p className="text-sm text-gray-600">{en ? textEn : text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </RevealSection>

      <RevealSection className="py-16 md:py-20 bg-gray-50" aria-labelledby="local-parcel-zones-heading">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 id="local-parcel-zones-heading" className="text-3xl md:text-4xl font-semibold text-gray-900 mb-4">
              {en ? 'Across all of Tunisia' : 'Partout en Tunisie'}
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              {en
                ? 'Your request goes to local carriers who cover the governorate of your pickup address.'
                : "Votre demande est envoyée aux transporteurs locaux qui couvrent le gouvernorat de votre adresse de départ."}
            </p>
          </div>
          <ul className="flex flex-wrap justify-center gap-3 max-w-4xl mx-auto">
            {TUNISIA_GOVERNORATES.map((g) => (
              <li key={g.code} className="px-4 py-2 bg-white border border-gray-200 text-gray-800 rounded-full text-sm font-medium">
                {en ? g.en : g.fr}
              </li>
            ))}
          </ul>
        </div>
      </RevealSection>

      <RevealSection className="py-16 md:py-20" aria-labelledby="local-parcel-audience-heading">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            <article className="rounded-2xl p-8 border border-gray-200">
              <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mb-4">
                <Package className="text-gray-700" size={24} aria-hidden="true" />
              </div>
              <h2 id="local-parcel-audience-heading" className="text-xl font-semibold text-gray-900 mb-3">
                {en ? 'For individuals and shops' : 'Pour les particuliers et les commerçants'}
              </h2>
              <ul className="space-y-2 text-gray-600 text-sm">
                {(en
                  ? ['Appliances, furniture and bulky items', 'Boxes and personal belongings', 'Goods delivered to your customers', 'Compare several prices in TND']
                  : ['Électroménager, meubles et objets volumineux', 'Cartons et effets personnels', 'Marchandises à livrer à vos clients', 'Comparaison de plusieurs prix en TND']
                ).map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <CheckCircle size={16} className="text-success-500 mt-0.5 flex-shrink-0" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
              <Button
                size="md"
                onClick={() => goClient('/client-login')}
                className="mt-6 bg-black hover:bg-gray-800 text-white"
              >
                {en ? 'Request a free quote' : 'Demander un devis gratuit'}
              </Button>
            </article>
            <article className="rounded-2xl p-8 border border-gray-200">
              <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mb-4">
                <Truck className="text-gray-700" size={24} aria-hidden="true" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">
                {en ? 'For local carriers' : 'Pour les transporteurs locaux'}
              </h2>
              <ul className="space-y-2 text-gray-600 text-sm">
                {(en
                  ? ['Requests from the governorates you choose', 'Your own price in TND', 'Pick the deliveries that suit your vehicle', 'A valid licence and the required authorisations are mandatory']
                  : ['Demandes des gouvernorats que vous choisissez', 'Votre tarif libre en TND', 'Choisissez les livraisons adaptées à votre véhicule', 'Permis valide et autorisations requises obligatoires']
                ).map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <CheckCircle size={16} className="text-success-500 mt-0.5 flex-shrink-0" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
              <Button size="md" onClick={goCarrier} className="mt-6 bg-black hover:bg-gray-800 text-white">
                {en ? 'Become a local carrier' : 'Devenir transporteur local'}
              </Button>
            </article>
          </div>
          <p className="mt-8 text-center text-sm text-gray-600">
            {en ? 'Shipping between Europe and Tunisia? ' : "Un envoi entre l'Europe et la Tunisie ? "}
            <Link
              to={href('/transport-colis-europe-tunisie')}
              className="font-semibold text-gray-900 underline underline-offset-4 hover:text-gray-600"
            >
              {en ? 'See international parcel transport' : 'Voir le transport international de colis'}
            </Link>
          </p>
        </div>
      </RevealSection>

      <RevealSection className="py-16 md:py-20 bg-gray-50" aria-labelledby="local-parcel-faq-heading">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 id="local-parcel-faq-heading" className="text-3xl md:text-4xl font-semibold text-gray-900 mb-4">
              {en ? 'Frequently asked questions — local delivery' : 'Questions fréquentes — livraison locale'}
            </h2>
            <p className="text-gray-600">
              {en ? 'Quotes, areas and what TuniDrive does.' : 'Tout savoir sur les devis, les zones et le rôle de TuniDrive.'}
            </p>
          </div>
          <div className="space-y-3">
            {faq.map((item) => {
              const isOpen = openFaqId === item.id;
              return (
                <div key={item.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <button
                    type="button"
                    className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left font-medium text-gray-900 hover:bg-gray-50"
                    aria-expanded={isOpen}
                    onClick={() => setOpenFaqId(isOpen ? null : item.id)}
                  >
                    {item.question}
                    <ChevronDown
                      size={20}
                      className={`flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                      aria-hidden="true"
                    />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-4 text-gray-600 text-sm leading-relaxed whitespace-pre-line">
                      {item.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </RevealSection>

      <RevealSection className="py-16 bg-black text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-semibold mb-4">
            {en ? 'Need something delivered in Tunisia?' : 'Un colis à faire livrer en Tunisie ?'}
          </h2>
          <p className="text-gray-300 mb-8 text-lg">
            {en
              ? 'Create a free account and receive your first offers from local carriers.'
              : 'Créez votre compte gratuitement et recevez vos premières offres de transporteurs locaux.'}
          </p>
          <Button
            size="lg"
            onClick={() => goClient('/client-signup')}
            className="text-lg px-8 py-4 bg-white text-gray-900 hover:bg-gray-100 rounded-lg font-medium inline-flex items-center gap-2"
          >
            {en ? 'Start my request' : 'Commencer ma demande'}
            <ArrowRight size={20} aria-hidden="true" />
          </Button>
        </div>
      </RevealSection>

      <Footer />
    </div>
  );
};
