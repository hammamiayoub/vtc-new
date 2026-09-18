import React, { useState } from 'react';
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

interface HomeBookingWidgetProps {
  onClientLogin: () => void;
  onClientSignup: () => void;
}

function formatTnd(amount: number): string {
  return `${amount.toFixed(2).replace('.', ',')} TND`;
}

export const HomeBookingWidget: React.FC<HomeBookingWidgetProps> = ({
  onClientLogin,
  onClientSignup,
}) => {
  const [pickupAddress, setPickupAddress] = useState('');
  const [destinationAddress, setDestinationAddress] = useState('');
  const [pickupCoords, setPickupCoords] = useState<Coordinates | null>(null);
  const [destinationCoords, setDestinationCoords] = useState<Coordinates | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [estimatedPrice, setEstimatedPrice] = useState<number | null>(null);
  const [autocompleteHint, setAutocompleteHint] = useState<string | null>(null);

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
      setAutocompleteHint('Sélectionnez le lieu de départ dans la liste de suggestions.');
    } else {
      setAutocompleteHint(null);
    }
  };

  const handleDestinationChange = (value: string) => {
    setDestinationAddress(value);
    setDestinationCoords(null);
    resetQuote();
    if (value.trim() && !destinationCoords) {
      setAutocompleteHint('Sélectionnez la destination dans la liste de suggestions.');
    } else {
      setAutocompleteHint(null);
    }
  };

  const handleVoirPrix = async () => {
    setError(null);

    if (!pickupAddress.trim() || !destinationAddress.trim()) {
      setError('Veuillez renseigner le lieu de prise en charge et la destination.');
      return;
    }

    if (!pickupCoords || !destinationCoords) {
      setError('Sélectionnez chaque adresse dans la liste de suggestions pour calculer le tarif.');
      return;
    }

    if (pickupAddress.trim().toLowerCase() === destinationAddress.trim().toLowerCase()) {
      setError('La destination doit être différente du lieu de prise en charge.');
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
        setError('Impossible de calculer la distance pour ce trajet.');
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
      setError('Une erreur est survenue lors du calcul du tarif. Réessayez.');
    } finally {
      setIsCalculating(false);
    }
  };

  const breakdown = distanceKm !== null ? getProgressivePriceBreakdown(distanceKm) : null;

  return (
    <div className="uber-card shadow-card p-6 sm:p-8">
      <p className="text-sm font-semibold text-gray-900 mb-4">Réserver maintenant</p>

      <div className="space-y-3">
        <AddressAutocomplete
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
          placeholder="Lieu de prise en charge"
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
          placeholder="Destination"
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
              Calcul en cours…
            </>
          ) : (
            'Voir les prix'
          )}
        </Button>
      )}

      {estimatedPrice !== null && distanceKm !== null && (
        <div className="mt-5 rounded-xl bg-surface-muted border border-surface-border p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
            Estimation berline / taxi (à partir de)
          </p>
          <p className="text-3xl font-bold text-gray-900 mb-1">{formatTnd(estimatedPrice)}</p>
          <p className="text-sm text-gray-600 mb-3">
            Trajet d&apos;environ <strong>{distanceKm.toFixed(1)} km</strong>
            {breakdown && (
              <> · prise en charge dès {formatTnd(RIDE_DEFAULT_PICKUP_FARE_TND)}</>
            )}
          </p>
          <p className="text-xs text-gray-500 mb-4">
            Tarif indicatif hors suppléments (nuit, week-end), hors choix de véhicule (van, minibus…)
            et hors distance du chauffeur ({getDriverPickupFareSummaryText()}).
          </p>

          <div className="rounded-lg bg-white border border-surface-border p-4 mb-4">
            <p className="text-sm font-semibold text-gray-900 mb-2">
              Continuer votre réservation
            </p>
            <p className="text-sm text-gray-600 mb-4">
              Créez un compte gratuit ou connectez-vous pour choisir votre chauffeur et confirmer.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button size="md" onClick={onClientSignup} className="rounded-full flex-1 order-1">
                Continuer ma réservation
              </Button>
              <Button size="md" variant="outline" onClick={onClientLogin} className="rounded-full flex-1 order-2">
                J&apos;ai déjà un compte
              </Button>
            </div>
          </div>

          <button
            type="button"
            onClick={resetQuote}
            className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            Modifier le trajet
          </button>
        </div>
      )}

      {estimatedPrice === null && (
        <button
          type="button"
          onClick={onClientLogin}
          className="w-full mt-3 text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          Connectez-vous pour consulter votre activité récente
        </button>
      )}
    </div>
  );
};
