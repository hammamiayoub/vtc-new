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

export const AboutPage: React.FC<AboutPageProps> = ({ onClientLogin, onClientSignup }) => {
  return (
    <div className="min-h-screen bg-white">
      <main>
        <section className="bg-surface-muted border-b border-surface-border">
          <div className="page-container py-14 md:py-20">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                À propos
              </p>
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight tracking-tight mb-6">
                Comment fonctionne TuniDrive ?
              </h1>
              <p className="page-subheading">
                TuniDrive est une plateforme tunisienne qui met en relation clients, chauffeurs VTC
                et transporteurs de colis. Deux activités complémentaires : le transport de personnes
                en Tunisie et le transport international de marchandises entre l&apos;Europe et la Tunisie.
              </p>
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className="page-container">
            <div className="max-w-3xl mb-10">
              <h2 className="page-heading mb-4">Notre mission</h2>
              <p className="page-subheading">
                Simplifier la mobilité et le transport en offrant une réservation en ligne transparente,
                des tarifs affichés à l&apos;avance et une mise en relation directe entre clients et
                professionnels partenaires vérifiés.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              {[
                {
                  icon: Car,
                  title: 'Courses VTC',
                  text: 'Chauffeur privé, taxi, transfert aéroport et transport collectif en Tunisie.',
                },
                {
                  icon: Package,
                  title: 'Colis internationaux',
                  text: 'Devis personnalisés pour vos envois Europe ↔ Tunisie.',
                },
                {
                  icon: Smartphone,
                  title: 'Web & mobile',
                  text: 'Réservez sur tunidrive.net ou via l\'application TuniDrive.',
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
            <h2 className="page-heading mb-4">Réserver une course VTC (clients)</h2>
            <p className="page-subheading max-w-3xl mb-10">
              Que vous ayez besoin d&apos;un trajet urbain, d&apos;un transfert aéroport ou d&apos;un
              transport de groupe, le parcours est le même.
            </p>
            <div className="grid md:grid-cols-3 gap-6 max-w-5xl">
              {vtcSteps.map((step) => (
                <div key={step.title} className="uber-card p-6">
                  <h3 className="text-base font-semibold text-gray-900 mb-2">{step.title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{step.description}</p>
                </div>
              ))}
            </div>
            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              <Button size="lg" onClick={onClientLogin} className="rounded-full">
                Réserver une course
                <ArrowRight size={20} className="ml-2" />
              </Button>
              <Button size="lg" variant="outline" onClick={onClientSignup} className="rounded-full">
                Créer un compte client
              </Button>
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className="page-container">
            <h2 className="page-heading mb-4">Transport de colis Europe ↔ Tunisie</h2>
            <p className="page-subheading max-w-3xl mb-10">
              Pour l&apos;envoi de marchandises à l&apos;international, TuniDrive fonctionne comme une
              place de marché : vous déposez une demande, vous comparez les propositions et vous validez
              l&apos;offre choisie.
            </p>
            <div className="grid md:grid-cols-3 gap-6 max-w-5xl">
              {parcelSteps.map((step) => (
                <div key={step.title} className="uber-card p-6">
                  <h3 className="text-base font-semibold text-gray-900 mb-2">{step.title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{step.description}</p>
                </div>
              ))}
            </div>
            <p className="mt-8 text-sm text-gray-600 max-w-3xl">
              Tarif en <strong>EUR</strong> pour un envoi Europe → Tunisie, et en <strong>TND</strong> pour
              Tunisie → Europe. Les autres propositions sont automatiquement refusées lorsque vous acceptez
              une offre.
            </p>
            <Link
              to="/transport-colis-europe-tunisie"
              className="inline-flex items-center gap-2 mt-6 text-sm font-semibold text-gray-900 hover:underline"
            >
              En savoir plus sur le transport de colis
              <ArrowRight size={16} />
            </Link>
          </div>
        </section>

        <section className="py-16 bg-surface-muted">
          <div className="page-container">
            <div className="grid md:grid-cols-2 gap-10 items-start">
              <div>
                <h2 className="page-heading mb-4">Chauffeurs &amp; transporteurs partenaires</h2>
                <p className="page-subheading mb-6">
                  Vous êtes chauffeur VTC ou transporteur de colis ? Inscrivez-vous gratuitement pour
                  recevoir des demandes correspondant à votre activité.
                </p>
                <ul className="space-y-3">
                  {driverBenefits.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-gray-600">
                      <CheckCircle size={16} className="text-gray-900 mt-0.5 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Link to="/signup" className="inline-block mt-8">
                  <Button size="lg" variant="outline" className="rounded-full">
                    Devenir partenaire
                    <ArrowRight size={20} className="ml-2" />
                  </Button>
                </Link>
              </div>
              <div className="uber-card p-8">
                <div className="flex items-center gap-3 mb-4">
                  <Users size={22} className="text-gray-700" />
                  <h3 className="text-lg font-semibold text-gray-900">Tarifs transparents</h3>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed mb-4">
                  Pour les courses VTC, une grille tarifaire progressive s&apos;applique : prise en charge,
                  tarif au kilomètre selon la distance et type de véhicule. Le montant estimé est affiché
                  avant confirmation.
                </p>
                <div className="flex items-center gap-3">
                  <Truck size={22} className="text-gray-700" />
                  <p className="text-sm text-gray-600">
                    Pour les colis, chaque transporteur propose librement son prix selon le trajet.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className="page-container">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="page-heading mb-4">Prêt à commencer ?</h2>
              <p className="page-subheading mb-8">
                Estimez un trajet sur la page d&apos;accueil, réservez une course ou demandez un devis colis
                en quelques minutes.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" onClick={onClientLogin} className="rounded-full">
                  Réserver maintenant
                </Button>
                <Link to="/">
                  <Button size="lg" variant="outline" className="rounded-full w-full sm:w-auto">
                    Retour à l&apos;accueil
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
