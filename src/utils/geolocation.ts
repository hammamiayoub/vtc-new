// Service de calcul de distance et tarification
export interface Coordinates {
  latitude: number;
  longitude: number;
}

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

// Fonction pour calculer la distance routière entre deux points
export const calculateDrivingDistance = async (
  startLat: number,
  startLon: number,
  endLat: number,
  endLon: number
): Promise<number | null> => {
  try {
    // Utiliser l'API OSRM (Open Source Routing Machine) - gratuite et sans clé API
    const response = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${startLon},${startLat};${endLon},${endLat}?overview=false&alternatives=false&steps=false`
    );

    if (!response.ok) {
      console.warn('Erreur API OSRM, utilisation de la distance à vol d\'oiseau');
      return calculateDistance(startLat, startLon, endLat, endLon);
    }

    const data = await response.json();
    
    if (data.routes && data.routes.length > 0) {
      const distance = data.routes[0].distance / 1000; // Convertir en km
      return Math.round(distance * 100) / 100; // Arrondir à 2 décimales
    }

    // Fallback vers la distance à vol d'oiseau
    return calculateDistance(startLat, startLon, endLat, endLon);
  } catch (error) {
    console.error('Erreur lors du calcul de la distance routière:', error);
    // Fallback vers la distance à vol d'oiseau
    return calculateDistance(startLat, startLon, endLat, endLon);
  }
};

// Fonction pour obtenir le tarif par kilomètre selon la distance
export const getPricePerKm = (distanceKm: number): { price: number; discount: string } => {
  if (distanceKm >= 25 && distanceKm < 100) {
    // Distance 25–100 km → 2.0 TND/km
    return { price: 2.0, discount: '' };
  } else if (distanceKm >= 100 && distanceKm < 250) {
    // Distance 100–250 km → 1.75 TND/km
    return { price: 1.75, discount: '' };
  } else if (distanceKm >= 250) {
    // Distance 250 km+ → 1.55 TND/km
    return { price: 1.55, discount: '' };
  } else {
    // Distance < 25 km → tarif de base (2.0 TND/km)
    return { price: 2.0, discount: '' };
  }
};

// Fonction pour obtenir le multiplicateur selon le type de véhicule
export const getVehicleMultiplier = (vehicleType?: string): number => {
  switch (vehicleType) {
    case 'sedan':
      return 1.0;
    case 'pickup':
      return 1.25;
    case 'suv':
      return 1.0;
    case 'van':
      return 1.5;
    case 'minibus':
      return 2.5;
    case 'bus':
      return 3.5;
    case 'truck':
      return 1.5;
    case 'utility':
      return 1.25;
    case 'limousine':
      return 2.5;
    default:
      return 1.0; // Tarif par défaut pour les types non reconnus
  }
};

// Interface pour les suppléments de prix
export interface PriceSurcharges {
  isNightTime: boolean;
  isWeekend: boolean;
  nightSurchargePercent: number;
  weekendSurchargePercent: number;
  totalSurchargePercent: number;
  totalSurcharge: number;
}

// Fonction pour calculer les suppléments (nuit et week-end)
export const calculateSurcharges = (scheduledTime: string | Date, basePrice: number): PriceSurcharges => {
  const date = new Date(scheduledTime);
  const hour = date.getHours();
  const dayOfWeek = date.getDay(); // 0 = Dimanche, 6 = Samedi
  
  // Vérifier si c'est la nuit (à partir de 21h jusqu'à 6h du matin)
  const isNightTime = hour >= 21 || hour < 6;
  
  // Vérifier si c'est le week-end (Samedi ou Dimanche)
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  
  // Calculer les pourcentages de supplément
  const nightSurchargePercent = isNightTime ? 15 : 0;
  const weekendSurchargePercent = isWeekend ? 10 : 0;
  
  // Les suppléments sont cumulatifs
  const totalSurchargePercent = nightSurchargePercent + weekendSurchargePercent;
  const totalSurcharge = basePrice * (totalSurchargePercent / 100);
  
  return {
    isNightTime,
    isWeekend,
    nightSurchargePercent,
    weekendSurchargePercent,
    totalSurchargePercent,
    totalSurcharge: Math.round(totalSurcharge * 100) / 100
  };
};

// Fonction pour calculer le prix selon le nouveau schéma tarifaire avec type de véhicule
export const calculatePrice = (distanceKm: number, vehicleType?: string): number => {
  const { price: pricePerKm } = getPricePerKm(distanceKm);
  const basePrice = distanceKm * pricePerKm;
  const vehicleMultiplier = getVehicleMultiplier(vehicleType);
  const totalPrice = basePrice * vehicleMultiplier;
  return Math.round(totalPrice * 100) / 100; // Arrondir à 2 décimales
};

// Fonction pour calculer le prix avec les suppléments
export const calculatePriceWithSurcharges = (
  distanceKm: number, 
  vehicleType: string | undefined, 
  scheduledTime: string | Date,
  isReturnTrip: boolean = false
): { basePrice: number; surcharges: PriceSurcharges; finalPrice: number } => {
  // Calculer le prix de base
  let basePrice = calculatePrice(distanceKm, vehicleType);
  
  // Appliquer le multiplicateur pour le trajet retour
  if (isReturnTrip) {
    basePrice = basePrice * 1.8; // 80% de majoration pour le retour
  }
  
  const surcharges = calculateSurcharges(scheduledTime, basePrice);
  const finalPrice = Math.round((basePrice + surcharges.totalSurcharge) * 100) / 100;
  
  return {
    basePrice,
    surcharges,
    finalPrice
  };
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
      () => {
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

// Coordonnées approximatives des principales villes tunisiennes
const cityCoordinates: Record<string, Coordinates> = {
  'Tunis': { latitude: 36.8064, longitude: 10.1815 },
  'Ariana': { latitude: 36.8625, longitude: 10.1956 },
  'Ben Arous': { latitude: 36.7531, longitude: 10.2189 },
  'Manouba': { latitude: 36.8101, longitude: 10.0970 },
  'Bizerte': { latitude: 37.2746, longitude: 9.8739 },
  'Nabeul': { latitude: 36.4510, longitude: 10.7376 },
  'Hammamet': { latitude: 36.4008, longitude: 10.6223 },
  'Sousse': { latitude: 35.8256, longitude: 10.6411 },
  'Monastir': { latitude: 35.7770, longitude: 10.8262 },
  'Mahdia': { latitude: 35.5047, longitude: 11.0622 },
  'Sfax': { latitude: 34.7406, longitude: 10.7603 },
  'Gabès': { latitude: 33.8815, longitude: 10.0982 },
  'Gafsa': { latitude: 34.4250, longitude: 8.7842 },
  'Kairouan': { latitude: 35.6812, longitude: 10.0963 },
  'Kasserine': { latitude: 35.1676, longitude: 8.8365 },
  'Le Kef': { latitude: 36.1826, longitude: 8.7140 },
  'Jendouba': { latitude: 36.5011, longitude: 8.7802 },
  'Béja': { latitude: 36.7333, longitude: 9.1833 },
  'Zaghouan': { latitude: 36.4029, longitude: 10.1429 },
  'Siliana': { latitude: 36.0833, longitude: 9.3667 },
  'Médenine': { latitude: 33.3540, longitude: 10.5050 },
  'Tataouine': { latitude: 32.9297, longitude: 10.4518 },
  'Tozeur': { latitude: 33.9197, longitude: 8.1335 },
  'Kebili': { latitude: 33.7060, longitude: 8.9710 },
  'Sidi Bouzid': { latitude: 35.0380, longitude: 9.4850 }
};

// Fonction pour obtenir les coordonnées d'une ville
export const getCityCoordinates = (cityName: string): Coordinates | null => {
  const normalizedCity = cityName.trim();
  
  // Recherche exacte
  if (cityCoordinates[normalizedCity]) {
    return cityCoordinates[normalizedCity];
  }
  
  // Recherche approximative (insensible à la casse)
  const cityKey = Object.keys(cityCoordinates).find(
    key => key.toLowerCase() === normalizedCity.toLowerCase()
  );
  
  if (cityKey) {
    return cityCoordinates[cityKey];
  }
  
  return null;
};
