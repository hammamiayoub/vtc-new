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
          "Les tarifs VTC TuniDrive (identiques sur le site et l'application mobile) comprennent :\n• Prise en charge : 4,80 TND\n• 0–15 km : 1,02 TND/km\n• 15–50 km : 1,32 TND/km\n• 50–100 km : 1,14 TND/km\n• 100–250 km : 0,90 TND/km\n• 250+ km : 0,72 TND/km\n• Prix minimum : 9,60 TND\n\nLe tarif au km est progressif : chaque tranche est facturée séparément. Un multiplicateur peut s'appliquer selon le type de véhicule (van, minibus, etc.). Le prix estimé vous est affiché avant confirmation.",
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
      {
        id: "c9",
        question: "Puis-je aussi envoyer des colis via TuniDrive ?",
        answer:
          "Oui ! En plus des courses VTC, TuniDrive propose le transport international de colis et marchandises entre l'Europe et la Tunisie.\n\nConnectez-vous à votre espace client, onglet « Transport colis », puis déposez une demande de devis. Pour plus de détails, choisissez la catégorie « Transport de colis » ci-dessous.",
      },
    ],
  },
  {
    id: "parcel",
    label: "Transport de colis",
    emoji: "📦",
    items: [
      {
        id: "p1",
        question: "Comment demander un devis pour un colis ?",
        answer:
          "Créez un compte client ou connectez-vous, puis ouvrez l'onglet « Transport colis » dans votre tableau de bord.\n\nRenseignez la direction (Europe → Tunisie ou Tunisie → Europe), les adresses, la date souhaitée, la description de vos objets et ajoutez des photos ou factures si besoin. Votre demande est envoyée aux transporteurs correspondants.",
      },
      {
        id: "p2",
        question: "Quels trajets sont couverts ?",
        answer:
          "Le service concerne le transport international de colis et marchandises entre l'Europe et la Tunisie, dans les deux sens :\n• Europe → Tunisie\n• Tunisie → Europe\n\nLes adresses sont saisies via l'autocomplétion dédiée à ces zones.",
      },
      {
        id: "p3",
        question: "Comment sont fixés les prix ?",
        answer:
          "Les transporteurs partenaires vous envoient des propositions de prix libres. Vous les comparez dans votre espace client et acceptez l'offre qui vous convient.\n\nLes autres propositions sont alors automatiquement refusées. Le tarif est en EUR pour un envoi Europe → Tunisie, et en TND pour Tunisie → Europe.",
      },
      {
        id: "p4",
        question: "Puis-je joindre des photos ou des factures ?",
        answer:
          "Oui. Lors de la création de votre demande, vous pouvez ajouter des photos de vos colis et des documents (factures, justificatifs) pour aider les transporteurs à établir un devis précis.",
      },
      {
        id: "p5",
        question: "Que se passe-t-il après avoir accepté un devis ?",
        answer:
          "Une fois que vous acceptez une proposition, le transporteur est notifié par email. Vos coordonnées peuvent alors être échangées pour organiser l'enlèvement et la livraison.\n\nTuniDrive facilite la mise en relation : le contrat et le paiement se font directement entre vous et le transporteur retenu.",
      },
      {
        id: "p6",
        question: "Comment devenir transporteur de colis ?",
        answer:
          "Cliquez sur « Devenir chauffeur / transporteur » depuis l'accueil. À l'inscription, choisissez « Transport de colis » (ou « Les deux activités » plus tard depuis votre profil).\n\nComplétez votre profil, vos véhicules et vos disponibilités : vous recevrez les demandes correspondant à vos dates.",
      },
      {
        id: "p7",
        question: "Comment recevoir et répondre aux demandes (transporteur) ?",
        answer:
          "Connectez-vous à votre espace chauffeur/transporteur. Si votre type d'activité inclut le transport de colis, l'onglet « Demandes colis » affiche les demandes compatibles avec vos disponibilités.\n\nVous proposez votre prix, un délai estimé et un message. Le client est notifié par email de votre proposition.",
      },
      {
        id: "p8",
        question: "Puis-je être chauffeur VTC et transporteur de colis ?",
        answer:
          "Oui. Depuis votre profil, vous pouvez sélectionner « Les deux activités ». Vous recevrez alors les demandes de courses de personnes et les demandes de devis colis internationaux, selon vos disponibilités et votre type de véhicule.",
      },
      {
        id: "p9",
        question: "Une demande de devis peut-elle expirer ?",
        answer:
          "Oui. Si aucune proposition n'est acceptée dans le délai prévu, la demande peut passer au statut « expiré ». Vous pouvez en déposer une nouvelle à tout moment depuis votre espace client.",
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
        question: "Comment m'inscrire comme chauffeur ou transporteur ?",
        answer:
          "Cliquez sur « Devenir chauffeur / transporteur » depuis la page d'accueil. Choisissez votre type d'activité :\n• Transport de personnes (VTC)\n• Transport de colis (Europe ↔ Tunisie)\n\nComplétez le formulaire, votre profil, vos véhicules et vos disponibilités. Vous pourrez activer « Les deux activités » depuis votre profil par la suite.",
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
          "TuniDrive est une plateforme de mobilité et de transport qui met en relation :\n• des clients et des chauffeurs pour des courses VTC en Tunisie ;\n• des clients et des transporteurs pour des devis de colis et marchandises entre l'Europe et la Tunisie.\n\nTuniDrive agit comme intermédiaire technique : les prestations sont réalisées par des professionnels partenaires indépendants.",
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
          "Oui ! L'application TuniDrive est disponible sur l'App Store (iPhone) et Google Play (Android). Réservez vos courses, suivez vos demandes de devis colis et gérez votre activité chauffeur ou transporteur avec des notifications en temps réel.",
      },
      {
        id: "g6",
        question: "Quelle est la différence entre une course VTC et un devis colis ?",
        answer:
          "La course VTC concerne le transport de personnes en Tunisie : vous réservez un trajet avec un chauffeur et un tarif affiché avant confirmation.\n\nLe devis colis concerne l'envoi de marchandises entre l'Europe et la Tunisie : vous déposez une demande, plusieurs transporteurs vous proposent un prix, et vous choisissez l'offre retenue.",
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
