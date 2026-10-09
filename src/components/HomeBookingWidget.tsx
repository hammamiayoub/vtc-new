import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from './ui/Button';
import AddressAutocomplete from './AddressAutocomplete';
import {
  calculateDrivingDistance,
  calculatePrice,
  Coordinates,
  getProgressivePriceBreakdown,
  RIDE_DEFAULT_PICKUP_FARE_TND,
  getDriverPickupFareSummaryText,
} from '../utils/geolocation';
import { savePendingQuote } from '../utils/pendingQuote';
import {
  FOCUS_HOME_BOOKING_EVENT,
  focusHomeBookingForm,
  focusHomePickupInput,
} from '../utils/focusHomeBooking';
import { useLocale } from '../i18n/locale';

interface HomeBookingWidgetProps {
  onClientLogin: () => void;
  onClientSignup: () => void;
}

function formatTnd(amount: number, locale: 'fr' | 'en'): string {
  const value = amount.toFixed(2);
  return `${locale === 'en' ? value : value.replace('.', ',')} TND`;
}

export const HomeBookingWidget: React.FC<HomeBookingWidgetProps> = ({
  onClientLogin,
  onClientSignup,
}) => {
  const { locale } = useLocale();
  const en = locale === 'en';
  const money = (amount: number) => formatTnd(amount, locale);
  const [pickupAddress, setPickupAddress] = useState('');
  const [destinationAddress, setDestinationAddress] = useState('');
  const [pickupCoords, setPickupCoords] = useState<Coordinates | null>(null);
  const [destinationCoords, setDestinationCoords] = useState<Coordinates | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [estimatedPrice, setEstimatedPrice] = useState<number | null>(null);
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

  const resetQuote = () => {
    setDistanceKm(null);
    setEstimatedPrice(null);
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

      const price = calculatePrice(distance, 'sedan');
      setDistanceKm(distance);
      setEstimatedPrice(price);

      savePendingQuote({
        pickupAddress: pickupAddress.trim(),
        destinationAddress: destinationAddress.trim(),
        pickupCoords: {
          latitude: pickupCoords.latitude,
          longitude: pickupCoords.longitude,
        },
        destinationCoords: {
          latitude: destinationCoords.latitude,
          longitude: destinationCoords.longitude,
        },
        distanceKm: distance,
        estimatedPrice: price,
        vehicleType: 'sedan',
      });
    } catch {
      setError(en ? 'Something went wrong while calculating the fare. Please try again.' : 'Une erreur est survenue lors du calcul du tarif. Réessayez.');
    } finally {
      setIsCalculating(false);
    }
  };

  const breakdown = distanceKm !== null ? getProgressivePriceBreakdown(distanceKm) : null;

  return (
    <div className="uber-card shadow-card p-6 sm:p-8">
      <p className="text-sm font-semibold text-gray-900 mb-1">{en ? 'Book now' : 'Réserver maintenant'}</p>
      {pickupHighlighted && (
        <p className="text-sm text-gray-600 mb-3" role="status">
          {en ? 'Enter the pickup place to start.' : 'Indiquez le lieu de prise en charge pour commencer.'}
        </p>
      )}

      <div className={pickupHighlighted ? 'space-y-3 mt-3' : 'space-y-3 mt-4'}>
        <AddressAutocomplete
          className={
            pickupHighlighted
              ? 'rounded-lg ring-2 ring-black ring-offset-2 transition-shadow'
              : 'rounded-lg transition-shadow'
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
          inputClassName="w-full pl-10 pr-4 py-3.5 rounded-lg bg-surface-muted border border-surface-border focus:ring-2 focus:ring-gray-900 focus:border-gray-900 disabled:bg-gray-100 disabled:cursor-not-allowed text-sm"
        />

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
          inputClassName="w-full pl-10 pr-4 py-3.5 rounded-lg bg-surface-muted border border-surface-border focus:ring-2 focus:ring-gray-900 focus:border-gray-900 disabled:bg-gray-100 disabled:cursor-not-allowed text-sm"
        />
      </div>

      {autocompleteHint && !error && (
        <p className="mt-3 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2" role="status">
          {autocompleteHint}
        </p>
      )}

      {error && (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      {!estimatedPrice && (
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
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
            {en ? 'Sedan / taxi estimate (from)' : 'Estimation berline / taxi (à partir de)'}
          </p>
          <p className="text-3xl font-bold text-gray-900 mb-1">{money(estimatedPrice)}</p>
          <p className="text-sm text-gray-600 mb-3">
            {en ? 'About' : "Trajet d'environ"} <strong>{distanceKm.toFixed(1)} km</strong>
            {breakdown && (
              <> · {en ? 'pickup from' : 'prise en charge dès'} {money(RIDE_DEFAULT_PICKUP_FARE_TND)}</>
            )}
          </p>
          <p className="text-xs text-gray-500 mb-4">
            {en
              ? `Indicative fare, excluding extras (night, weekend), vehicle choice (van, minibus…) and the driver’s distance to pickup (${getDriverPickupFareSummaryText()}).`
              : `Tarif indicatif hors suppléments (nuit, week-end), hors choix de véhicule (van, minibus…) et hors distance du chauffeur (${getDriverPickupFareSummaryText()}).`}
          </p>

          <div className="rounded-lg bg-white border border-surface-border p-4 mb-4">
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

      {estimatedPrice === null && (
        <button
          type="button"
          onClick={onClientLogin}
          className="w-full mt-3 text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          {en ? 'Sign in to see your recent activity' : 'Connectez-vous pour consulter votre activité récente'}
        </button>
      )}
    </div>
  );
};
