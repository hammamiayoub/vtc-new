import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Bus,
  CalendarCheck,
  MapPin,
  Plane,
  Users,
} from 'lucide-react';
import { Button } from './ui/Button';
import { Footer } from './Footer';
import { useLocale } from '../i18n/locale';
import { RevealSection } from './ui/RevealSection';

const WHATSAPP_URL = 'https://wa.me/21628528477';

const SERVICES = [
  {
    icon: Plane,
    title: 'Accueil à l\'arrivée',
    titleEn: 'Arrival pickup',
    text: 'Prise en charge à Tunis-Carthage, Enfidha, Monastir ou Djerba, puis transfert vers l\'hôtel ou la première étape du séjour.',
    textEn: 'Pickup at Tunis-Carthage, Enfidha, Monastir or Djerba, then a transfer to the hotel or the first stop of the stay.',
  },
  {
    icon: MapPin,
    title: 'Déplacements pendant le séjour',
    titleEn: 'Travel during the stay',
    text: 'Trajets entre villes, hôtels, sites et journées de visite. Le programme du groupe est organisé à l\'avance.',
    textEn: 'Trips between cities, hotels, sites and day visits. The group programme is arranged in advance.',
  },
  {
    icon: Bus,
    title: 'Véhicule adapté au groupe',
    titleEn: 'A vehicle that fits the group',
    text: 'Berline ou van pour une famille, minibus pour un groupe moyen, bus pour un effectif plus large.',
    textEn: 'Sedan or van for a family, minibus for a mid-size group, bus for a larger party.',
  },
  {
    icon: CalendarCheck,
    title: 'Un seul interlocuteur',
    titleEn: 'One point of contact',
    text: 'Dates, nombre de personnes, étapes : vous décrivez le séjour, TuniDrive organise les trajets avec des chauffeurs partenaires.',
    textEn: 'Dates, headcount, stops: you describe the stay, TuniDrive arranges the rides with partner drivers.',
  },
];

const STEPS = [
  {
    title: 'Décrivez le séjour',
    titleEn: 'Describe the stay',
    text: 'Pays de départ, aéroport d\'arrivée, dates, nombre de voyageurs et villes prévues.',
    textEn: 'Departure country, arrival airport, dates, number of travellers and planned cities.',
  },
  {
    title: 'Le programme de transport est préparé',
    titleEn: 'The transport plan is prepared',
    text: 'Accueils, transferts hôtel, liaisons entre étapes et retour aéroport sont calés sur votre planning.',
    textEn: 'Meet-and-greet, hotel transfers, hops between stops and the airport return are set to your schedule.',
  },
  {
    title: 'Le groupe est pris en charge sur place',
    titleEn: 'The group is looked after on the ground',
    text: 'Les chauffeurs partenaires assurent les déplacements convenus pendant le séjour en Tunisie.',
    textEn: 'Partner drivers cover the agreed trips throughout the stay in Tunisia.',
  },
];

function whatsAppHref(en: boolean): string {
  const text = en
    ? 'Hello, I would like to organize transport for a group coming from abroad for a stay in Tunisia.'
    : 'Bonjour, je souhaite organiser les déplacements d\'un groupe venant de l\'étranger pour un séjour en Tunisie.';
  return `${WHATSAPP_URL}?text=${encodeURIComponent(text)}`;
}

export const GroupTravelPage: React.FC = () => {
  const navigate = useNavigate();
  const { locale, href } = useLocale();
  const en = locale === 'en';

  return (
    <div className="min-h-screen bg-white">
      <section className="py-16 md:py-24 bg-gray-50 border-b border-gray-100">
        <div className="page-container">
          <div className="max-w-4xl mx-auto text-center">
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-800 rounded-full text-sm font-medium mb-6">
              <Users size={16} aria-hidden="true" />
              {en ? 'Groups coming from abroad' : 'Groupes venant de l\'étranger'}
            </span>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 tracking-tight leading-tight">
              {en
                ? 'We organize transport for groups staying in Tunisia'
                : 'Nous organisons les déplacements des groupes en séjour en Tunisie'}
            </h1>
            <p className="text-xl text-gray-600 mb-4 leading-relaxed">
              {en
                ? 'Families, agencies, clubs and groups of friends arriving from abroad: TuniDrive takes care of their trips on the ground, from the airport to the days of the stay.'
                : 'Familles, agences, clubs et groupes d\'amis qui arrivent de l\'étranger : TuniDrive prend en charge leurs trajets sur place, de l\'aéroport jusqu\'aux journées du séjour.'}
            </p>
            <p className="text-base text-gray-500 mb-10 max-w-2xl mx-auto">
              {en
                ? 'This is not a single ride booked at the last minute. You share the stay, and the transfers are arranged around it.'
                : 'Il ne s\'agit pas d\'une course isolée réservée au dernier moment. Vous présentez le séjour, et les transferts sont organisés autour.'}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href={whatsAppHref(en)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 text-lg px-8 py-4 bg-black hover:bg-gray-800 text-white rounded-lg font-medium"
              >
                {en ? 'Organize a stay' : 'Organiser un séjour'}
                <ArrowRight size={20} aria-hidden="true" />
              </a>
              <Button
                size="lg"
                onClick={() => navigate(href('/client-signup'))}
                className="text-lg px-8 py-4 bg-white border-2 border-gray-300 text-gray-900 hover:bg-gray-50 rounded-lg font-medium"
              >
                {en ? 'Create a client account' : 'Créer un compte client'}
              </Button>
            </div>
          </div>
        </div>
      </section>

      <RevealSection className="py-16 md:py-20" aria-labelledby="group-services-heading">
        <div className="page-container">
          <div className="text-center mb-12 max-w-3xl mx-auto">
            <h2 id="group-services-heading" className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {en ? 'What is arranged for the group' : 'Ce qui est organisé pour le groupe'}
            </h2>
            <p className="text-lg text-gray-600">
              {en
                ? 'The travellers land in Tunisia. From there, their movements are planned with them.'
                : 'Les voyageurs atterrissent en Tunisie. À partir de là, leurs déplacements sont préparés avec eux.'}
            </p>
          </div>
          <ul className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto list-none">
            {SERVICES.map(({ icon: Icon, title, titleEn, text, textEn }) => (
              <li key={title} className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm">
                <div className="w-10 h-10 rounded-full bg-gray-900 text-white flex items-center justify-center mb-4">
                  <Icon size={20} aria-hidden="true" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{en ? titleEn : title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{en ? textEn : text}</p>
              </li>
            ))}
          </ul>
        </div>
      </RevealSection>

      <RevealSection className="py-16 md:py-20 bg-gray-50" aria-labelledby="group-steps-heading">
        <div className="page-container">
          <div className="text-center mb-12">
            <h2 id="group-steps-heading" className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {en ? 'How a stay is set up' : 'Comment un séjour se met en place'}
            </h2>
          </div>
          <ol className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto list-none">
            {STEPS.map((step, index) => (
              <li key={step.title} className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200">
                <p className="text-sm font-semibold text-gray-400 mb-3">0{index + 1}</p>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">{en ? step.titleEn : step.title}</h3>
                <p className="text-gray-600 leading-relaxed">{en ? step.textEn : step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </RevealSection>

      <RevealSection className="py-16 md:py-20">
        <div className="page-container">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {en ? 'Tell us about the group' : 'Parlez-nous du groupe'}
            </h2>
            <p className="text-lg text-gray-600 mb-8">
              {en
                ? 'A message is enough to start: arrival airport, dates and number of people. A single ride can still be booked online if you only need one transfer.'
                : 'Un message suffit pour commencer : aéroport d\'arrivée, dates et nombre de personnes. Une course isolée peut toujours être réservée en ligne si vous n\'avez besoin que d\'un transfert.'}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href={whatsAppHref(en)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-black hover:bg-gray-800 text-white rounded-lg font-medium"
              >
                WhatsApp
              </a>
              <Button
                size="lg"
                onClick={() => navigate(href('/client-login'))}
                className="px-8 py-4 bg-white border-2 border-gray-300 text-gray-900 hover:bg-gray-50 rounded-lg font-medium"
              >
                {en ? 'Book a single transfer' : 'Réserver un transfert'}
              </Button>
            </div>
          </div>
        </div>
      </RevealSection>

      <Footer />
    </div>
  );
};
