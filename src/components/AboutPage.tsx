import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Car,
  CheckCircle,
  Package,
  Smartphone,
  Users,
  Truck,
} from 'lucide-react';
import { Button } from './ui/Button';
import { Footer } from './Footer';
import { useLocale } from '../i18n/locale';

interface AboutPageProps {
  onClientLogin: () => void;
  onClientSignup: () => void;
}

const vtcSteps = [
  {
    title: '1. Indiquez votre trajet',
    description:
      'Saisissez le lieu de prise en charge et la destination. Le tarif estimé s\'affiche avant validation.',
  },
  {
    title: '2. Choisissez votre véhicule',
    description:
      'Berline, taxi, van, minibus ou bus : sélectionnez le type adapté à votre groupe et à vos besoins.',
  },
  {
    title: '3. Confirmez la réservation',
    description:
      'Un chauffeur partenaire disponible accepte votre course. Vous suivez l\'avancement depuis votre espace client.',
  },
];

const parcelSteps = [
  {
    title: '1. Déposez une demande de devis',
    description:
      'Décrivez votre envoi (adresses, date, contenu, photos) pour un trajet Europe ↔ Tunisie.',
  },
  {
    title: '2. Comparez les offres',
    description:
      'Plusieurs transporteurs qualifiés vous proposent un prix. Vous choisissez l\'offre retenue.',
  },
  {
    title: '3. Organisez la livraison',
    description:
      'Après acceptation, vos coordonnées sont échangées pour planifier l\'enlèvement et la livraison.',
  },
];

const driverBenefits = [
  'Recevez des demandes de courses selon vos disponibilités',
  'Gérez vos véhicules et votre planning en ligne',
  'Proposez vos tarifs pour le transport de colis internationaux',
  'Développez votre activité avec une visibilité accrue',
];

const vtcStepsEn = [
  { title: '1. Enter your trip', description: 'Enter the pickup place and destination. The estimated fare is shown before you confirm.' },
  { title: '2. Choose your vehicle', description: 'Sedan, taxi, van, minibus or bus: pick the type that fits your group.' },
  { title: '3. Confirm the booking', description: 'An available partner driver accepts the ride. You follow it from your rider space.' },
];

const parcelStepsEn = [
  { title: '1. Submit a quote request', description: 'Describe your shipment (addresses, date, contents, photos) for a Europe ↔ Tunisia trip.' },
  { title: '2. Compare offers', description: 'Several qualified carriers propose a price. You choose the one you want.' },
  { title: '3. Arrange delivery', description: 'After you accept, contact details are exchanged to plan pickup and delivery.' },
];

const driverBenefitsEn = [
  'Receive ride requests that match your availability',
  'Manage your vehicles and schedule online',
  'Set your own prices for international parcels',
  'Grow your activity with more visibility',
];

export const AboutPage: React.FC<AboutPageProps> = ({ onClientLogin, onClientSignup }) => {
  const { locale, href } = useLocale();
  const en = locale === 'en';
  const steps = en ? vtcStepsEn : vtcSteps;
  const parcels = en ? parcelStepsEn : parcelSteps;
  const benefits = en ? driverBenefitsEn : driverBenefits;
  return (
    <div className="min-h-screen bg-white">
      <main>
        <section className="bg-surface-muted border-b border-surface-border">
          <div className="page-container py-14 md:py-20">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                {en ? 'About' : 'À propos'}
              </p>
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight tracking-tight mb-6">
                {en ? 'How does TuniDrive work?' : 'Comment fonctionne TuniDrive ?'}
              </h1>
              <p className="page-subheading">
                {en
                  ? 'TuniDrive is a Tunisian platform that connects riders, private drivers and parcel carriers. Two activities: passenger transport in Tunisia and international goods transport between Europe and Tunisia.'
                  : "TuniDrive est une plateforme tunisienne qui met en relation clients, chauffeurs VTC et transporteurs de colis. Deux activités complémentaires : le transport de personnes en Tunisie et le transport international de marchandises entre l'Europe et la Tunisie."}
              </p>
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className="page-container">
            <div className="max-w-3xl mb-10">
              <h2 className="page-heading mb-4">{en ? 'Our mission' : 'Notre mission'}</h2>
              <p className="page-subheading">
                {en
                  ? 'Make mobility simpler with transparent online booking, fares shown in advance, and a direct connection between clients and verified partner professionals.'
                  : "Simplifier la mobilité et le transport en offrant une réservation en ligne transparente, des tarifs affichés à l'avance et une mise en relation directe entre clients et professionnels partenaires vérifiés."}
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              {[
                {
                  icon: Car,
                  title: en ? 'Private rides' : 'Courses VTC',
                  text: en ? 'Private driver, taxi, airport transfer and group transport in Tunisia.' : 'Chauffeur privé, taxi, transfert aéroport et transport collectif en Tunisie.',
                },
                {
                  icon: Package,
                  title: en ? 'International parcels' : 'Colis internationaux',
                  text: en ? 'Custom quotes for Europe ↔ Tunisia shipments.' : 'Devis personnalisés pour vos envois Europe ↔ Tunisie.',
                },
                {
                  icon: Smartphone,
                  title: 'Web & mobile',
                  text: en ? 'Book on tunidrive.net or in the TuniDrive app.' : "Réservez sur tunidrive.net ou via l'application TuniDrive.",
                },
              ].map(({ icon: Icon, title, text }) => (
                <div key={title} className="uber-card p-6">
                  <div className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center mb-4">
                    <Icon size={20} />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 bg-surface-muted">
          <div className="page-container">
            <h2 className="page-heading mb-4">{en ? 'Book a private ride (riders)' : 'Réserver une course VTC (clients)'}</h2>
            <p className="page-subheading max-w-3xl mb-10">
              {en
                ? 'A city trip, an airport transfer or a group ride all follow the same steps.'
                : "Que vous ayez besoin d'un trajet urbain, d'un transfert aéroport ou d'un transport de groupe, le parcours est le même."}
            </p>
            <div className="grid md:grid-cols-3 gap-6 max-w-5xl">
              {steps.map((step) => (
                <div key={step.title} className="uber-card p-6">
                  <h3 className="text-base font-semibold text-gray-900 mb-2">{step.title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{step.description}</p>
                </div>
              ))}
            </div>
            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              <Button size="lg" onClick={onClientLogin} className="rounded-full">
                {en ? 'Book a ride' : 'Réserver une course'}
                <ArrowRight size={20} className="ml-2" />
              </Button>
              <Button size="lg" variant="outline" onClick={onClientSignup} className="rounded-full">
                {en ? 'Create a rider account' : 'Créer un compte client'}
              </Button>
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className="page-container">
            <h2 className="page-heading mb-4">{en ? 'Parcel transport Europe ↔ Tunisia' : 'Transport de colis Europe ↔ Tunisie'}</h2>
            <p className="page-subheading max-w-3xl mb-10">
              {en
                ? 'For international goods, TuniDrive works as a marketplace: you submit a request, compare offers and confirm the one you choose.'
                : "Pour l'envoi de marchandises à l'international, TuniDrive fonctionne comme une place de marché : vous déposez une demande, vous comparez les propositions et vous validez l'offre choisie."}
            </p>
            <div className="grid md:grid-cols-3 gap-6 max-w-5xl">
              {parcels.map((step) => (
                <div key={step.title} className="uber-card p-6">
                  <h3 className="text-base font-semibold text-gray-900 mb-2">{step.title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{step.description}</p>
                </div>
              ))}
            </div>
            <p className="mt-8 text-sm text-gray-600 max-w-3xl">
              {en ? (
                <>
                  Prices are in <strong>EUR</strong> for Europe → Tunisia and in <strong>TND</strong> for
                  Tunisia → Europe. Other offers are declined automatically when you accept one.
                </>
              ) : (
                <>
                  Tarif en <strong>EUR</strong> pour un envoi Europe → Tunisie, et en <strong>TND</strong> pour
                  Tunisie → Europe. Les autres propositions sont automatiquement refusées lorsque vous acceptez
                  une offre.
                </>
              )}
            </p>
            <Link
              to={href('/transport-colis-europe-tunisie')}
              className="inline-flex items-center gap-2 mt-6 text-sm font-semibold text-gray-900 hover:underline"
            >
              {en ? 'Learn more about parcel transport' : 'En savoir plus sur le transport de colis'}
              <ArrowRight size={16} />
            </Link>
          </div>
        </section>

        <section className="py-16 bg-surface-muted">
          <div className="page-container">
            <div className="grid md:grid-cols-2 gap-10 items-start">
              <div>
                <h2 className="page-heading mb-4">{en ? 'Partner drivers & carriers' : 'Chauffeurs & transporteurs partenaires'}</h2>
                <p className="page-subheading mb-6">
                  {en
                    ? 'Are you a private driver or a parcel carrier? Sign up for free to receive requests that match your activity.'
                    : 'Vous êtes chauffeur VTC ou transporteur de colis ? Inscrivez-vous gratuitement pour recevoir des demandes correspondant à votre activité.'}
                </p>
                <ul className="space-y-3">
                  {benefits.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-gray-600">
                      <CheckCircle size={16} className="text-gray-900 mt-0.5 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Link to={href('/signup')} className="inline-block mt-8">
                  <Button size="lg" variant="outline" className="rounded-full">
                    {en ? 'Become a partner' : 'Devenir partenaire'}
                    <ArrowRight size={20} className="ml-2" />
                  </Button>
                </Link>
              </div>
              <div className="uber-card p-8">
                <div className="flex items-center gap-3 mb-4">
                  <Users size={22} className="text-gray-700" />
                  <h3 className="text-lg font-semibold text-gray-900">{en ? 'Transparent fares' : 'Tarifs transparents'}</h3>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed mb-4">
                  {en
                    ? 'Private rides use a progressive fare grid: pickup fee, per-kilometre rate by distance and vehicle type. The estimate is shown before you confirm.'
                    : "Pour les courses VTC, une grille tarifaire progressive s'applique : prise en charge, tarif au kilomètre selon la distance et type de véhicule. Le montant estimé est affiché avant confirmation."}
                </p>
                <div className="flex items-center gap-3">
                  <Truck size={22} className="text-gray-700" />
                  <p className="text-sm text-gray-600">
                    {en
                      ? 'For parcels, each carrier freely proposes a price for the route.'
                      : 'Pour les colis, chaque transporteur propose librement son prix selon le trajet.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className="page-container">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="page-heading mb-4">{en ? 'Ready to start?' : 'Prêt à commencer ?'}</h2>
              <p className="page-subheading mb-8">
                {en
                  ? 'Estimate a trip on the homepage, book a ride or request a parcel quote in a few minutes.'
                  : "Estimez un trajet sur la page d'accueil, réservez une course ou demandez un devis colis en quelques minutes."}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" onClick={onClientLogin} className="rounded-full">
                  {en ? 'Book now' : 'Réserver maintenant'}
                </Button>
                <Link to={href('/')}>
                  <Button size="lg" variant="outline" className="rounded-full w-full sm:w-auto">
                    {en ? 'Back to home' : "Retour à l'accueil"}
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};
