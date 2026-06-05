import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Loader2 } from 'lucide-react';
import { googleMapsLoader } from '../../utils/googleMapsLoader';
import {
  getSignupCountryLabel,
  getSignupGoogleCountryCode,
  type SignupCountryCode,
} from '../../utils/signupCountries';

interface CityInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  className?: string;
  required?: boolean;
  /** Pays sélectionné à l'inscription — restreint l'autocomplétion Google Places */
  country?: SignupCountryCode;
}

const COUNTRY_NAME_EN: Record<string, string> = {
  TN: 'Tunisia',
  Tunisie: 'Tunisia',
  Tunisia: 'Tunisia',
  FR: 'France',
  France: 'France',
  IT: 'Italy',
  Italie: 'Italy',
  Italy: 'Italy',
  DE: 'Germany',
  Allemagne: 'Germany',
  Germany: 'Germany',
  ES: 'Spain',
  Espagne: 'Spain',
  Spain: 'Spain',
  BE: 'Belgium',
  Belgique: 'Belgium',
  Belgium: 'Belgium',
  LU: 'Luxembourg',
  Luxembourg: 'Luxembourg',
  CH: 'Switzerland',
  Suisse: 'Switzerland',
  Switzerland: 'Switzerland',
  NL: 'Netherlands',
  'Pays-Bas': 'Netherlands',
  Netherlands: 'Netherlands',
};

function englishCountryName(
  countryComponent: google.maps.GeocoderAddressComponent | undefined,
  fallbackCountry: SignupCountryCode
): string {
  if (!countryComponent) return getSignupCountryLabel(fallbackCountry);
  const short = countryComponent.short_name;
  const long = countryComponent.long_name;
  return COUNTRY_NAME_EN[short] || COUNTRY_NAME_EN[long] || long;
}

export const CityInput: React.FC<CityInputProps> = ({
  value,
  onChange,
  placeholder = 'Ville de résidence',
  error,
  className = '',
  required = false,
  country = 'TN',
}) => {
  const [loading, setLoading] = useState(false);
  const [isGoogleMapsLoaded, setIsGoogleMapsLoaded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const placeChangedListenerRef = useRef<google.maps.MapsEventListener | null>(null);
  const onChangeRef = useRef(onChange);
  const countryRef = useRef(country);

  const googleCountryCode = getSignupGoogleCountryCode(country);

  useEffect(() => {
    onChangeRef.current = onChange;
    countryRef.current = country;
  });

  useEffect(() => {
    let alive = true;
    const load = async () => {
      if (typeof window === 'undefined') return;
      try {
        setLoading(true);
        if (googleMapsLoader?.loadGoogleMaps) {
          await googleMapsLoader.loadGoogleMaps();
          if (!alive) return;
          setIsGoogleMapsLoaded(
            !!(window as unknown as { google?: { maps?: { places?: unknown } } }).google?.maps
              ?.places
          );
        } else {
          setIsGoogleMapsLoaded(
            !!(window as unknown as { google?: { maps?: { places?: unknown } } }).google?.maps
              ?.places
          );
        }
      } catch (e) {
        console.error('Erreur chargement Google Maps:', e);
      } finally {
        if (alive) setLoading(false);
      }
    };
    load();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!isGoogleMapsLoaded || !inputRef.current) return;

    try {
      const ac = new google.maps.places.Autocomplete(inputRef.current, {
        fields: ['formatted_address', 'geometry', 'place_id', 'name', 'address_components'],
        types: ['(cities)'],
        componentRestrictions: { country: googleCountryCode },
      });

      if (placeChangedListenerRef.current) {
        placeChangedListenerRef.current.remove();
        placeChangedListenerRef.current = null;
      }

      placeChangedListenerRef.current = ac.addListener('place_changed', () => {
        try {
          const place = ac.getPlace();
          let cityName = '';

          if (place?.address_components) {
            const components = place.address_components;
            const locality =
              components.find((c) => c.types.includes('locality'))?.long_name || '';
            const administrativeArea =
              components.find((c) => c.types.includes('administrative_area_level_1'))
                ?.long_name || '';
            const countryComponent = components.find((c) => c.types.includes('country'));

            const city = locality || administrativeArea || place.name || '';
            const addressParts: string[] = [];
            if (city) addressParts.push(city);
            addressParts.push(
              englishCountryName(countryComponent, countryRef.current)
            );
            cityName = addressParts.join(', ');
          }

          if (!cityName) {
            cityName = place?.formatted_address ?? place?.name ?? '';
          }

          onChangeRef.current(cityName);
          setTimeout(() => inputRef.current?.blur(), 100);
        } catch (err) {
          console.error('Erreur place_changed:', err);
        }
      });

      autocompleteRef.current = ac;
    } catch (err) {
      console.error('Erreur init Autocomplete ville:', err);
    }

    return () => {
      try {
        placeChangedListenerRef.current?.remove?.();
        if (autocompleteRef.current) {
          google.maps.event.clearInstanceListeners(autocompleteRef.current);
        }
      } catch {
        // ignore
      }
      autocompleteRef.current = null;
      placeChangedListenerRef.current = null;
    };
  }, [isGoogleMapsLoaded, googleCountryCode]);

  return (
    <div className={`relative w-full ${className}`}>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
          {loading ? (
            <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
          ) : (
            <MapPin className="h-5 w-5 text-gray-400" />
          )}
        </div>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          disabled={!isGoogleMapsLoaded}
          autoComplete="chrome-off"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className={`block w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all disabled:bg-gray-100 disabled:cursor-not-allowed ${
            error ? 'border-red-500' : 'border-gray-300'
          }`}
        />
      </div>

      {!isGoogleMapsLoaded && (
        <p className="text-xs text-gray-500 mt-1">
          Autocomplétion en attente du chargement de Google Maps…
        </p>
      )}

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
};
