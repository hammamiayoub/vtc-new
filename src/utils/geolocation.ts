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
       `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&countrycodes=tn&limit=5&addressdetails=1`
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

// Fonction pour obtenir le tarif par kilomètre selon la distance
export const getPricePerKm = (distanceKm: number): { price: number; discount: string } => {
  const basePricePerKm = 2.2; // Tarif de base : 2,2 TND/KM
  
  if (distanceKm >= 30 && distanceKm < 100) {
    // Distance 30–100 km → plein tarif
    return { price: basePricePerKm, discount: '' };
  } else if (distanceKm >= 100 && distanceKm < 250) {
    // Distance 100–250 km → -10 %/km
    return { price: basePricePerKm * 0.9, discount: '(-10%)' };
  } else if (distanceKm >= 250) {
    // Distance 250 km+ → -20 %/km
    return { price: basePricePerKm * 0.8, discount: '(-20%)' };
  } else {
    // Distance < 30 km → tarif de base (2,2 TND/KM)
    return { price: basePricePerKm, discount: '' };
  }
};

// Fonction pour calculer le prix selon le nouveau schéma tarifaire
export const calculatePrice = (distanceKm: number): number => {
  const { price: pricePerKm } = getPricePerKm(distanceKm);
  const totalPrice = distanceKm * pricePerKm;
  return Math.round(totalPrice * 100) / 100; // Arrondir à 2 décimales
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

// Coordonnées approximatives des principales villes tunisiennes
export const tunisianCityCoordinates: Record<string, Coordinates> = {
  'Tunis': { latitude: 36.8065, longitude: 10.1815 },
  'Sfax': { latitude: 34.7406, longitude: 10.7603 },
  'Sousse': { latitude: 35.8256, longitude: 10.6369 },
  'Kairouan': { latitude: 35.6781, longitude: 10.0963 },
  'Bizerte': { latitude: 37.2744, longitude: 9.8739 },
  'Gabès': { latitude: 33.8815, longitude: 10.0982 },
  'Ariana': { latitude: 36.8625, longitude: 10.1956 },
  'Gafsa': { latitude: 34.4250, longitude: 8.7842 },
  'Monastir': { latitude: 35.7643, longitude: 10.8113 },
  'Ben Arous': { latitude: 36.7539, longitude: 10.2189 },
  'Kasserine': { latitude: 35.1674, longitude: 8.8363 },
  'Médenine': { latitude: 33.3549, longitude: 10.5055 },
  'Nabeul': { latitude: 36.4561, longitude: 10.7376 },
  'Tataouine': { latitude: 32.9297, longitude: 10.4517 },
  'Beja': { latitude: 36.7256, longitude: 9.1817 },
  'Jendouba': { latitude: 36.5014, longitude: 8.7800 },
  'Mahdia': { latitude: 35.5047, longitude: 11.0622 },
  'Sidi Bouzid': { latitude: 35.0381, longitude: 9.4858 },
  'Siliana': { latitude: 36.0836, longitude: 9.3706 },
  'Manouba': { latitude: 36.8103, longitude: 10.0964 },
  'Kef': { latitude: 36.1742, longitude: 8.7050 },
  'Tozeur': { latitude: 33.9197, longitude: 8.1339 },
  'Kebili': { latitude: 33.7047, longitude: 8.9694 },
  'Zaghouan': { latitude: 36.4028, longitude: 10.1425 },
  'La Marsa': { latitude: 36.8781, longitude: 10.3247 },
  'Sidi Bou Said': { latitude: 36.8708, longitude: 10.3469 },
  'Carthage': { latitude: 36.8531, longitude: 10.3314 },
  'Hammamet': { latitude: 36.4000, longitude: 10.6167 },
  'Djerba': { latitude: 33.8076, longitude: 10.8451 },
  'Zarzis': { latitude: 33.5056, longitude: 11.1122 },
  'Douz': { latitude: 33.4664, longitude: 9.0203 },
  'Nefta': { latitude: 33.8731, longitude: 7.8775 }
};

// Fonction pour obtenir les coordonnées d'une ville
export const getCityCoordinates = async (cityName: string): Promise<Coordinates | null> => {
  // D'abord, chercher dans notre base de données locale
  const normalizedCity = cityName.trim();
  
  // Recherche exacte
  if (tunisianCityCoordinates[normalizedCity]) {
    return tunisianCityCoordinates[normalizedCity];
  }
  
  // Recherche approximative (insensible à la casse)
  const cityKey = Object.keys(tunisianCityCoordinates).find(
    key => key.toLowerCase() === normalizedCity.toLowerCase()
  );
  
  if (cityKey) {
    return tunisianCityCoordinates[cityKey];
  }
  
  // Si pas trouvé localement, utiliser l'API de géocodage
  try {
    const result = await geocodeAddress(cityName);
    return result?.coordinates || null;
  } catch (error) {
    console.error('Erreur lors du géocodage de la ville:', error);
    return null;
  }
};

// Fonction pour calculer la distance entre une ville et des coordonnées
export const calculateDistanceFromCity = async (
  cityName: string,
  targetCoordinates: Coordinates
): Promise<number | null> => {
  const cityCoordinates = await getCityCoordinates(cityName);
  
  if (!cityCoordinates) {
    return null;
  }
  
  return calculateDistance(
    cityCoordinates.latitude,
    cityCoordinates.longitude,
    targetCoordinates.latitude,
    targetCoordinates.longitude
  );
};

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