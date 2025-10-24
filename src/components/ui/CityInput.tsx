import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Loader2 } from 'lucide-react';
import { googleMapsLoader } from '../../utils/googleMapsLoader';

interface CityInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  className?: string;
  required?: boolean;
}

export const CityInput: React.FC<CityInputProps> = ({
  value,
  onChange,
  placeholder = "Ville de résidence",
  error,
  className = '',
  required = false
}) => {
  const [loading, setLoading] = useState(false);
  const [isGoogleMapsLoaded, setIsGoogleMapsLoaded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const placeChangedListenerRef = useRef<google.maps.MapsEventListener | null>(null);
  
  // Refs stables pour les callbacks (évite de réinitialiser l'autocomplete)
  const onChangeRef = useRef(onChange);

  // Mise à jour des refs à chaque render (sans déclencher useEffect)
  useEffect(() => {
    onChangeRef.current = onChange;
  });
 
  // Charger Google Maps
  useEffect(() => {
    let alive = true;
    const load = async () => {
      if (typeof window === 'undefined') return;
      try {
        setLoading(true);
        if (googleMapsLoader?.loadGoogleMaps) {
          await googleMapsLoader.loadGoogleMaps();
          if (!alive) return;
          setIsGoogleMapsLoaded(!!(window as unknown as { google?: { maps?: { places?: unknown } } }).google?.maps?.places);
        } else {
          setIsGoogleMapsLoaded(!!(window as unknown as { google?: { maps?: { places?: unknown } } }).google?.maps?.places);
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

  // Initialiser l'autocomplete Google Places
  useEffect(() => {
    if (!isGoogleMapsLoaded) {
      console.log('🔧 Google Maps pas encore chargé');
      return;
    }
    if (!inputRef.current) {
      console.log('🔧 Input ref pas disponible');
      return;
    }
    if (autocompleteRef.current) {
      console.log('🔧 Autocomplete déjà initialisé');
      return;
    }

    console.log('🔧 Initialisation de l\'autocomplete Google Places...');

    try {
      const ac = new google.maps.places.Autocomplete(inputRef.current!, {
        fields: ['formatted_address', 'geometry', 'place_id', 'name', 'address_components'],
        types: ['geocode', 'establishment'],
        componentRestrictions: { country: 'tn' },
      });

      console.log('🔧 Autocomplete créé avec succès');

      // Test pour vérifier que l'autocomplete fonctionne
      ac.addListener('place_changed', () => {
        console.log('🔧 TEST: Événement place_changed déclenché !');
      });

      if (placeChangedListenerRef.current) {
        placeChangedListenerRef.current.remove();
        placeChangedListenerRef.current = null;
      }

      placeChangedListenerRef.current = ac.addListener('place_changed', () => {
        console.log('🔧 Événement place_changed déclenché !');
        try {
          const place = ac.getPlace();
          
          console.log('🔍 Place object complet:', place);
          console.log('🔍 Formatted address:', place?.formatted_address);
          console.log('🔍 Name:', place?.name);
          console.log('🔍 Address components:', place?.address_components);
          
          // Utiliser exactement la même logique que AddressAutocomplete
          let cityName = '';
          if (place?.address_components) {
            const components = place.address_components;
            
            // Extraire les composants principaux
            const locality = components.find(c => c.types.includes('locality'))?.long_name || '';
            const administrativeArea = components.find(c => c.types.includes('administrative_area_level_1'))?.long_name || '';
            const country = components.find(c => c.types.includes('country'))?.long_name || '';
            
            // Construire la ville avec le pays en anglais
            const addressParts = [];
            
            // Ville
            const city = locality || administrativeArea || place.name || '';
            if (city) {
              addressParts.push(city);
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
            
            cityName = addressParts.join(', ');
            console.log('🔍 Ville avec pays construite:', cityName);
          }
          
          // Fallback sur formatted_address si pas d'address_components
          if (!cityName) {
            cityName = place?.formatted_address ?? place?.name ?? '';
            console.log('🔍 Fallback formatted_address:', cityName);
          }
          
          console.log('🏙️ Ville finale sélectionnée:', cityName);
          // Utiliser les refs pour éviter les dépendances
          onChangeRef.current(cityName);
          
          // Retirer le focus après sélection
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
  }, [isGoogleMapsLoaded]); // Plus de dépendances onChange !

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('🔧 Input change:', e.target.value);
    console.log('🔧 Input element:', e.target);
    console.log('🔧 Input ref:', inputRef.current);
    onChange(e.target.value);
  };

  return (
    <div className={`relative w-full ${className}`}>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
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
          onChange={handleInputChange}
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
        <p className="text-xs text-gray-500 mt-1">Autocomplétion en attente du chargement de Google Maps…</p>
      )}

      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};