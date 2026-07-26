export type BookingCancellationReasonId =
  | 'low_price'
  | 'unavailable'
  | 'too_far'
  | 'schedule_conflict'
  | 'vehicle_issue'
  | 'other';

export const DRIVER_BOOKING_CANCELLATION_REASONS: Array<{
  id: BookingCancellationReasonId;
  label: string;
}> = [
  { id: 'low_price', label: 'Tarif bas' },
  { id: 'unavailable', label: 'Indisponibilité' },
  { id: 'too_far', label: 'Distance trop longue' },
  { id: 'schedule_conflict', label: "Conflit d'horaire" },
  { id: 'vehicle_issue', label: 'Problème avec le véhicule' },
  { id: 'other', label: 'Autre' },
];

export function getBookingCancellationReasonLabel(id: BookingCancellationReasonId): string {
  return DRIVER_BOOKING_CANCELLATION_REASONS.find(r => r.id === id)?.label ?? id;
}

export function resolveBookingCancellationReasonText(
  reasonId: BookingCancellationReasonId | '',
  customReason?: string
): string | null {
  if (!reasonId) return null;
  if (reasonId === 'other') {
    const trimmed = customReason?.trim();
    return trimmed || null;
  }
  return getBookingCancellationReasonLabel(reasonId);
}

export function appendCancellationReasonToNotes(existingNotes: string | undefined, reasonText: string): string {
  const notesWithoutReason = (existingNotes ?? '')
    .replace(/REJECTION_REASON:\s*[^\n]+\n?/gi, '')
    .replace(/Raison du refus:\s*[^\n]+\n?/gi, '')
    .replace(/Raison de l'annulation:\s*[^\n]+\n?/gi, '')
    .trim();

  return notesWithoutReason
    ? `Raison de l'annulation: ${reasonText}\n\n${notesWithoutReason}`
    : `Raison de l'annulation: ${reasonText}`;
}
