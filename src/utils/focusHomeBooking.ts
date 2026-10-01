export const HOME_BOOKING_SECTION_ID = 'reserver';
export const HOME_PICKUP_INPUT_ID = 'home-pickup-address';
export const FOCUS_HOME_BOOKING_EVENT = 'tunidrive:focus-home-booking';

function isPickupInput(element: Element | null): element is HTMLInputElement {
  return element instanceof HTMLInputElement && element.id === HOME_PICKUP_INPUT_ID;
}

export function focusHomePickupInput(): boolean {
  const input = document.getElementById(HOME_PICKUP_INPUT_ID);
  if (!isPickupInput(input) || input.disabled) return false;

  const active = document.activeElement;
  const canMoveFocus =
    !active ||
    active === document.body ||
    active === input ||
    active.tagName === 'BUTTON' ||
    active.tagName === 'A';

  if (!canMoveFocus) return false;

  input.focus({ preventScroll: true });
  return document.activeElement === input;
}

/** Amène le formulaire de réservation à l’écran et demande le focus sur le lieu de prise en charge. */
export function focusHomeBookingForm() {
  const section = document.getElementById(HOME_BOOKING_SECTION_ID);
  if (section) {
    const rect = section.getBoundingClientRect();
    const headerOffset = 80;
    const fullyVisible = rect.top >= headerOffset && rect.bottom <= window.innerHeight - 8;
    if (!fullyVisible) {
      section.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  focusHomePickupInput();
  window.dispatchEvent(new Event(FOCUS_HOME_BOOKING_EVENT));
}
