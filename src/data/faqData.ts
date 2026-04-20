export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

export interface FaqCategory {
  id: string;
  label: string;
  emoji: string;
  items: FaqItem[];
}

export const faqCategories: FaqCategory[] = [
  {
    id: "client",
    label: "Je suis client",
    emoji: "🧳",
    items: [
      {
        id: "c1",
        question: "Comment créer une course ?",
        answer:
          "Connectez-vous à votre espace client, puis cliquez sur « Réserver une course ». Saisissez votre adresse de départ, votre destination et choisissez le type de véhicule souhaité. Confirmez la réservation : un chauffeur sera assigné et vous recevrez une notification.",
      },
      {
        id: "c2",
        question: "Comment annuler ou modifier une réservation ?",
        answer:
          "Depuis votre tableau de bord, retrouvez la course dans la liste « Mes courses ». Cliquez sur la course concernée et sélectionnez « Annuler » ou contactez le support. Pensez à annuler le plus tôt possible pour ne pas pénaliser le chauffeur.",
      },
      {
        id: "c3",
        question: "Quels sont les tarifs des courses ?",
        answer:
          "Les tarifs varient selon la distance parcourue et le type de véhicule :\n• Voiture standard : tarif de base + prix au km\n• Van collectif (jusqu'à 8 pers.) : tarif groupe\n• Bus (jusqu'à 50 pers.) : tarif longue distance\n• Véhicule de luxe : service premium\n• Utilitaire : transport de marchandises\n\nLe prix estimé vous est affiché avant de confirmer la réservation.",
      },
      {
        id: "c4",
        question: "Comment payer ma course ?",
        answer:
          "Le paiement s'effectue directement au chauffeur à la fin de la course. Les modalités de paiement acceptées (espèces, carte, virement) sont précisées lors de la réservation.",
      },
      {
        id: "c5",
        question: "Comment suivre ma course en temps réel ?",
        answer:
          "Une fois votre course confirmée et un chauffeur assigné, vous recevrez des notifications push. Vous pouvez également suivre l'avancement depuis votre tableau de bord client.",
      },
      {
        id: "c6",
        question: "Comment créer un compte client ?",
        answer:
          "Cliquez sur « Réserver une course » puis sur « Créer un compte ». Renseignez votre nom, email et mot de passe. Vous recevrez un email de confirmation pour activer votre compte.",
      },
      {
        id: "c7",
        question: "J'ai oublié mon mot de passe, que faire ?",
        answer:
          "Sur la page de connexion, cliquez sur « Mot de passe oublié ». Saisissez votre adresse email et vous recevrez un lien de réinitialisation dans les prochaines minutes.",
      },
      {
        id: "c8",
        question: "Comment noter mon chauffeur ?",
        answer:
          "À la fin de votre course, une fenêtre de notation apparaît automatiquement. Vous pouvez attribuer une note de 1 à 5 étoiles et laisser un commentaire. Votre avis est précieux pour maintenir la qualité du service.",
      },
    ],
  },
  {
    id: "driver",
    label: "Je suis chauffeur",
    emoji: "🚗",
    items: [
      {
        id: "d1",
        question: "Comment m'inscrire comme chauffeur ?",
        answer:
          "Cliquez sur « Devenir chauffeur » depuis la page d'accueil. Remplissez le formulaire d'inscription avec vos informations personnelles, les détails de votre véhicule et vos documents (permis, assurance, etc.). Votre dossier sera examiné par notre équipe.",
      },
      {
        id: "d2",
        question: "Comment voir les courses disponibles ?",
        answer:
          "Connectez-vous à votre espace chauffeur. Les courses disponibles dans votre zone apparaissent en temps réel dans votre tableau de bord. Vous recevez également des notifications push dès qu'une nouvelle course est proposée.",
      },
      {
        id: "d3",
        question: "Comment accepter ou refuser une course ?",
        answer:
          "Lorsqu'une course vous est proposée, une notification s'affiche avec les détails (départ, destination, distance estimée). Vous pouvez l'accepter ou la refuser directement depuis votre tableau de bord. Si vous acceptez, le client est immédiatement notifié.",
      },
      {
        id: "d4",
        question: "Combien coûte l'abonnement chauffeur ?",
        answer:
          "L'abonnement premium est proposé à :\n• Mensuel : 30 TND HT / mois (soit ~35,70 TND TTC avec 19% de TVA)\n• Annuel : 10% de réduction sur le tarif mensuel\n\nSans abonnement, vous bénéficiez d'un nombre limité de courses gratuites pour tester la plateforme.",
      },
      {
        id: "d5",
        question: "Comment payer mon abonnement ?",
        answer:
          "Le paiement se fait par virement bancaire. Depuis votre tableau de bord, accédez à la section « Abonnement », choisissez votre formule (mensuelle ou annuelle) et suivez les instructions de paiement. Votre abonnement est activé une fois le virement validé par notre équipe.",
      },
      {
        id: "d6",
        question: "Combien de courses gratuites ai-je sans abonnement ?",
        answer:
          "Sans abonnement premium, vous pouvez accepter un nombre limité de courses par mois à titre d'essai. Une fois ce quota atteint, vous devrez souscrire à l'abonnement pour continuer à recevoir des courses.",
      },
      {
        id: "d7",
        question: "Comment mettre à jour mon profil ou mes véhicules ?",
        answer:
          "Depuis votre tableau de bord, accédez à « Mon profil » pour modifier vos informations personnelles ou à « Mes véhicules » pour ajouter, modifier ou supprimer un véhicule.",
      },
      {
        id: "d8",
        question: "Comment gérer ma disponibilité ?",
        answer:
          "Utilisez le calendrier de disponibilité dans votre tableau de bord pour indiquer vos créneaux de travail. Vous pouvez activer ou désactiver votre disponibilité à tout moment pour ne recevoir des courses que quand vous le souhaitez.",
      },
    ],
  },
  {
    id: "general",
    label: "Questions générales",
    emoji: "💬",
    items: [
      {
        id: "g1",
        question: "Qu'est-ce que TuniDrive ?",
        answer:
          "TuniDrive est une plateforme de transport VTC (Véhicule de Tourisme avec Chauffeur) qui met en relation des clients et des chauffeurs professionnels. Nous proposons des trajets fiables, ponctuels et sécurisés pour particuliers et entreprises.",
      },
      {
        id: "g2",
        question: "Dans quelles villes opérez-vous ?",
        answer:
          "TuniDrive opère dans les principales villes de Tunisie. Les zones de service disponibles sont affichées lors de la réservation. Contactez notre support si vous avez un besoin spécifique hors zone.",
      },
      {
        id: "g3",
        question: "L'application mobile est-elle disponible ?",
        answer:
          "Oui ! L'application TuniDrive est disponible sur l'App Store (iPhone) et Google Play (Android). Téléchargez-la pour réserver vos courses en quelques secondes et recevoir des notifications en temps réel.",
      },
      {
        id: "g4",
        question: "Comment contacter le support ?",
        answer:
          "Notre équipe support est disponible par email. Rendez-vous en bas de page pour trouver nos coordonnées. Nous répondons généralement sous 24h.",
      },
      {
        id: "g5",
        question: "Mes données personnelles sont-elles protégées ?",
        answer:
          "Oui. TuniDrive respecte la confidentialité de vos données conformément à notre Politique de Confidentialité. Vos informations ne sont jamais revendues à des tiers.",
      },
    ],
  },
];
