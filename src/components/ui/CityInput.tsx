import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Loader2 } from 'lucide-react';
import { googleMapsLoader } from '../../utils/googleMapsLoader';
import { isTranslatablePublicPath, useLocale } from '../../i18n/locale';
import {
  GOOGLE_DEBOUNCE_MS,
  GOOGLE_QUERY_MIN_LENGTH,
  createPlacesSessionToken,
  fetchPlaceDetails,
  fetchPlacePredictions,
} from '../../utils/placeSearch';
import { PlaceSuggestionList } from './PlaceSuggestionList';
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
  const { locale, logicalPath } = useLocale();
  const mapsPendingEn = locale === 'en' && isTranslatablePublicPath(logicalPath);
  const [loading, setLoading] = useState(false);
  const [isGoogleMapsLoaded, setIsGoogleMapsLoaded] = useState(false);
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const onChangeRef = useRef(onChange);
  const countryRef = useRef(country);
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const requestSeq = useRef(0);
  const selectedValueRef = useRef<string | null>(null);

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
    const query = value.trim();
    if (selectedValueRef.current === value) {
      setSuggestions([]);
      setOpen(false);
      setSearching(false);
      return;
    }
    if (query.length < GOOGLE_QUERY_MIN_LENGTH || !isGoogleMapsLoaded) {
      requestSeq.current += 1;
      setSuggestions([]);
      setOpen(false);
      setSearching(false);
      return;
    }

    setSearching(true);
    const seq = ++requestSeq.current;
    const timer = window.setTimeout(() => {
      const token = sessionTokenRef.current ?? createPlacesSessionToken();
      sessionTokenRef.current = token;
      if (!token) {
        if (seq === requestSeq.current) setSearching(false);
        return;
      }
      fetchPlacePredictions(query, token, {
        countries: [googleCountryCode],
        types: ['(cities)'],
      }).then((predictions) => {
        if (seq !== requestSeq.current) return;
        setSuggestions(predictions);
        setOpen(predictions.length > 0);
        setActiveIndex(0);
        setSearching(false);
      });
    }, GOOGLE_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [value, googleCountryCode, isGoogleMapsLoaded]);

  const choosePrediction = async (prediction: google.maps.places.AutocompletePrediction) => {
    const token = sessionTokenRef.current ?? createPlacesSessionToken();
    sessionTokenRef.current = null;
    if (!token) return;
    const place = await fetchPlaceDetails(prediction.place_id, token);
    if (!place) return;

    let cityName = '';
    if (place.address_components) {
      const components = place.address_components;
      const locality = components.find((c) => c.types.includes('locality'))?.long_name || '';
      const administrativeArea =
        components.find((c) => c.types.includes('administrative_area_level_1'))?.long_name || '';
      const countryComponent = components.find((c) => c.types.includes('country'));
      const city = locality || administrativeArea || place.name || '';
      const addressParts: string[] = [];
      if (city) addressParts.push(city);
      addressParts.push(englishCountryName(countryComponent, countryRef.current));
      cityName = addressParts.join(', ');
    }
    if (!cityName) {
      cityName = place.formatted_address ?? place.name ?? prediction.description;
    }

    selectedValueRef.current = cityName;
    onChangeRef.current(cityName);
    setOpen(false);
    setSuggestions([]);
    inputRef.current?.blur();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || suggestions.length === 0) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % suggestions.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => (index - 1 + suggestions.length) % suggestions.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const prediction = suggestions[activeIndex];
      if (prediction) void choosePrediction(prediction);
    } else if (event.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div className={`relative w-full ${className}`}>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
          {loading || searching ? (
            <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
          ) : (
            <MapPin className="h-5 w-5 text-gray-400" />
          )}
        </div>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => {
            selectedValueRef.current = null;
            onChange(e.target.value);
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0 && selectedValueRef.current !== value) setOpen(true);
          }}
          onBlur={() => setOpen(false)}
          placeholder={placeholder}
          required={required}
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          className={`block w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 transition-all disabled:bg-gray-100 disabled:cursor-not-allowed ${
            error ? 'border-danger-500' : 'border-gray-300'
          }`}
        />
        {open && (
          <PlaceSuggestionList
            listId="city-suggestions"
            items={suggestions.map((prediction) => ({
              id: prediction.place_id,
              title: prediction.structured_formatting?.main_text || prediction.description,
              subtitle: prediction.structured_formatting?.secondary_text,
            }))}
            activeIndex={activeIndex}
            onHover={setActiveIndex}
            onSelect={(index) => {
              const prediction = suggestions[index];
              if (prediction) void choosePrediction(prediction);
            }}
            showGoogleCredit
          />
        )}
      </div>

      {!isGoogleMapsLoaded && (
        <p className="text-xs text-gray-500 mt-1">
          {mapsPendingEn
            ? 'Address suggestions will appear once Google Maps has loaded…'
            : 'Autocomplétion en attente du chargement de Google Maps…'}
        </p>
      )}

      {error && <p className="mt-2 text-sm text-danger-600">{error}</p>}
    </div>
  );
};
