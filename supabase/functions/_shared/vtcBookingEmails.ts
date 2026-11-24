import { renderEmail, greeting, paragraph, infoCard, notice, bulletList, button, SITE_URL } from './emailLayout.ts'

/**
 * E-mails d'une nouvelle réservation (client, chauffeur, support), partagés par
 * send-booking-notification et resend-email. Toutes les valeurs sont échappées par emailLayout.
 */

interface PersonData {
  first_name?: string
  last_name?: string
  email?: string
  phone?: string
  city?: string
  vehicle_info?: {
    make?: string
    model?: string
    color?: string
    licensePlate?: string
    year?: number | string
  } | null
}

interface BookingData {
  id?: string
  pickup_address?: string
  destination_address?: string
  distance_km?: number | string
  price_tnd?: number | string
  notes?: string
  status?: string
}

function fullName(p: PersonData): string {
  return `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim()
}

function vehicleLabel(p: PersonData): string {
  const v = p.vehicle_info
  if (!v) return ''
  const base = `${v.make ?? ''} ${v.model ?? ''}`.trim()
  return v.color ? `${base} (${v.color})`.trim() : base
}

function tripRows(booking: BookingData, formattedDate: string, notesLabel: string) {
  return [
    { label: 'Départ', value: booking.pickup_address },
    { label: 'Arrivée', value: booking.destination_address },
    { label: 'Date et heure', value: formattedDate },
    { label: 'Distance', value: booking.distance_km !== undefined ? `${booking.distance_km} km` : '' },
    { label: 'Prix', value: booking.price_tnd !== undefined ? `${booking.price_tnd} TND` : '' },
    { label: notesLabel, value: booking.notes },
  ]
}

export function buildBookingEmails(args: {
  bookingData: BookingData
  clientData: PersonData
  driverData: PersonData
  formattedDate: string
}): { client: string; driver: string; support: string } {
  const { bookingData, clientData, driverData, formattedDate } = args

  const client = renderEmail({
    title: 'Votre réservation est confirmée',
    preheader: `${formattedDate} — ${bookingData.pickup_address ?? ''} → ${bookingData.destination_address ?? ''}`,
    body: [
      greeting(fullName(clientData)),
      paragraph('Bonne nouvelle : votre réservation est bien enregistrée. Voici le récapitulatif de votre course.'),
      infoCard('Votre course', tripRows(bookingData, formattedDate, 'Notes'), 'success'),
      infoCard('Votre chauffeur', [
        { label: 'Nom', value: fullName(driverData) },
        { label: 'Téléphone', value: driverData.phone, href: driverData.phone ? `tel:${driverData.phone}` : undefined },
        { label: 'Véhicule', value: vehicleLabel(driverData) },
        { label: 'Plaque', value: driverData.vehicle_info?.licensePlate },
      ], 'info'),
      notice('<strong>À savoir :</strong> soyez prêt 5 minutes avant l\'heure prévue. Votre chauffeur vous contactera si nécessaire.', 'warning'),
      button('Suivre ma réservation', `${SITE_URL}/client-dashboard`),
      paragraph('Merci de faire confiance à TuniDrive pour vos déplacements.'),
    ].join(''),
  })

  const driver = renderEmail({
    title: 'Nouvelle réservation reçue',
    preheader: `${formattedDate} — ${bookingData.pickup_address ?? ''} → ${bookingData.destination_address ?? ''}`,
    body: [
      greeting(fullName(driverData)),
      paragraph('Vous avez reçu une nouvelle demande de réservation.'),
      infoCard('Détails de la course', tripRows(bookingData, formattedDate, 'Notes du client'), 'success'),
      infoCard('Votre client', [
        { label: 'Nom', value: fullName(clientData) },
        { label: 'Téléphone', value: clientData.phone, href: clientData.phone ? `tel:${clientData.phone}` : undefined },
      ], 'info'),
      notice('<strong>Action requise :</strong> connectez-vous à votre tableau de bord pour accepter ou refuser cette réservation.', 'warning'),
      button('Ouvrir mon tableau de bord', `${SITE_URL}/dashboard`),
    ].join(''),
  })

  const support = renderEmail({
    title: 'Nouvelle réservation créée',
    preheader: `${fullName(clientData)} → ${fullName(driverData)} — ${formattedDate}`,
    body: [
      paragraph('Une nouvelle réservation a été créée, et les e-mails de confirmation ont été envoyés aux deux parties.'),
      infoCard('Réservation', [
        { label: 'Identifiant', value: bookingData.id || 'N/A' },
        ...tripRows(bookingData, formattedDate, 'Notes du client'),
        { label: 'Statut', value: bookingData.status || 'En attente' },
      ], 'success'),
      infoCard('Client', [
        { label: 'Nom', value: fullName(clientData) },
        { label: 'E-mail', value: clientData.email },
        { label: 'Téléphone', value: clientData.phone },
        { label: 'Ville', value: clientData.city || 'Non renseignée' },
      ], 'info'),
      infoCard('Chauffeur', [
        { label: 'Nom', value: fullName(driverData) },
        { label: 'E-mail', value: driverData.email },
        { label: 'Téléphone', value: driverData.phone },
        { label: 'Ville', value: driverData.city || 'Non renseignée' },
        { label: 'Véhicule', value: `${driverData.vehicle_info?.make ?? ''} ${driverData.vehicle_info?.model ?? ''}`.trim() },
        { label: 'Plaque', value: driverData.vehicle_info?.licensePlate },
        { label: 'Année', value: driverData.vehicle_info?.year },
        { label: 'Couleur', value: driverData.vehicle_info?.color },
      ], 'warning'),
      notice(`<strong>Actions effectuées</strong>${bulletList([
        'E-mail de confirmation envoyé au client.',
        'E-mail de notification envoyé au chauffeur.',
        'Réservation enregistrée dans la base de données.',
      ])}`, 'neutral'),
      button('Ouvrir l\'administration', `${SITE_URL}/admin`),
    ].join(''),
    footnote: 'Notification interne envoyée à chaque nouvelle réservation.',
  })

  return { client, driver, support }
}
