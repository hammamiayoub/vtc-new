// Service de géocodage et calcul de distance
export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface GeocodeResult {
  coordinates: Coordinates;
  formattedAddress: string;
}

// Fonction pour géocoder une adresse en Tunisie
export const geocodeAddress = async (address: string): Promise<GeocodeResult | null> => {
  try {
    // Utiliser l'API Nominatim d'OpenStreetMap (gratuite)
    const encodedAddress = encodeURIComponent(`${address}, Tunisia`);
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1&countrycodes=tn`
    );
    
    if (!response.ok) {
      throw new Error('Erreur lors du géocodage');
    }
    
    const data = await response.json();
    
    if (data && data.length > 0) {
      const result = data[0];
      return {
        coordinates: {
          latitude: parseFloat(result.lat),
          longitude: parseFloat(result.lon)
        },
        formattedAddress: result.display_name
      };
    }
    
    return null;
  } catch (error) {
    console.error('Erreur de géocodage:', error);
    return null;
  }
};

// Fonction pour calculer la distance entre deux points (formule de Haversine)
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Rayon de la Terre en kilomètres
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  return Math.round(distance * 100) / 100; // Arrondir à 2 décimales
};

// Fonction pour calculer le prix (2,5 TND par km)
export const calculatePrice = (distanceKm: number): number => {
  let pricePerKm: number;
  
  // Grille tarifaire par tranches de distance
  if (distanceKm <= 20) {
    pricePerKm = 2.5; // Tarif de base
  } else if (distanceKm <= 30) {
    pricePerKm = 3.0; // 20-30km : 3 TND/km
  } else if (distanceKm <= 50) {
    pricePerKm = 2.5; // 30-50km : 2.5 TND/km
  } else {
    pricePerKm = 2.2; // +50km : 2.2 TND/km
  }
  
  const basePrice = distanceKm * pricePerKm;
  return Math.round(basePrice * 100) / 100; // Arrondir à 2 décimales
};

// Obtenir la position actuelle de l'utilisateur
export const getCurrentPosition = (): Promise<Coordinates> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('La géolocalisation n\'est pas supportée par ce navigateur'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
      },
      (error) => {
        reject(new Error('Impossible d\'obtenir votre position'));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      }
    );
  });
};

// Adresses populaires en Tunisie pour l'autocomplétion
export const popularAddresses = [
  'Avenue Habib Bourguiba, Tunis',
  'Aéroport Tunis-Carthage',
  'Gare de Tunis',
  'Centre Ville, Tunis',
  'La Marsa',
  'Sidi Bou Said',
  'Carthage',
  'Ariana',
  'Ben Arous',
  'Nabeul',
  'Hammamet',
  'Sousse Centre',
  'Monastir',
  'Mahdia',
  'Kairouan',
  'Bizerte',
  'Gabès',
  'Sfax Centre',
  'Tozeur',
  'Djerba - Houmt Souk'
];

// Villes principales de Tunisie pour l'autocomplétion des résidences
export const tunisianCities = [
  'Tunis',
  'Sfax',
  'Sousse',
  'Kairouan',
  'Bizerte',
  'Gabès',
  'Ariana',
  'Gafsa',
  'Monastir',
  'Ben Arous',
  'Kasserine',
  'Médenine',
  'Nabeul',
  'Tataouine',
  'Beja',
  'Jendouba',
  'Mahdia',
  'Sidi Bouzid',
  'Siliana',
  'Manouba',
  'Kef',
  'Tozeur',
  'Kebili',
  'Zaghouan',
  'La Marsa',
  'Sidi Bou Said',
  'Carthage',
  'Hammamet',
  'Djerba',
  'Zarzis',
  'Douz',
  'Nefta'
];

// Fonction pour rechercher des villes tunisiennes
export const searchTunisianCities = async (query: string): Promise<string[]> => {
  if (!query || query.length < 2) return [];
  
  // Recherche locale d'abord
  const localResults = tunisianCities.filter(city => 
    city.toLowerCase().includes(query.toLowerCase())
  );
  
  // Si on a des résultats locaux, les retourner
  if (localResults.length > 0) {
    return localResults.slice(0, 5);
  }
  
  // Sinon, recherche via l'API Nominatim
  try {
    const encodedQuery = encodeURIComponent(`${query}, Tunisia`);
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodedQuery}&limit=5&countrycodes=tn&featureType=city`
    );
    
    if (!response.ok) {
      return localResults;
    }
    
    const data = await response.json();
    
    if (data && data.length > 0) {
      return data.map((result: any) => {
        // Extraire le nom de la ville du display_name
        const parts = result.display_name.split(',');
        return parts[0].trim();
      }).filter((city: string, index: number, arr: string[]) => 
        // Supprimer les doublons
        arr.indexOf(city) === index
      ).slice(0, 5);
    }
    
    return localResults;
  } catch (error) {
    console.error('Erreur lors de la recherche de villes:', error);
    return localResults;
  }
};