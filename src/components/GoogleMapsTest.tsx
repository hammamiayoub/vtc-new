'use client';

import React, { useEffect, useState } from 'react';

const GoogleMapsTest: React.FC = () => {
  const [status, setStatus] = useState<string>('Initialisation...');
  const [apiKey, setApiKey] = useState<string>('');

  useEffect(() => {
    const testGoogleMaps = async () => {
      try {
        // Vérifier la clé API
        const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
        setApiKey(key || 'Non définie');
        
        if (!key || key === 'your_google_maps_api_key_here') {
          setStatus('❌ Clé API manquante ou non configurée');
          return;
        }

        setStatus('🔑 Clé API trouvée, chargement de Google Maps...');
        console.log('🔑 Clé API détectée:', key.substring(0, 20) + '...');

        // Tester le chargement de Google Maps directement
        console.log('📡 Chargement de Google Maps...');
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places&callback=googleMapsTestCallback`;
          script.async = true;
          script.defer = true;
          
          (window as any).googleMapsTestCallback = () => {
            console.log('✅ Google Maps chargé avec succès');
            resolve(true);
          };
          
          script.onerror = () => {
            console.error('❌ Erreur de chargement de Google Maps');
            reject(new Error('Erreur de chargement de Google Maps'));
          };
          
          document.head.appendChild(script);
        });
        
        setStatus('✅ Google Maps chargé avec succès !');
        console.log('✅ Google Maps chargé avec succès');
        
        // Tester l'objet google
        if (typeof window !== 'undefined' && window.google) {
          setStatus('✅ Google Maps entièrement fonctionnel !');
          console.log('✅ Objet google disponible:', !!window.google);
          console.log('✅ Places API disponible:', !!window.google.maps?.places);
          
          // Tester la nouvelle API PlaceAutocompleteElement
          try {
            const testElement = document.createElement('gmp-place-autocomplete');
            console.log('✅ PlaceAutocompleteElement disponible:', !!testElement);
            setStatus('✅ Google Maps + PlaceAutocompleteElement fonctionnel !');
          } catch (error) {
            console.log('⚠️ PlaceAutocompleteElement non disponible:', error);
          }
        }
        
      } catch (error) {
        setStatus(`❌ Erreur: ${error}`);
        console.error('❌ Erreur de test Google Maps:', error);
        
        // Diagnostic détaillé
        if (error instanceof Error) {
          if (error.message.includes('API key')) {
            setStatus('❌ Problème de clé API - Vérifiez Google Cloud Console');
          } else if (error.message.includes('referer')) {
            setStatus('❌ Problème de restrictions - Ajoutez localhost:5173');
          } else {
            setStatus(`❌ Erreur: ${error.message}`);
          }
        }
      }
    };

    testGoogleMaps();
  }, []);

  return (
    <div className="p-4 bg-gray-100 rounded-lg">
      <h3 className="font-semibold mb-2">Test Google Maps API</h3>
      <p><strong>Clé API:</strong> {apiKey.substring(0, 20)}...</p>
      <p><strong>Statut:</strong> {status}</p>
      {status.includes('✅') && (
        <p className="text-green-600 mt-2">🎉 L'autocomplétion devrait maintenant fonctionner !</p>
      )}
    </div>
  );
};

export default GoogleMapsTest;
