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
          "Connectez-vous à votre espace client, puis ouvrez l'onglet « Nouvelle réservation ». Saisissez votre adresse de départ, votre destination, la date et le type de véhicule. Le prix estimé s'affiche, puis la liste des chauffeurs disponibles : choisissez celui qui vous convient et confirmez.\n\nLe chauffeur doit ensuite accepter la course ; vous êtes notifié dès que c'est fait.",
      },
      {
        id: "c2",
        question: "Comment annuler ou modifier une réservation ?",
        answer:
          "Depuis « Mes réservations », ouvrez la course concernée et cliquez sur « Annuler ». L'annulation en ligne est possible à tout moment tant que la course est en attente ou acceptée, c'est-à-dire avant son démarrage. Les annulations tardives ou répétées peuvent entraîner des pénalités.\n\nUne fois la course démarrée, contactez directement le chauffeur (son numéro est affiché sur la course) ou le support. Pour changer l'horaire ou l'adresse, annulez puis réservez de nouveau, ou écrivez-nous.",
      },
      {
        id: "c3",
        question: "Quels sont les tarifs des courses ?",
        answer:
          "Les tarifs VTC TuniDrive comprennent :\n• Prise en charge variable selon la distance du chauffeur : 3 TND (< 10 km), 6 TND (10–30 km), 10 TND (30–50 km), 15 TND (50 km+)\n• 0–15 km : 1,00 TND/km\n• 15–50 km : 0,90 TND/km\n• 50–100 km : 0,85 TND/km\n• 100–250 km : 0,80 TND/km\n• 250+ km : 0,75 TND/km\n• Prix minimum : 8 TND\n• Multiplicateurs véhicule : Van ×1,875 · Minibus ×3,125 · Bus ×4,375\n• Suppléments : +15 % de nuit (21 h–6 h) et +10 % le week-end, cumulables\n• Aller-retour : la distance est doublée\n\nLe tarif au km est progressif : chaque tranche est facturée séparément. Le prix estimé vous est affiché avant confirmation.",
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
          "Oui ! En plus des courses VTC, TuniDrive propose le transport international de colis et marchandises entre l'Europe et la Tunisie.\n\nConnectez-vous à votre espace client, ouvrez l'onglet « Expédier mes colis » et déposez une demande de devis. Vous suivez ensuite les offres reçues dans « Mes devis colis ».",
      },
      {
        id: "c10",
        question: "Y a-t-il des suppléments (nuit, week-end, aller-retour) ?",
        answer:
          "Oui, trois éléments peuvent modifier le prix :\n• Nuit (de 21 h à 6 h) : +15 %\n• Week-end (samedi et dimanche) : +10 %, cumulable avec le supplément de nuit\n• Aller-retour : la distance est comptée deux fois\n\nLe prix final, suppléments inclus, est affiché avant que vous confirmiez la réservation.",
      },
      {
        id: "c11",
        question: "Pourquoi ne puis-je pas réserver un van ou un minibus pour un trajet court ?",
        answer:
          "Pour les véhicules autres que le taxi, la distance aller minimale est de 20 km. En dessous, la réservation est bloquée : augmentez la distance du trajet ou choisissez le type « Taxi » pour les courses courtes.",
      },
      {
        id: "c12",
        question: "Puis-je choisir mon chauffeur ?",
        answer:
          "Oui. Après avoir saisi votre trajet, la liste des chauffeurs disponibles s'affiche avec leur véhicule et leur note : vous choisissez celui qui vous convient avant de confirmer.",
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
          "Créez un compte client ou connectez-vous, puis ouvrez l'onglet « Expédier mes colis » dans votre tableau de bord.\n\nChoisissez le type de transport (International ou Local), puis, pour l'international, la direction (Europe → Tunisie ou Tunisie → Europe). Renseignez les adresses, la date souhaitée, la description de vos objets et ajoutez des photos ou factures si besoin. Votre demande est envoyée aux transporteurs correspondants ; leurs propositions apparaissent dans « Mes devis colis ».",
      },
      {
        id: "p2",
        question: "Quels trajets sont couverts ?",
        answer:
          "Le service concerne le transport international de colis et marchandises entre l'Europe et la Tunisie, dans les deux sens :\n• Europe → Tunisie\n• Tunisie → Europe\n\nLes adresses sont saisies via l'autocomplétion dédiée à ces zones.\n\nPour une livraison à l'intérieur de la Tunisie, consultez la catégorie « Livraison de colis en Tunisie ».",
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
          "Cliquez sur « Devenir chauffeur / transporteur » depuis l'accueil. À l'inscription, choisissez « Transport de colis international » ou « Transport de colis local » (et « Les deux activités » plus tard depuis votre profil si vous faites aussi du VTC). Un transporteur est soit international, soit local.\n\nComplétez votre profil et vos véhicules : vous recevrez les demandes correspondant à votre type de transport.",
      },
      {
        id: "p7",
        question: "Comment recevoir et répondre aux demandes (transporteur) ?",
        answer:
          "Connectez-vous à votre espace chauffeur/transporteur. Si votre type d'activité inclut le transport de colis, l'onglet « Mes devis de colis » affiche les demandes correspondant à votre type de transport (local ou international).\n\nVous proposez votre prix, un délai estimé et un message. Le client est notifié par email de votre proposition.",
      },
      {
        id: "p8",
        question: "Puis-je être chauffeur VTC et transporteur de colis ?",
        answer:
          "Oui. Depuis votre profil, vous pouvez sélectionner « Les deux activités ». Vous recevrez alors les demandes de courses de personnes et les demandes de devis colis (selon que vous êtes transporteur local ou international), en fonction de votre type de véhicule.",
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
    id: "parcel-local",
    label: "Livraison de colis en Tunisie",
    emoji: "🚚",
    items: [
      {
        id: "pl1",
        question: "Comment faire livrer un colis en Tunisie ?",
        answer:
          "Créez un compte client ou connectez-vous, puis ouvrez l'onglet « Expédier mes colis » et choisissez « Local ».\n\nIndiquez l'adresse de départ et l'adresse de livraison en Tunisie, la date souhaitée et la description de vos objets (photos et factures possibles). Les transporteurs locaux concernés reçoivent votre demande et vous envoient leur prix en TND dans « Mes devis colis ».",
      },
      {
        id: "pl2",
        question: "Quelles zones sont couvertes pour la livraison locale ?",
        answer:
          "Toute la Tunisie, dans les 24 gouvernorats. Les deux adresses doivent se situer en Tunisie : l'autocomplétion est limitée à ce pays.\n\nVotre demande est envoyée aux transporteurs locaux qui couvrent le gouvernorat de l'adresse de départ.",
      },
      {
        id: "pl3",
        question: "Comment est fixé le prix d'une livraison locale ?",
        answer:
          "Chaque transporteur propose librement son tarif en TND. Vous comparez les offres dans votre espace client et acceptez celle qui vous convient ; les autres sont alors automatiquement refusées.\n\nTuniDrive n'impose aucun prix. Plus votre description est précise (poids, volume, étage, photos), plus les offres sont justes.",
      },
      {
        id: "pl4",
        question: "Que puis-je faire livrer en Tunisie ?",
        answer:
          "Des cartons, du mobilier, de l'électroménager, des effets personnels ou des marchandises de commerçants. Indiquez le nombre de colis, le poids et le volume estimés : le transporteur pourra proposer le véhicule adapté.",
      },
      {
        id: "pl5",
        question: "Que se passe-t-il après avoir accepté une offre de livraison ?",
        answer:
          "Le transporteur retenu est notifié par email et vos coordonnées sont échangées pour organiser l'enlèvement et la livraison.\n\nTuniDrive facilite la mise en relation : la livraison est réalisée sous la responsabilité du transporteur, et le contrat et le paiement se font directement entre vous et lui.",
      },
      {
        id: "pl6",
        question: "Quelle différence entre livraison locale et transport international ?",
        answer:
          "• Livraison locale : départ et arrivée en Tunisie, offres en TND, transporteurs locaux de la zone de départ.\n• Transport international : entre l'Europe et la Tunisie, dans les deux sens, offres en EUR (Europe → Tunisie) ou en TND (Tunisie → Europe).\n\nLe fonctionnement est identique : vous décrivez votre envoi, vous recevez des offres, vous choisissez.",
      },
      {
        id: "pl7",
        question: "Comment devenir transporteur local ?",
        answer:
          "Cliquez sur « Devenir chauffeur / transporteur » et choisissez « Transport de colis local ». Complétez votre profil avec votre numéro de permis, ajoutez un véhicule et sélectionnez les gouvernorats que vous couvrez.\n\nVous devez disposer d'un permis valide et de toutes les autorisations nécessaires au transport de marchandises (carte d'exploitation, assurance du véhicule et des marchandises).",
      },
      {
        id: "pl8",
        question: "Puis-je être transporteur local et international ?",
        answer:
          "Non : un transporteur de colis est soit local, soit international. Vous choisissez à l'inscription et pouvez le modifier depuis votre profil.\n\nEn revanche, vous pouvez cumuler le transport de colis avec l'activité VTC (« Les deux activités »).",
      },
      {
        id: "pl9",
        question: "Y a-t-il un abonnement pour être transporteur local ?",
        answer:
          "Non, il n'y a pas d'abonnement. Les mêmes règles que pour les chauffeurs s'appliquent : vos 2 premières courses sont gratuites, puis TuniDrive perçoit une commission de 10 % HT (+ 19 % de TVA) sur les courses terminées chaque mois. Les courses VTC et les livraisons de colis sont comptées ensemble.\n\nUne course est facturée lorsqu'elle est terminée (non annulée). Si vous ne faites aucune course dans le mois, vous ne payez rien.",
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
          "Cliquez sur « Devenir chauffeur / transporteur » depuis la page d'accueil. Choisissez votre type d'activité :\n• Transport de personnes (VTC)\n• Transport de colis local (livraison en Tunisie)\n• Transport de colis international (Europe ↔ Tunisie)\n\nComplétez le formulaire, votre profil, vos véhicules et vos disponibilités. Vous pourrez activer « Les deux activités » depuis votre profil par la suite.",
      },
      {
        id: "d2",
        question: "Comment voir les courses disponibles ?",
        answer:
          "Connectez-vous à votre espace chauffeur. Les demandes des clients qui vous ont choisi apparaissent dans « Mes courses », section « Nouvelles demandes », et vous recevez une notification push.\n\nAcceptez ou refusez chaque demande depuis cette page.",
      },
      {
        id: "d3",
        question: "Comment accepter ou refuser une course ?",
        answer:
          "Lorsqu'une course vous est proposée, une notification s'affiche avec les détails (départ, destination, distance estimée). Vous pouvez l'accepter ou la refuser directement depuis votre tableau de bord. Si vous acceptez, le client est immédiatement notifié.",
      },
      {
        id: "d4",
        question: "Combien coûte la plateforme pour un chauffeur ?",
        answer:
          "Il n'y a pas d'abonnement. TuniDrive perçoit une commission de 10 % HT sur le montant des courses que vous terminez dans le mois, majorée de 19 % de TVA (soit 11,9 % TTC).\n\nExemple : 1 000 TND de courses terminées = 100 TND HT de commission, soit 119 TND TTC à virer.\n\nVos 2 premières courses sont gratuites, et un mois sans course ne coûte rien.",
      },
      {
        id: "d5",
        question: "Comment payer ma commission ?",
        answer:
          "Le 1er de chaque mois, vous recevez par e-mail (et par notification) votre relevé de commission du mois précédent. Réglez le montant TTC par virement bancaire en indiquant la référence du relevé, au plus tard le 7 du mois à 23 h 59 (heure de Tunisie), puis déclarez votre paiement dans la section « Ma commission » de votre tableau de bord (référence ou reçu).\n\nVous restez actif tant que votre paiement déclaré n'est pas refusé. Sans paiement à l'échéance, l'accès aux nouvelles courses est suspendu jusqu'au règlement.",
      },
      {
        id: "d6",
        question: "Combien de courses gratuites ai-je ?",
        answer:
          "Chaque nouveau chauffeur bénéficie de ses 2 premières courses terminées gratuites, une seule fois (courses de personnes et colis confondus). Ensuite, la commission de 10 % HT s'applique aux courses terminées.\n\nCes 2 courses ne limitent pas votre accès : vous pouvez accepter des courses normalement dès votre inscription.",
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
      {
        id: "d9",
        question: "Puis-je annuler une course acceptée ?",
        answer:
          "Oui, tant que la course n'a pas démarré, avec le bouton « Annuler » (ou « Refuser » pour une nouvelle demande). Les annulations tardives ou répétées peuvent entraîner des pénalités. Une fois la course démarrée, contactez le client par téléphone : son numéro est affiché dans la course.",
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
          "Notre équipe support est joignable :\n• WhatsApp : +216 28 528 477\n• Email : support@tunidrive.net\n\nNous répondons généralement sous 24 h ouvrées.",
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
