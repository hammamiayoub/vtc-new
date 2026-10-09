import type { FaqCategory } from './faqData';

export const faqCategoriesEn: FaqCategory[] = [
  {
    id: 'client',
    label: 'I am a rider',
    emoji: '🧳',
    items: [
      {
        id: 'c1',
        question: 'How do I book a ride?',
        answer:
          'Sign in to your rider space, then click Book a ride. Enter your pickup address, destination and vehicle type. Confirm the booking: a driver is assigned and you receive a notification.',
      },
      {
        id: 'c2',
        question: 'How do I cancel or change a booking?',
        answer:
          'From your dashboard, open the ride in My rides. Select Cancel or contact support. Cancel as early as you can so the driver is not left waiting.',
      },
      {
        id: 'c3',
        question: 'How much does a ride cost?',
        answer:
          'TuniDrive fares include:\n• Pickup fee by driver distance: 10 TND (< 10 km), 20 TND (10–30 km), 30 TND (30–50 km), 50 TND (50 km+)\n• 0–15 km: 1.53 TND/km\n• 15–50 km: 1.98 TND/km\n• 50–100 km: 1.71 TND/km\n• 100–250 km: 1.35 TND/km\n• 250+ km: 1.08 TND/km\n• Minimum price: 14.40 TND\n• Vehicle multipliers: Van ×1.875 · Minibus ×3.125 · Bus ×4.375\n\nThe per-km rate is progressive. The estimated price is shown before you confirm.',
      },
      {
        id: 'c4',
        question: 'How do I pay for my ride?',
        answer:
          'You pay the driver at the end of the ride. Accepted methods (cash, card, transfer) are shown when you book.',
      },
      {
        id: 'c5',
        question: 'How do I track my ride?',
        answer:
          'Once a driver is assigned, you receive notifications. You can also follow the ride from your rider dashboard.',
      },
      {
        id: 'c6',
        question: 'How do I create a rider account?',
        answer:
          'Click Book a ride, then Create an account. Enter your name, email and password. You will receive a confirmation email to activate the account.',
      },
      {
        id: 'c7',
        question: 'I forgot my password. What should I do?',
        answer:
          'On the login page, click Forgot password. Enter your email and you will receive a reset link within a few minutes.',
      },
      {
        id: 'c8',
        question: 'How do I rate my driver?',
        answer:
          'At the end of the ride, a rating window opens. You can give 1 to 5 stars and leave a comment.',
      },
      {
        id: 'c9',
        question: 'Can I also send parcels with TuniDrive?',
        answer:
          'Yes. Besides private rides, TuniDrive offers international parcel and goods transport between Europe and Tunisia.\n\nSign in, open Parcel transport, and submit a quote request.',
      },
    ],
  },
  {
    id: 'parcel',
    label: 'Parcel transport',
    emoji: '📦',
    items: [
      {
        id: 'p1',
        question: 'How do I request a parcel quote?',
        answer:
          'Create a rider account or sign in, then open Parcel transport in your dashboard.\n\nSet the direction (Europe → Tunisia or Tunisia → Europe), the addresses, the date, a description of your items, and add photos or invoices if you have them. The request is sent to matching carriers.',
      },
      {
        id: 'p2',
        question: 'Which routes are covered?',
        answer:
          'The service covers international parcels and goods between Europe and Tunisia, both ways:\n• Europe → Tunisia\n• Tunisia → Europe\n\nAddresses are entered with autocomplete for those areas.',
      },
      {
        id: 'p3',
        question: 'How are prices set?',
        answer:
          'Partner carriers send their own offers. You compare them in your account and accept the one you want.\n\nThe other offers are then declined automatically. The price is in EUR for Europe → Tunisia and in TND for Tunisia → Europe.',
      },
      {
        id: 'p4',
        question: 'Can I attach photos or invoices?',
        answer:
          'Yes. When you create a request you can add photos of your parcels and documents so carriers can quote accurately.',
      },
      {
        id: 'p5',
        question: 'What happens after I accept a quote?',
        answer:
          'The carrier is notified by email. Contact details can then be exchanged to arrange pickup and delivery.\n\nTuniDrive makes the introduction: the contract and payment are directly between you and the carrier.',
      },
      {
        id: 'p6',
        question: 'How do I become a parcel carrier?',
        answer:
          'Click Become a driver / carrier on the homepage. During signup, choose Parcel transport (or Both activities later from your profile).\n\nComplete your profile, vehicles and availability to receive matching requests.',
      },
      {
        id: 'p7',
        question: 'How do carriers reply to requests?',
        answer:
          'Sign in to the driver/carrier space. If your activity includes parcels, the Parcel requests tab lists requests that match your availability.\n\nYou propose a price, an estimated time and a message. The client is notified by email.',
      },
      {
        id: 'p8',
        question: 'Can I be both a private driver and a parcel carrier?',
        answer:
          'Yes. From your profile you can select Both activities. You then receive ride requests and international parcel requests, according to your availability and vehicle.',
      },
      {
        id: 'p9',
        question: 'Can a quote request expire?',
        answer:
          'Yes. If no offer is accepted in time, the request can expire. You can submit a new one at any time from your rider space.',
      },
    ],
  },
  {
    id: 'driver',
    label: 'I am a driver',
    emoji: '🚗',
    items: [
      {
        id: 'd1',
        question: 'How do I sign up as a driver or carrier?',
        answer:
          'Click Become a driver / carrier on the homepage. Choose your activity:\n• Passenger transport (private hire)\n• Parcel transport (Europe ↔ Tunisia)\n\nComplete the form, your profile, vehicles and availability. You can switch to Both activities later from your profile.',
      },
      {
        id: 'd2',
        question: 'How do I see available rides?',
        answer:
          'Sign in to the driver space. Available rides in your area appear on the dashboard. You also receive a notification when a new ride is offered.',
      },
      {
        id: 'd3',
        question: 'How do I accept or decline a ride?',
        answer:
          'When a ride is offered, you see the pickup, destination and estimated distance. Accept or decline it from the dashboard. If you accept, the rider is notified.',
      },
      {
        id: 'd4',
        question: 'How much is the driver subscription?',
        answer:
          'The premium plan is:\n• Monthly: 30 TND excl. tax / month (about 35.70 TND incl. 19% VAT)\n• Yearly: 10% off the monthly price\n\nWithout a subscription you get a limited number of free rides to try the platform.',
      },
      {
        id: 'd5',
        question: 'How do I pay the subscription?',
        answer:
          'Payment is by bank transfer. From the dashboard, open Subscription, choose monthly or yearly, and follow the payment instructions. The plan is activated once our team confirms the transfer.',
      },
      {
        id: 'd6',
        question: 'How many free rides do I get without a subscription?',
        answer:
          'Each new driver gets 3 free rides in total (one-time offer, not reset every month).\n\nAfter those 3 rides, the Premium plan is required to accept new rides.',
      },
      {
        id: 'd7',
        question: 'How do I update my profile or vehicles?',
        answer:
          'From the dashboard, open My profile for personal details or My vehicles to add, edit or remove a vehicle.',
      },
      {
        id: 'd8',
        question: 'How do I manage my availability?',
        answer:
          'Use the availability calendar on the dashboard to set your working slots. You can turn availability on or off at any time.',
      },
    ],
  },
  {
    id: 'general',
    label: 'General questions',
    emoji: '💬',
    items: [
      {
        id: 'g1',
        question: 'What is TuniDrive?',
        answer:
          'TuniDrive is a mobility platform that connects:\n• riders and drivers for private rides in Tunisia;\n• clients and carriers for parcel quotes between Europe and Tunisia.\n\nTuniDrive is a technical intermediary: the service is provided by independent partners.',
      },
      {
        id: 'g2',
        question: 'Which cities do you cover?',
        answer:
          'TuniDrive operates in the main cities of Tunisia. Available areas are shown when you book. Contact support for a specific request outside the usual area.',
      },
      {
        id: 'g3',
        question: 'Is there a mobile app?',
        answer:
          'Yes. The TuniDrive app is on the App Store (iPhone) and Google Play (Android). Book rides, follow parcel quotes and manage a driver or carrier activity with live notifications.',
      },
      {
        id: 'g6',
        question: 'What is the difference between a ride and a parcel quote?',
        answer:
          'A ride is passenger transport in Tunisia: you book a trip with a driver and see the fare before you confirm.\n\nA parcel quote is for goods between Europe and Tunisia: you submit a request, several carriers propose a price, and you choose one.',
      },
      {
        id: 'g4',
        question: 'How do I contact support?',
        answer:
          'You can reach support:\n• WhatsApp: +216 28 528 477\n• Email: support@tunidrive.net\n\nWe usually reply within one business day.',
      },
      {
        id: 'g5',
        question: 'Are my personal data protected?',
        answer:
          'Yes. TuniDrive protects your data as described in the privacy policy. Your information is never sold to third parties.',
      },
    ],
  },
];
