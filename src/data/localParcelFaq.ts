export interface LocalParcelFaqItem {
  id: string;
  question: string;
  answer: string;
}

export const localParcelFaqItems: LocalParcelFaqItem[] = [
  {
    id: 'lp1',
    question: 'Comment faire livrer un colis en Tunisie avec TuniDrive ?',
    answer:
      "Créez un compte client gratuit, ouvrez l'onglet Transport colis et choisissez « Local ». Indiquez l'adresse de départ et l'adresse de livraison en Tunisie, la date souhaitée et la description de vos objets. Les transporteurs locaux concernés reçoivent votre demande et vous envoient leur prix en dinars tunisiens (TND). Vous choisissez l'offre qui vous convient.",
  },
  {
    id: 'lp2',
    question: 'Quelles zones sont couvertes ?',
    answer:
      "Toute la Tunisie, dans les 24 gouvernorats. Votre demande est envoyée aux transporteurs locaux qui couvrent le gouvernorat de l'adresse de départ. Pour un envoi entre l'Europe et la Tunisie, utilisez plutôt le service de transport international.",
  },
  {
    id: 'lp3',
    question: 'Comment le prix de la livraison est-il fixé ?',
    answer:
      "Chaque transporteur propose librement son tarif en TND après avoir lu votre demande. TuniDrive n'impose pas de prix : vous comparez les offres et vous choisissez. Des photos et des dimensions précises permettent d'obtenir des offres plus justes.",
  },
  {
    id: 'lp4',
    question: 'Que puis-je faire livrer ?',
    answer:
      "Des cartons, du mobilier, de l'électroménager, des effets personnels ou des marchandises de commerçants. Précisez le nombre de colis, le poids et le volume estimés, et ajoutez des photos ou des factures si vous le pouvez : le transporteur pourra mieux choisir son véhicule.",
  },
  {
    id: 'lp5',
    question: 'Qui est responsable de la livraison ?',
    answer:
      "TuniDrive met en relation des clients avec des transporteurs indépendants. La livraison est réalisée sous la seule responsabilité du transporteur, qui doit disposer d'un permis valide et des autorisations nécessaires au transport de marchandises. TuniDrive n'assure ni le transport ni l'exploitation des véhicules.",
  },
  {
    id: 'lp6',
    question: 'Comment devenir transporteur local ?',
    answer:
      "Inscrivez-vous via « Devenir chauffeur / transporteur » et choisissez « Transport de colis local ». Complétez votre profil avec votre numéro de permis, ajoutez un véhicule et sélectionnez les gouvernorats que vous couvrez pour recevoir les demandes correspondantes.",
  },
];

export const localParcelFaqItemsEn: LocalParcelFaqItem[] = [
  {
    id: 'lp1',
    question: 'How do I get a parcel delivered in Tunisia with TuniDrive?',
    answer:
      'Create a free rider account, open the Parcel transport tab and choose "Local". Enter the pickup and delivery addresses in Tunisia, the date you want and a description of your items. Matching local carriers receive your request and send you their price in Tunisian dinars (TND). You choose the offer that suits you.',
  },
  {
    id: 'lp2',
    question: 'Which areas are covered?',
    answer:
      'All of Tunisia, across the 24 governorates. Your request is sent to local carriers who cover the governorate of the pickup address. For a shipment between Europe and Tunisia, use the international parcel service instead.',
  },
  {
    id: 'lp3',
    question: 'How is the delivery price set?',
    answer:
      'Each carrier freely proposes their own price in TND after reading your request. TuniDrive does not impose a price: you compare offers and choose. Photos and accurate sizes help you get fairer offers.',
  },
  {
    id: 'lp4',
    question: 'What can I have delivered?',
    answer:
      'Boxes, furniture, appliances, personal belongings or goods from shops. State the number of parcels and the estimated weight and volume, and add photos or invoices if you can: the carrier can then choose the right vehicle.',
  },
  {
    id: 'lp5',
    question: 'Who is responsible for the delivery?',
    answer:
      'TuniDrive connects customers with independent carriers. The delivery is carried out under the sole responsibility of the carrier, who must hold a valid licence and every authorisation required to carry goods. TuniDrive does not operate the transport or the vehicles.',
  },
  {
    id: 'lp6',
    question: 'How do I become a local carrier?',
    answer:
      'Sign up through "Become a driver / carrier" and choose "Local parcel delivery". Complete your profile with your licence number, add a vehicle and select the governorates you cover to receive matching requests.',
  },
];
