'use client';

import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Loader2 } from 'lucide-react';
import { googleMapsLoader } from '../utils/googleMapsLoader';

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
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const placeChangedListenerRef = useRef<google.maps.MapsEventListener | null>(null);
  
  // Refs stables pour les callbacks (évite de réinitialiser l'autocomplete)
  const onChangeRef = useRef(onChange);
  const onPlaceSelectRef = useRef(onPlaceSelect);

  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleMapsLoaded, setIsGoogleMapsLoaded] = useState(false);

  // Mise à jour des refs à chaque render (sans déclencher useEffect)
  useEffect(() => {
    onChangeRef.current = onChange;
    onPlaceSelectRef.current = onPlaceSelect;
  });

  // Charge Google Maps si un loader est présent
  useEffect(() => {
    let alive = true;
    const load = async () => {
      if (typeof window === 'undefined') return;
      try {
        setIsLoading(true);
        if (googleMapsLoader?.loadGoogleMaps) {
          await googleMapsLoader.loadGoogleMaps();
          if (!alive) return;
          setIsGoogleMapsLoaded(!!(window as unknown as { google?: { maps?: { places?: unknown } } }).google?.maps?.places);
        } else {
          // Fallback : si déjà présent sur window
          setIsGoogleMapsLoaded(!!(window as unknown as { google?: { maps?: { places?: unknown } } }).google?.maps?.places);
        }
      } catch (e) {
        console.error('Erreur chargement Google Maps:', e);
      } finally {
        if (alive) setIsLoading(false);
      }
    };
    load();
    return () => {
      alive = false;
    };
  }, []);

  // Initialise Autocomplete UNE SEULE FOIS (sans dépendances de callbacks)
  useEffect(() => {
    if (!isGoogleMapsLoaded) return;
    if (!inputRef.current) return;
    if (autocompleteRef.current) return; // déjà prêt

    try {
      const ac = new google.maps.places.Autocomplete(inputRef.current!, {
        fields: ['formatted_address', 'geometry', 'place_id', 'name', 'address_components'],
        types: ['geocode', 'establishment'],
        componentRestrictions: { country: 'tn' },
      });

      if (placeChangedListenerRef.current) {
        placeChangedListenerRef.current.remove();
        placeChangedListenerRef.current = null;
      }

      placeChangedListenerRef.current = ac.addListener('place_changed', () => {
        try {
          const place = ac.getPlace();
          
          // Construire l'adresse en anglais à partir des address_components
          let displayAddress = '';
          if (place?.address_components) {
            const components = place.address_components;
            
            // Extraire les composants principaux
            const streetNumber = components.find(c => c.types.includes('street_number'))?.long_name || '';
            const route = components.find(c => c.types.includes('route'))?.long_name || '';
            const locality = components.find(c => c.types.includes('locality'))?.long_name || '';
            const administrativeArea = components.find(c => c.types.includes('administrative_area_level_1'))?.long_name || '';
            const country = components.find(c => c.types.includes('country'))?.long_name || '';
            
            // Construire l'adresse en anglais
            const addressParts = [];
            
            // Adresse de rue
            if (streetNumber && route) {
              addressParts.push(`${streetNumber} ${route}`);
            } else if (route) {
              addressParts.push(route);
            }
            
            // Ville
            if (locality) {
              addressParts.push(locality);
            }
            
            // Région/État
            if (administrativeArea) {
              addressParts.push(administrativeArea);
            }
            
            // Pays - forcer l'affichage en anglais
            if (country) {
              // Mapper les noms de pays français vers anglais
              const countryMapping: { [key: string]: string } = {
                'TN': 'Tunisia',
                'Tunisie': 'Tunisia',
                'France': 'France',
                'Algérie': 'Algeria',
                'Maroc': 'Morocco',
                'Libye': 'Libya'
              };
              const englishCountry = countryMapping[country] || country;
              addressParts.push(englishCountry);
            }
            
            displayAddress = addressParts.join(', ');
          }
          
          // Fallback sur formatted_address si pas d'address_components
          if (!displayAddress) {
            displayAddress = place?.formatted_address ?? place?.name ?? '';
          }
          
          // Utiliser les refs pour éviter les dépendances
          onChangeRef.current(displayAddress);
          onPlaceSelectRef.current(place);
          
          // Important : retirer le focus après sélection
          setTimeout(() => {
            inputRef.current?.blur();
          }, 100);
        } catch (err) {
          console.error('Erreur place_changed:', err);
        }
      });

      autocompleteRef.current = ac;
    } catch (err) {
      console.error("Erreur init Autocomplete:", err);
    }

    return () => {
      try {
        placeChangedListenerRef.current?.remove?.();
        if (autocompleteRef.current) {
          google.maps.event.clearInstanceListeners(autocompleteRef.current);
        }
      } catch {
        // Ignorer les erreurs de nettoyage
      }
      autocompleteRef.current = null;
      placeChangedListenerRef.current = null;
    };
  }, [isGoogleMapsLoaded]); // Plus de dépendances onChange/onPlaceSelect !

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor={inputId}>
          {label}
        </label>
      )}

      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          {isLoading ? (
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
          placeholder={placeholder}
          disabled={disabled || !isGoogleMapsLoaded}
          // Anti-autofill / password managers
          autoComplete="chrome-off"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          inputMode="text"
          enterKeyHint="search"
          data-lpignore="true"
          data-form-type="other"
          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
        />
      </div>

      {!isGoogleMapsLoaded && (
        <p className="text-xs text-gray-500 mt-1">Autocomplétion en attente du chargement de Google Maps…</p>
      )}
    </div>
  );
};

export default AddressAutocomplete;