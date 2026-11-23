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
          'Sign in to your rider space and open the New booking tab. Enter your pickup address, destination, date and vehicle type. The estimated price appears, followed by the list of available drivers: pick the one you like and confirm.\n\nThe driver then has to accept the ride; you are notified as soon as they do.',
      },
      {
        id: 'c2',
        question: 'How do I cancel or change a booking?',
        answer:
          'From My bookings, open the ride and click Cancel. Online cancellation is possible up to 24 hours before the scheduled time, while the ride is pending or accepted.\n\nAfter that, contact the driver directly (their number is shown on the ride) or support. To change the time or address, cancel and book again, or write to us.',
      },
      {
        id: 'c3',
        question: 'How much does a ride cost?',
        answer:
          'TuniDrive fares include:\n• Pickup fee by driver distance: 3 TND (< 10 km), 6 TND (10–30 km), 10 TND (30–50 km), 15 TND (50 km+)\n• 0–15 km: 1.00 TND/km\n• 15–50 km: 0.90 TND/km\n• 50–100 km: 0.85 TND/km\n• 100–250 km: 0.80 TND/km\n• 250+ km: 0.75 TND/km\n• Minimum price: 8 TND\n• Vehicle multipliers: Van ×1.875 · Minibus ×3.125 · Bus ×4.375\n• Surcharges: +15% at night (9 pm–6 am) and +10% on weekends, cumulative\n• Return trip: the distance is doubled\n\nThe per-km rate is progressive: each band is charged separately. The estimated price is shown before you confirm.',
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
          'Yes. Besides private rides, TuniDrive offers international parcel and goods transport between Europe and Tunisia.\n\nSign in, open the Ship parcels tab and submit a quote request. You then follow the offers you receive in Parcel quotes.',
      },
      {
        id: 'c10',
        question: 'Are there surcharges (night, weekend, return trip)?',
        answer:
          'Yes, three things can change the price:\n• Night (9 pm to 6 am): +15%\n• Weekend (Saturday and Sunday): +10%, cumulative with the night surcharge\n• Return trip: the distance is counted twice\n\nThe final price, surcharges included, is shown before you confirm the booking.',
      },
      {
        id: 'c11',
        question: 'Why can\'t I book a van or minibus for a short trip?',
        answer:
          'For vehicles other than Taxi, the minimum one-way distance is 20 km. Below that, the booking is blocked: increase the trip distance or choose Taxi for short rides.',
      },
      {
        id: 'c12',
        question: 'Can I choose my driver?',
        answer:
          'Yes. After you enter your trip, the list of available drivers appears with their vehicle and rating: you pick the one you like before confirming.',
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
          'Create a rider account or sign in, then open the Ship parcels tab in your dashboard.\n\nChoose the type of transport (International or Local) and, for international, the direction (Europe → Tunisia or Tunisia → Europe). Enter the addresses, the date, a description of your items, and add photos or invoices if you have them. The request is sent to matching carriers; their offers appear in Parcel quotes.',
      },
      {
        id: 'p2',
        question: 'Which routes are covered?',
        answer:
          'The service covers international parcels and goods between Europe and Tunisia, both ways:\n• Europe → Tunisia\n• Tunisia → Europe\n\nAddresses are entered with autocomplete for those areas.\n\nFor a delivery within Tunisia, see the Parcel delivery in Tunisia category.',
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
          'Click Become a driver / carrier on the homepage. During signup, choose International parcel transport or Local parcel delivery (and Both activities later from your profile if you also drive passengers). A carrier is either international or local.\n\nComplete your profile and vehicles to receive the requests that match your type of transport.',
      },
      {
        id: 'p7',
        question: 'How do carriers reply to requests?',
        answer:
          'Sign in to the driver/carrier space. If your activity includes parcels, the Parcel quotes tab lists requests that match your type of transport (local or international).\n\nYou propose a price, an estimated time and a message. The client is notified by email.',
      },
      {
        id: 'p8',
        question: 'Can I be both a private driver and a parcel carrier?',
        answer:
          'Yes. From your profile you can select Both activities. You then receive ride requests and parcel requests (depending on whether you are a local or international carrier), according to your vehicle.',
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
    id: 'parcel-local',
    label: 'Parcel delivery in Tunisia',
    emoji: '🚚',
    items: [
      {
        id: 'pl1',
        question: 'How do I get a parcel delivered in Tunisia?',
        answer:
          'Create a rider account or sign in, open the Ship parcels tab and choose Local.\n\nEnter the pickup and delivery addresses in Tunisia, the date and a description of your items (photos and invoices welcome). Matching local carriers receive your request and send their price in TND under Parcel quotes.',
      },
      {
        id: 'pl2',
        question: 'Which areas are covered for local delivery?',
        answer:
          'All of Tunisia, across the 24 governorates. Both addresses must be in Tunisia: autocomplete is limited to that country.\n\nYour request is sent to local carriers who cover the governorate of the pickup address.',
      },
      {
        id: 'pl3',
        question: 'How is the price of a local delivery set?',
        answer:
          'Each carrier freely proposes a price in TND. You compare the offers in your account and accept the one you want; the others are then declined automatically.\n\nTuniDrive does not impose any price. The more precise your description (weight, volume, floor, photos), the fairer the offers.',
      },
      {
        id: 'pl4',
        question: 'What can I have delivered in Tunisia?',
        answer:
          'Boxes, furniture, appliances, personal belongings or shop goods. State the number of parcels and the estimated weight and volume: the carrier can then offer the right vehicle.',
      },
      {
        id: 'pl5',
        question: 'What happens after I accept a delivery offer?',
        answer:
          'The chosen carrier is notified by email and contact details are exchanged to arrange pickup and delivery.\n\nTuniDrive makes the introduction: the delivery is carried out under the carrier\'s responsibility, and the contract and payment are directly between you and the carrier.',
      },
      {
        id: 'pl6',
        question: 'What is the difference between local delivery and international transport?',
        answer:
          '• Local delivery: pickup and delivery in Tunisia, offers in TND, local carriers from the pickup area.\n• International transport: between Europe and Tunisia, both ways, offers in EUR (Europe → Tunisia) or TND (Tunisia → Europe).\n\nIt works the same way: you describe your shipment, receive offers and choose.',
      },
      {
        id: 'pl7',
        question: 'How do I become a local carrier?',
        answer:
          'Click Become a driver / carrier and choose Local parcel delivery. Complete your profile with your licence number, add a vehicle and select the governorates you cover.\n\nYou must hold a valid licence and every authorisation required to carry goods (operating permit, vehicle and goods insurance).',
      },
      {
        id: 'pl8',
        question: 'Can I be both a local and an international carrier?',
        answer:
          'No: a parcel carrier is either local or international. You choose at signup and can change it from your profile.\n\nYou can, however, combine parcel transport with private-hire driving (Both activities).',
      },
      {
        id: 'pl9',
        question: 'Do I need a subscription to be a local carrier?',
        answer:
          'The same rules as for drivers apply: 2 free rides in total, then the Pro plan. Private-hire rides and parcel deliveries share that allowance.\n\nA ride is counted when a client accepts your offer. Sending offers is blocked once the allowance is used up without an active subscription.',
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
          'Click Become a driver / carrier on the homepage. Choose your activity:\n• Passenger transport (private hire)\n• Local parcel delivery (within Tunisia)\n• International parcel transport (Europe ↔ Tunisia)\n\nComplete the form, your profile, vehicles and availability. You can switch to Both activities later from your profile.',
      },
      {
        id: 'd2',
        question: 'How do I see available rides?',
        answer:
          'Sign in to the driver space. Requests from clients who chose you appear in My rides, under New requests, and you receive a push notification.\n\nAccept or decline each request from that page.',
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
          'The Pro plan is:\n• Monthly: 30 TND excl. tax / month (about 35.70 TND incl. 19% VAT)\n• Yearly: 10% off the monthly price\n\nWithout a subscription you get a limited number of free rides to try the platform.',
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
          'Each new driver gets 2 free rides in total (one-time offer, not reset every month).\n\nAfter those 2 rides, the Pro plan is required to accept new rides.\n\nParcel deliveries count too: a ride is counted when a client accepts your offer.',
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
      {
        id: 'd9',
        question: 'Can I cancel a ride I accepted?',
        answer:
          'Yes, up to 24 hours before the scheduled time, with the Cancel button (or Decline for a new request). After that, call the client: their number is shown on the ride.',
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
