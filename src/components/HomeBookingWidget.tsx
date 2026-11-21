import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, LocateFixed } from 'lucide-react';
import { Button } from './ui/Button';
import { Alert } from './ui/Alert';
import { BookingSteps } from './ui/BookingSteps';
import AddressAutocomplete from './AddressAutocomplete';
import {
  calculateDrivingDistance,
  calculatePriceWithSurcharges,
  Coordinates,
  RIDE_DEFAULT_PICKUP_FARE_TND,
  getDriverPickupFareSummaryText,
} from '../utils/geolocation';
import { resolveCurrentPickup } from '../utils/currentPickup';
import { savePendingQuote } from '../utils/pendingQuote';
import { toLocalDateTimeInputValue } from '../utils/dateTimeInput';
import {
  FOCUS_HOME_BOOKING_EVENT,
  focusHomeBookingForm,
  focusHomePickupInput,
} from '../utils/focusHomeBooking';
import { useLocale } from '../i18n/locale';
import { cn } from '../utils/cn';
import { usePricingGridVersion } from '../utils/pricingConfig';

interface HomeBookingWidgetProps {
  onClientLogin: () => void;
  onClientSignup: () => void;
}

type DepartureMode = 'now' | 'later';

function formatTnd(amount: number, locale: 'fr' | 'en'): string {
  // Montants entiers sans décimales (« 252 TND », « 10 TND »), sinon deux décimales.
  const value = amount.toFixed(Number.isInteger(amount) ? 0 : 2);
  return `${locale === 'en' ? value : value.replace('.', ',')} TND`;
}

/** Départ proposé par défaut : dans une heure, arrondi au quart d'heure suivant. */
function defaultScheduledValue(): string {
  const date = new Date(Date.now() + 60 * 60 * 1000);
  date.setMinutes(Math.ceil(date.getMinutes() / 15) * 15, 0, 0);
  return toLocalDateTimeInputValue(date);
}

const addressInputClass =
  'w-full pl-10 pr-4 h-14 rounded-xl bg-surface-muted border border-transparent focus:bg-white focus:ring-2 focus:ring-gray-900 focus:border-gray-900 disabled:bg-gray-100 disabled:cursor-not-allowed text-base';

export const HomeBookingWidget: React.FC<HomeBookingWidgetProps> = ({
  onClientLogin,
  onClientSignup,
}) => {
  const pricingGridVersion = usePricingGridVersion(); // recalcule le prix quand la grille de la base change
  const { locale } = useLocale();
  const en = locale === 'en';
  const money = (amount: number) => formatTnd(amount, locale);
  const [pickupAddress, setPickupAddress] = useState('');
  const [destinationAddress, setDestinationAddress] = useState('');
  const [pickupCoords, setPickupCoords] = useState<Coordinates | null>(null);
  const [destinationCoords, setDestinationCoords] = useState<Coordinates | null>(null);
  const [departureMode, setDepartureMode] = useState<DepartureMode>('now');
  const [scheduledAt, setScheduledAt] = useState('');
  const [isCalculating, setIsCalculating] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [autocompleteHint, setAutocompleteHint] = useState<string | null>(null);
  const [pickupHighlighted, setPickupHighlighted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let retryTimer = 0;
    let highlightTimer = 0;

    const highlightAndFocus = () => {
      window.clearTimeout(highlightTimer);
      setPickupHighlighted(true);
      highlightTimer = window.setTimeout(() => {
        if (!cancelled) setPickupHighlighted(false);
      }, 2600);

      const tryFocus = (attempt: number) => {
        if (cancelled) return;
        if (focusHomePickupInput()) return;
        if (attempt < 40) {
          retryTimer = window.setTimeout(() => tryFocus(attempt + 1), 150);
        }
      };
      tryFocus(0);
    };

    const onHash = () => {
      if (window.location.hash !== '#reserver') return;
      focusHomeBookingForm();
    };

    window.addEventListener(FOCUS_HOME_BOOKING_EVENT, highlightAndFocus);
    window.addEventListener('hashchange', onHash);
    if (window.location.hash === '#reserver') {
      highlightAndFocus();
      document.getElementById('reserver')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    return () => {
      cancelled = true;
      window.clearTimeout(retryTimer);
      window.clearTimeout(highlightTimer);
      window.removeEventListener(FOCUS_HOME_BOOKING_EVENT, highlightAndFocus);
      window.removeEventListener('hashchange', onHash);
    };
  }, []);

  // Heure de départ retenue pour le tarif : l'heure planifiée si elle est valide, sinon maintenant.
  const scheduledDate = useMemo(() => {
    if (departureMode !== 'later' || !scheduledAt) return null;
    const date = new Date(scheduledAt);
    return Number.isNaN(date.getTime()) ? null : date;
  }, [departureMode, scheduledAt]);

  // Même règle que le formulaire de réservation : suppléments nuit / week-end inclus,
  // prix arrondi au dinar supérieur.
  const quote = useMemo(
    () =>
      distanceKm === null
        ? null
        : calculatePriceWithSurcharges(distanceKm, 'sedan', scheduledDate ?? new Date()),
    [distanceKm, scheduledDate, pricingGridVersion],
  );
  const estimatedPrice = quote?.finalPrice ?? null;

  // Le devis affiché est conservé pour être repris après la création du compte ou la connexion.
  useEffect(() => {
    if (distanceKm === null || estimatedPrice === null || !pickupCoords || !destinationCoords) return;
    savePendingQuote({
      pickupAddress: pickupAddress.trim(),
      destinationAddress: destinationAddress.trim(),
      pickupCoords: { latitude: pickupCoords.latitude, longitude: pickupCoords.longitude },
      destinationCoords: {
        latitude: destinationCoords.latitude,
        longitude: destinationCoords.longitude,
      },
      distanceKm,
      estimatedPrice,
      vehicleType: 'sedan',
      scheduledTime: scheduledDate ? scheduledAt : undefined,
    });
    // Les adresses ne changent pas tant qu'un devis est affiché : toute saisie le réinitialise.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [distanceKm, estimatedPrice, scheduledDate, scheduledAt]);

  const resetQuote = () => {
    setDistanceKm(null);
    setError(null);
  };

  const handlePickupChange = (value: string) => {
    setPickupAddress(value);
    setPickupCoords(null);
    resetQuote();
    if (value.trim() && !pickupCoords) {
      setAutocompleteHint(en ? 'Select the pickup place from the suggestions.' : 'Sélectionnez le lieu de départ dans la liste de suggestions.');
    } else {
      setAutocompleteHint(null);
    }
  };

  const handleDestinationChange = (value: string) => {
    setDestinationAddress(value);
    setDestinationCoords(null);
    resetQuote();
    if (value.trim() && !destinationCoords) {
      setAutocompleteHint(en ? 'Select the destination from the suggestions.' : 'Sélectionnez la destination dans la liste de suggestions.');
    } else {
      setAutocompleteHint(null);
    }
  };

  const handleUseMyLocation = async () => {
    setIsLocating(true);
    setError(null);
    try {
      const pickup = await resolveCurrentPickup();
      if (pickup.countryCode !== null && pickup.countryCode !== 'tn') {
        setError(
          en
            ? 'Your current position is outside Tunisia. Enter the pickup place instead.'
            : 'Votre position actuelle est hors de Tunisie. Saisissez le lieu de prise en charge.',
        );
        return;
      }
      setPickupAddress(pickup.label);
      setPickupCoords(pickup.coords);
      setAutocompleteHint(null);
      setDistanceKm(null);
    } catch {
      setError(
        en
          ? 'We could not get your position. Enter the pickup place instead.'
          : "Impossible d'obtenir votre position. Saisissez le lieu de prise en charge.",
      );
    } finally {
      setIsLocating(false);
    }
  };

  const handleDepartureModeChange = (mode: DepartureMode) => {
    setDepartureMode(mode);
    if (mode === 'later' && !scheduledAt) setScheduledAt(defaultScheduledValue());
  };

  const handleVoirPrix = async () => {
    setError(null);

    if (!pickupAddress.trim() || !destinationAddress.trim()) {
      setError(en ? 'Enter a pickup place and a destination.' : 'Veuillez renseigner le lieu de prise en charge et la destination.');
      return;
    }

    if (!pickupCoords || !destinationCoords) {
      setError(en ? 'Select each address from the suggestions to calculate the fare.' : 'Sélectionnez chaque adresse dans la liste de suggestions pour calculer le tarif.');
      return;
    }

    if (pickupAddress.trim().toLowerCase() === destinationAddress.trim().toLowerCase()) {
      setError(en ? 'The destination must be different from the pickup place.' : 'La destination doit être différente du lieu de prise en charge.');
      return;
    }

    if (departureMode === 'later') {
      if (!scheduledDate) {
        setError(en ? 'Choose the departure date and time.' : "Choisissez la date et l'heure de départ.");
        return;
      }
      if (scheduledDate.getTime() < Date.now()) {
        setError(en ? 'The departure time must be in the future.' : "L'heure de départ doit être dans le futur.");
        return;
      }
    }

    setIsCalculating(true);
    resetQuote();

    try {
      const distance = await calculateDrivingDistance(
        pickupCoords.latitude,
        pickupCoords.longitude,
        destinationCoords.latitude,
        destinationCoords.longitude
      );

      if (distance === null || distance <= 0) {
        setError(en ? 'We could not calculate the distance for this trip.' : 'Impossible de calculer la distance pour ce trajet.');
        return;
      }

      setDistanceKm(distance);
    } catch {
      setError(en ? 'Something went wrong while calculating the fare. Please try again.' : 'Une erreur est survenue lors du calcul du tarif. Réessayez.');
    } finally {
      setIsCalculating(false);
    }
  };

  const surcharges = quote?.surcharges;
  const includedSurcharges = [
    surcharges?.isNightTime
      ? (en ? `night +${surcharges.nightSurchargePercent}%` : `nuit +${surcharges.nightSurchargePercent} %`)
      : null,
    surcharges?.isWeekend
      ? (en ? `weekend +${surcharges.weekendSurchargePercent}%` : `week-end +${surcharges.weekendSurchargePercent} %`)
      : null,
  ].filter((label): label is string => label !== null);

  const departureLabel = scheduledDate
    ? scheduledDate.toLocaleString(en ? 'en-GB' : 'fr-FR', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : en
      ? 'leaving now'
      : 'départ maintenant';

  const modeButtonClass = (active: boolean) =>
    cn(
      'focus-ring flex-1 min-h-[40px] rounded-full px-4 text-sm font-semibold transition-colors',
      active ? 'bg-white text-gray-900 shadow-raised' : 'text-ink-muted hover:text-gray-900',
    );

  return (
    <div className="uber-card rounded-card shadow-card p-6 sm:p-8">
      <h2 className="text-heading-md text-gray-900">{en ? 'Where to?' : 'Où allez-vous ?'}</h2>
      {pickupHighlighted && (
        <p className="text-sm text-gray-600 mb-3" role="status">
          {en ? 'Enter the pickup place to start.' : 'Indiquez le lieu de prise en charge pour commencer.'}
        </p>
      )}

      <div className={pickupHighlighted ? 'space-y-3 mt-3' : 'space-y-3 mt-4'}>
        <div className="relative">
        <AddressAutocomplete
          className={
            pickupHighlighted
              ? 'rounded-xl ring-2 ring-black ring-offset-2 transition-shadow'
              : 'rounded-xl transition-shadow'
          }
          inputId="home-pickup-address"
          value={pickupAddress}
          onChange={handlePickupChange}
          onPlaceSelect={(place) => {
            if (!place.geometry?.location) return;
            setPickupCoords({
              latitude: place.geometry.location.lat(),
              longitude: place.geometry.location.lng(),
            });
            setAutocompleteHint(null);
            resetQuote();
          }}
          placeholder={en ? 'Pickup location' : 'Lieu de prise en charge'}
          countries="tn"
          inputClassName={cn(addressInputClass, 'pr-14')}
        />
          <button
            type="button"
            onClick={handleUseMyLocation}
            disabled={isLocating}
            title={en ? 'Use my location' : 'Utiliser ma position'}
            aria-label={en ? 'Use my location as the pickup place' : 'Utiliser ma position comme lieu de prise en charge'}
            className="focus-ring absolute right-2 top-2 flex h-10 w-10 items-center justify-center rounded-full text-gray-900 hover:bg-gray-200 disabled:opacity-60 transition-colors"
          >
            {isLocating ? (
              <Loader2 size={18} className="animate-spin" aria-hidden="true" />
            ) : (
              <LocateFixed size={18} aria-hidden="true" />
            )}
          </button>
        </div>

        <AddressAutocomplete
          inputId="home-destination-address"
          value={destinationAddress}
          onChange={handleDestinationChange}
          onPlaceSelect={(place) => {
            if (!place.geometry?.location) return;
            setDestinationCoords({
              latitude: place.geometry.location.lat(),
              longitude: place.geometry.location.lng(),
            });
            setAutocompleteHint(null);
            resetQuote();
          }}
          placeholder={en ? 'Destination' : 'Destination'}
          countries="tn"
          inputClassName={addressInputClass}
        />

        {/* Heure de départ : elle détermine les suppléments nuit et week-end */}
        <fieldset>
          <legend className="sr-only">{en ? 'Departure time' : 'Heure de départ'}</legend>
          <div className="flex gap-1 rounded-full bg-surface-muted p-1">
            <button
              type="button"
              aria-pressed={departureMode === 'now'}
              onClick={() => handleDepartureModeChange('now')}
              className={modeButtonClass(departureMode === 'now')}
            >
              {en ? 'Leave now' : 'Partir maintenant'}
            </button>
            <button
              type="button"
              aria-pressed={departureMode === 'later'}
              onClick={() => handleDepartureModeChange('later')}
              className={modeButtonClass(departureMode === 'later')}
            >
              {en ? 'Schedule' : 'Planifier'}
            </button>
          </div>
          {departureMode === 'later' && (
            <div className="mt-3">
              <label htmlFor="home-departure-time" className="sr-only">
                {en ? 'Departure date and time' : 'Date et heure de départ'}
              </label>
              <input
                id="home-departure-time"
                type="datetime-local"
                value={scheduledAt}
                min={toLocalDateTimeInputValue(new Date())}
                onChange={(e) => {
                  setScheduledAt(e.target.value);
                  setError(null);
                }}
                className="w-full px-4 h-14 rounded-xl bg-surface-muted border border-transparent focus:bg-white focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900 text-base"
              />
            </div>
          )}
        </fieldset>
      </div>

      {autocompleteHint && !error && (
        <Alert tone="warning" className="mt-3">
          {autocompleteHint}
        </Alert>
      )}

      {error && (
        <Alert tone="danger" className="mt-3">
          {error}
        </Alert>
      )}

      {estimatedPrice === null && (
        <Button
          size="lg"
          onClick={handleVoirPrix}
          disabled={isCalculating}
          className="w-full mt-5 rounded-full"
        >
          {isCalculating ? (
            <>
              <Loader2 size={20} className="animate-spin mr-2" />
              {en ? 'Calculating…' : 'Calcul en cours…'}
            </>
          ) : (
            en ? 'See prices' : 'Voir les prix'
          )}
        </Button>
      )}

      {estimatedPrice !== null && distanceKm !== null && (
        <div className="mt-5 rounded-xl bg-surface-muted border border-surface-border p-4">
          <p className="text-xs font-semibold text-gray-500 mb-2">
            {en ? 'Sedan / taxi estimate (from)' : 'Estimation berline / taxi (à partir de)'}
          </p>
          <p className="text-3xl font-semibold text-gray-900 mb-1">{money(estimatedPrice)}</p>
          <p className="text-sm text-gray-600 mb-3">
            {en ? 'About' : "Trajet d'environ"} <strong>{distanceKm.toFixed(1)} km</strong>
            {' · '}
            {departureLabel}
            {' · '}
            {en ? 'pickup from' : 'prise en charge dès'} {money(RIDE_DEFAULT_PICKUP_FARE_TND)}
          </p>
          <p className="text-xs text-gray-500 mb-4">
            {includedSurcharges.length > 0 &&
              (en
                ? `Includes the ${includedSurcharges.join(' and ')} supplement. `
                : `Supplément ${includedSurcharges.join(' et ')} inclus. `)}
            {en
              ? `Indicative fare, rounded up to the next dinar, excluding vehicle choice (van, minibus…) and the driver’s distance to pickup (${getDriverPickupFareSummaryText()}).`
              : `Tarif indicatif arrondi au dinar supérieur, hors choix de véhicule (van, minibus…) et hors distance du chauffeur (${getDriverPickupFareSummaryText()}).`}
          </p>

          <div className="rounded-lg bg-white border border-surface-border p-4 mb-4">
            <BookingSteps current={2} className="mb-4" />
            <p className="text-sm font-semibold text-gray-900 mb-2">
              {en ? 'Continue your booking' : 'Continuer votre réservation'}
            </p>
            <p className="text-sm text-gray-600 mb-4">
              {en
                ? 'Create a free account or sign in to choose your driver and confirm.'
                : 'Créez un compte gratuit ou connectez-vous pour choisir votre chauffeur et confirmer.'}
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button size="md" onClick={onClientSignup} className="rounded-full flex-1 order-1">
                {en ? 'Continue my booking' : 'Continuer ma réservation'}
              </Button>
              <Button size="md" variant="outline" onClick={onClientLogin} className="rounded-full flex-1 order-2">
                {en ? 'I already have an account' : "J'ai déjà un compte"}
              </Button>
            </div>
          </div>

          <button
            type="button"
            onClick={resetQuote}
            className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            {en ? 'Change the trip' : 'Modifier le trajet'}
          </button>
        </div>
      )}

    </div>
  );
};
