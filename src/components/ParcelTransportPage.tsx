import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle,
  ChevronDown,
  Globe,
  Package,
  Truck,
} from 'lucide-react';
import { Button } from './ui/Button';
import { Footer } from './Footer';
import { faqCategories } from '../data/faqData';
import { faqCategoriesEn } from '../data/faqData.en';
import { getParcelFaqItems, setFaqJsonLd } from '../utils/seo';
import { useLocale } from '../i18n/locale';
import { RevealSection } from './ui/RevealSection';

const EUROPE_CORRIDORS = [
  'France',
  'Italie',
  'Allemagne',
  'Espagne',
  'Belgique',
  'Luxembourg',
  'Suisse',
  'Pays-Bas',
];

const EUROPE_CORRIDORS_EN = [
  'France',
  'Italy',
  'Germany',
  'Spain',
  'Belgium',
  'Luxembourg',
  'Switzerland',
  'Netherlands',
];

const STEPS = [
  {
    title: 'Décrivez votre envoi',
    description:
      'Indiquez les adresses de départ et d\'arrivée, la date souhaitée, le contenu de vos colis et joignez des photos ou factures.',
  },
  {
    title: 'Recevez des devis',
    description:
      'Les transporteurs partenaires qualifiés vous envoient leurs propositions de prix et délais estimés.',
  },
  {
    title: 'Comparez et validez',
    description:
      'Choisissez l\'offre qui vous convient en ligne. Vos coordonnées sont échangées pour organiser l\'enlèvement et la livraison.',
  },
];

const STEPS_EN = [
  {
    title: 'Describe your shipment',
    description: 'Enter pickup and delivery addresses, the date you want, what is in the parcels, and attach photos or invoices.',
  },
  {
    title: 'Receive quotes',
    description: 'Qualified partner carriers send their price offers and estimated times.',
  },
  {
    title: 'Compare and confirm',
    description: 'Choose the offer online. Contact details are exchanged to arrange pickup and delivery.',
  },
];

export const ParcelTransportPage: React.FC = () => {
  const navigate = useNavigate();
  const { locale, href } = useLocale();
  const en = locale === 'en';
  const parcelFaq = (en ? faqCategoriesEn : faqCategories).find((c) => c.id === 'parcel')?.items ?? [];
  const steps = en ? STEPS_EN : STEPS;
  const corridors = en ? EUROPE_CORRIDORS_EN : EUROPE_CORRIDORS;
  const [openFaqId, setOpenFaqId] = useState<string | null>(parcelFaq[0]?.id ?? null);

  useEffect(() => {
    setFaqJsonLd(getParcelFaqItems(locale));
    return () => {
      document.querySelector('script[data-seo-jsonld="faq-page"]')?.remove();
    };
  }, [locale]);

  return (
    <div className="min-h-screen bg-white">
      <section className="py-16 md:py-24 bg-gray-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-800 rounded-full text-sm font-medium mb-6">
              <Globe size={16} aria-hidden="true" />
              {en ? 'Europe ↔ Tunisia' : 'Europe ↔ Tunisie'}
            </span>
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6 tracking-tight leading-tight">
              {en
                ? 'Parcel and goods transport between Europe and Tunisia'
                : "Transport de colis et marchandises entre l'Europe et la Tunisie"}
            </h1>
            <p className="text-xl text-gray-600 mb-4 leading-relaxed">
              {en
                ? 'Send or receive parcels internationally with TuniDrive: a free quote request, several carriers, and a transparent comparison of offers.'
                : "Envoyez ou recevez vos colis à l'international avec TuniDrive : demande de devis gratuite, plusieurs transporteurs, comparaison transparente des offres."}
            </p>
            <p className="text-base text-gray-500 mb-10 max-w-2xl mx-auto">
              {en
                ? 'Useful for boxes, personal belongings, bulky goods or regular shipments between Tunisia and Europe — France, Italy, Germany and more.'
                : "Idéal pour cartons, effets personnels, marchandises volumineuses ou envois réguliers entre la Tunisie et l'Europe — France, Italie, Allemagne et plus encore."}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                onClick={() => navigate(href('/client-signup'))}
                className="text-lg px-8 py-4 bg-black hover:bg-gray-800 text-white rounded-lg font-medium inline-flex items-center justify-center gap-2"
              >
                {en ? 'Request a free quote' : 'Demander un devis gratuit'}
                <ArrowRight size={20} aria-hidden="true" />
              </Button>
              <Button
                size="lg"
                onClick={() => navigate(href('/client-login'))}
                className="text-lg px-8 py-4 bg-white border-2 border-gray-300 text-gray-900 hover:bg-gray-50 rounded-lg font-medium"
              >
                {en ? 'I already have an account' : "J'ai déjà un compte"}
              </Button>
            </div>
          </div>
        </div>
      </section>

      <RevealSection className="py-16 md:py-20" aria-labelledby="parcel-corridors-heading">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 id="parcel-corridors-heading" className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {en ? 'Routes we cover' : 'Trajets couverts'}
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              {en ? (
                <>International parcels both ways: <strong>Europe → Tunisia</strong> and <strong>Tunisia → Europe</strong>.</>
              ) : (
                <>Transport international de colis dans les deux sens : <strong>Europe → Tunisie</strong> et <strong>Tunisie → Europe</strong>.</>
              )}
            </p>
          </div>
          <ul className="flex flex-wrap justify-center gap-3 max-w-4xl mx-auto">
            {corridors.map((country) => (
              <li
                key={country}
                className="px-4 py-2 bg-gray-100 text-gray-800 rounded-full text-sm font-medium"
              >
                {country} ↔ {en ? 'Tunisia' : 'Tunisie'}
              </li>
            ))}
          </ul>
        </div>
      </RevealSection>

      <RevealSection className="py-16 md:py-20 bg-gray-50" aria-labelledby="parcel-how-heading">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 id="parcel-how-heading" className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {en ? 'How it works' : 'Comment ça marche ?'}
            </h2>
            <p className="text-lg text-gray-600">
              {en
                ? 'Three simple steps to ship your parcels with confidence.'
                : 'Un processus simple en trois étapes pour expédier vos colis en toute confiance.'}
            </p>
          </div>
          <ol className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto list-none">
            {steps.map((step, index) => (
              <li
                key={step.title}
                className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200"
              >
                <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-black text-white font-bold mb-4">
                  {index + 1}
                </span>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">{step.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{step.description}</p>
              </li>
            ))}
          </ol>
        </div>
      </RevealSection>

      <RevealSection className="py-16 md:py-20" aria-labelledby="parcel-audience-heading">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            <article className="rounded-2xl p-8 border border-gray-200">
              <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mb-4">
                <Package className="text-gray-700" size={24} aria-hidden="true" />
              </div>
              <h2 id="parcel-audience-heading" className="text-xl font-semibold text-gray-900 mb-3">
                {en ? 'For individuals and businesses' : 'Pour les particuliers et entreprises'}
              </h2>
              <ul className="space-y-2 text-gray-600 text-sm">
                {(en
                  ? ['Boxes, personal belongings or gifts', 'Bulky goods', 'Photos and invoices for an accurate quote', 'Compare several price offers']
                  : ['Envoi de cartons, effets personnels ou cadeaux', 'Transport de marchandises volumineuses', 'Photos et factures pour un devis précis', 'Comparaison de plusieurs propositions de prix']
                ).map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <CheckCircle size={16} className="text-green-500 mt-0.5 flex-shrink-0" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </article>
            <article className="rounded-2xl p-8 border border-gray-200">
              <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mb-4">
                <Truck className="text-gray-700" size={24} aria-hidden="true" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">
                {en ? 'For partner carriers' : 'Pour les transporteurs partenaires'}
              </h2>
              <ul className="space-y-2 text-gray-600 text-sm">
                {(en
                  ? ['Requests filtered by your availability', 'Your own price in EUR or TND', 'Visibility on Europe ↔ Tunisia routes', 'Compatible with private-hire work']
                  : ['Demandes filtrées selon vos disponibilités', 'Proposition libre en EUR ou TND', 'Visibilité sur les trajets Europe ↔ Tunisie', 'Compatible avec une activité VTC']
                ).map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <CheckCircle size={16} className="text-green-500 mt-0.5 flex-shrink-0" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
              <Button
                size="md"
                onClick={() => navigate(href('/signup'))}
                className="mt-6 bg-black hover:bg-gray-800 text-white"
              >
                {en ? 'Become a carrier' : 'Devenir transporteur'}
              </Button>
            </article>
          </div>
        </div>
      </RevealSection>

      <RevealSection className="py-16 md:py-20 bg-gray-50" aria-labelledby="parcel-faq-heading">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 id="parcel-faq-heading" className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {en ? 'Frequently asked questions — parcels' : 'Questions fréquentes — transport de colis'}
            </h2>
            <p className="text-gray-600">
              {en ? 'Quotes, routes and what TuniDrive does.' : 'Tout savoir sur les devis, les trajets et le rôle de TuniDrive.'}
            </p>
          </div>
          <div className="space-y-3">
            {parcelFaq.map((item) => {
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
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {en ? 'Ready to ship your parcels?' : 'Prêt à expédier vos colis ?'}
          </h2>
          <p className="text-gray-300 mb-8 text-lg">
            {en
              ? 'Create a free account and receive your first carrier offers.'
              : 'Créez votre compte gratuitement et recevez vos premières propositions de transporteurs.'}
          </p>
          <Button
            size="lg"
            onClick={() => navigate(href('/client-signup'))}
            className="text-lg px-8 py-4 bg-white text-gray-900 hover:bg-gray-100 rounded-lg font-medium inline-flex items-center gap-2"
          >
            {en ? 'Start my quote request' : 'Commencer ma demande de devis'}
            <ArrowRight size={20} aria-hidden="true" />
          </Button>
        </div>
      </RevealSection>

      <Footer />
    </div>
  );
};
