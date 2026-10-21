'use client';

import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Loader2 } from 'lucide-react';
import { googleMapsLoader } from '../utils/googleMapsLoader';
import { isTranslatablePublicPath, useLocale } from '../i18n/locale';
import {
  frequentPlaceToPlaceResult,
  loadFrequentPlaces,
  matchFrequentPlaces,
  queryTargetsFrequentPlace,
  type FrequentPlace,
  type FrequentPlaceKind,
} from '../utils/frequentPlaces';
import {
  GOOGLE_DEBOUNCE_MS,
  GOOGLE_QUERY_MIN_LENGTH,
  createPlacesSessionToken,
  fetchPlaceDetails,
  fetchPlacePredictions,
} from '../utils/placeSearch';
import { PlaceSuggestionList } from './ui/PlaceSuggestionList';

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onPlaceSelect: (place: google.maps.places.PlaceResult) => void;
  placeholder?: string;
  label?: string;
  className?: string;
  disabled?: boolean;
  /** Identifiant unique (très important pour neutraliser l'autofill). */
  inputId: string;
  /**
   * Restriction de pays pour l'autocomplétion (codes ISO 2 lettres).
   * Par défaut 'tn' (Tunisie). Pour l'international, passer une liste,
   * ex: ['fr','it','de','es','be','nl', ...] ou undefined pour aucun filtre.
   */
  countries?: string | string[] | null;
  inputClassName?: string;
}

type Suggestion =
  | { source: 'frequent'; id: string; place: FrequentPlace }
  | { source: 'google'; id: string; prediction: google.maps.places.AutocompletePrediction };

const KIND_LABELS: Record<FrequentPlaceKind, { fr: string; en: string }> = {
  airport: { fr: 'Aéroport', en: 'Airport' },
  station: { fr: 'Gare', en: 'Station' },
  hotel: { fr: 'Hôtel', en: 'Hotel' },
};

function countryList(countries: string | string[] | null | undefined): string[] | null {
  if (countries == null) return null;
  const list = (Array.isArray(countries) ? countries : [countries])
    .map((code) => code.trim().toLowerCase())
    .filter(Boolean);
  return list.length > 0 ? list : null;
}

function formatSelectedAddress(place: google.maps.places.PlaceResult): string {
  let displayAddress = place?.name?.trim() || '';

  if (!displayAddress && place?.address_components) {
    const components = place.address_components;
    const streetNumber = components.find((c) => c.types.includes('street_number'))?.long_name || '';
    const route = components.find((c) => c.types.includes('route'))?.long_name || '';
    const locality = components.find((c) => c.types.includes('locality'))?.long_name || '';
    const administrativeArea =
      components.find((c) => c.types.includes('administrative_area_level_1'))?.long_name || '';
    const country = components.find((c) => c.types.includes('country'))?.long_name || '';
    const addressParts: string[] = [];

    if (streetNumber && route) addressParts.push(`${streetNumber} ${route}`);
    else if (route) addressParts.push(route);
    if (locality) addressParts.push(locality);
    if (administrativeArea) addressParts.push(administrativeArea);
    if (country) {
      const countryMapping: { [key: string]: string } = {
        TN: 'Tunisia',
        Tunisie: 'Tunisia',
        France: 'France',
        Algérie: 'Algeria',
        Maroc: 'Morocco',
        Libye: 'Libya',
      };
      addressParts.push(countryMapping[country] || country);
    }
    displayAddress = addressParts.join(', ');
  }

  if (!displayAddress) {
    displayAddress = place?.formatted_address ?? place?.name ?? '';
  }
  return displayAddress;
}

const AddressAutocomplete: React.FC<AddressAutocompleteProps> = ({
  value,
  onChange,
  onPlaceSelect,
  placeholder = 'Saisissez une adresse…',
  label,
  className = '',
  disabled = false,
  inputId,
  countries = 'tn',
  inputClassName,
}) => {
  const { locale, logicalPath } = useLocale();
  const en = locale === 'en' && isTranslatablePublicPath(logicalPath);
  const countriesKey = Array.isArray(countries) ? countries.join(',') : (countries ?? '');
  const inputRef = useRef<HTMLInputElement>(null);
  const onChangeRef = useRef(onChange);
  const onPlaceSelectRef = useRef(onPlaceSelect);
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const requestSeq = useRef(0);
  const selectedValueRef = useRef<string | null>(null);

  const [isLoadingMaps, setIsLoadingMaps] = useState(false);
  const [isGoogleMapsLoaded, setIsGoogleMapsLoaded] = useState(false);
  const [catalog, setCatalog] = useState<FrequentPlace[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [searchingGoogle, setSearchingGoogle] = useState(false);

  useEffect(() => {
    onChangeRef.current = onChange;
    onPlaceSelectRef.current = onPlaceSelect;
  });

  useEffect(() => {
    let alive = true;
    loadFrequentPlaces().then((places) => {
      if (alive) setCatalog(places);
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      if (typeof window === 'undefined') return;
      try {
        setIsLoadingMaps(true);
        if (googleMapsLoader?.loadGoogleMaps) {
          await googleMapsLoader.loadGoogleMaps();
        }
        if (!alive) return;
        setIsGoogleMapsLoaded(!!window.google?.maps?.places);
      } catch (e) {
        console.error('Erreur chargement Google Maps:', e);
      } finally {
        if (alive) setIsLoadingMaps(false);
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
      setSearchingGoogle(false);
      return;
    }

    const allowedCountries = countryList(countriesKey ? countriesKey.split(',') : null);
    const local = matchFrequentPlaces(catalog, query, allowedCountries);
    const localSuggestions: Suggestion[] = local.map((place) => ({
      source: 'frequent',
      id: place.id,
      place,
    }));

    if (query.length < 2) {
      sessionTokenRef.current = null;
      requestSeq.current += 1;
      setSuggestions([]);
      setOpen(false);
      setSearchingGoogle(false);
      return;
    }

    const skipGoogle =
      queryTargetsFrequentPlace(catalog, query, allowedCountries) ||
      query.length < GOOGLE_QUERY_MIN_LENGTH ||
      !isGoogleMapsLoaded;

    if (skipGoogle) {
      sessionTokenRef.current = null;
      requestSeq.current += 1;
      setSearchingGoogle(false);
      setSuggestions(localSuggestions);
      setOpen(localSuggestions.length > 0);
      setActiveIndex(0);
      return;
    }

    setSuggestions(localSuggestions);
    setOpen(localSuggestions.length > 0);
    setActiveIndex(0);
    setSearchingGoogle(true);

    const seq = ++requestSeq.current;
    const timer = window.setTimeout(() => {
      const token = sessionTokenRef.current ?? createPlacesSessionToken();
      sessionTokenRef.current = token;
      if (!token) {
        if (seq === requestSeq.current) setSearchingGoogle(false);
        return;
      }
      fetchPlacePredictions(query, token, {
        countries: allowedCountries,
        types: ['geocode', 'establishment'],
      }).then((predictions) => {
        if (seq !== requestSeq.current) return;
        const googleSuggestions: Suggestion[] = predictions.map((prediction) => ({
          source: 'google',
          id: prediction.place_id,
          prediction,
        }));
        const next = [...localSuggestions, ...googleSuggestions];
        setSuggestions(next);
        setOpen(next.length > 0);
        setActiveIndex(0);
        setSearchingGoogle(false);
      });
    }, GOOGLE_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [value, catalog, countriesKey, isGoogleMapsLoaded]);

  const chooseSuggestion = async (suggestion: Suggestion) => {
    if (suggestion.source === 'frequent') {
      const place = frequentPlaceToPlaceResult(suggestion.place);
      const display = suggestion.place.label;
      selectedValueRef.current = display;
      onChangeRef.current(display);
      onPlaceSelectRef.current(place);
      setOpen(false);
      setSuggestions([]);
      inputRef.current?.blur();
      return;
    }

    const token = sessionTokenRef.current ?? createPlacesSessionToken();
    sessionTokenRef.current = null;
    if (!token) return;
    const place = await fetchPlaceDetails(suggestion.prediction.place_id, token);
    if (!place?.geometry?.location) return;
    const display = formatSelectedAddress(place);
    selectedValueRef.current = display;
    onChangeRef.current(display);
    onPlaceSelectRef.current(place);
    setOpen(false);
    setSuggestions([]);
    inputRef.current?.blur();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    selectedValueRef.current = null;
    onChange(e.target.value);
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
      const suggestion = suggestions[activeIndex];
      if (suggestion) void chooseSuggestion(suggestion);
    } else if (event.key === 'Escape') {
      setOpen(false);
    }
  };

  const items = suggestions.map((suggestion) => {
    if (suggestion.source === 'frequent') {
      const kind = KIND_LABELS[suggestion.place.kind];
      return {
        id: suggestion.id,
        title: suggestion.place.label,
        subtitle: en ? kind.en : kind.fr,
      };
    }
    return {
      id: suggestion.id,
      title: suggestion.prediction.structured_formatting?.main_text || suggestion.prediction.description,
      subtitle: suggestion.prediction.structured_formatting?.secondary_text,
    };
  });

  const hasGoogleSuggestions = suggestions.some((suggestion) => suggestion.source === 'google');

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor={inputId}>
          {label}
        </label>
      )}

      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          {isLoadingMaps || searchingGoogle ? (
            <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />
          ) : (
            <MapPin className="h-4 w-4 text-gray-400" />
          )}
        </div>

        <input
          ref={inputRef}
          id={inputId}
          name={inputId}
          key={inputId}
          type="text"
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0 && selectedValueRef.current !== value) setOpen(true);
          }}
          onBlur={() => setOpen(false)}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          inputMode="text"
          enterKeyHint="search"
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          aria-controls={`${inputId}-suggestions`}
          data-lpignore="true"
          data-form-type="other"
          className={
            inputClassName ??
            'w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed'
          }
        />

        {open && (
          <PlaceSuggestionList
            listId={`${inputId}-suggestions`}
            items={items}
            activeIndex={activeIndex}
            onHover={setActiveIndex}
            onSelect={(index) => {
              const suggestion = suggestions[index];
              if (suggestion) void chooseSuggestion(suggestion);
            }}
            showGoogleCredit={hasGoogleSuggestions}
          />
        )}
      </div>

      {!isGoogleMapsLoaded && isLoadingMaps && (
        <p className="text-xs text-gray-500 mt-1">
          {en
            ? 'Address suggestions will appear once Google Maps has loaded…'
            : 'Autocomplétion en attente du chargement de Google Maps…'}
        </p>
      )}
    </div>
  );
};

export default AddressAutocomplete;
