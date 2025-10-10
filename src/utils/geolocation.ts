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
  const basePricePerKm = 1.5; // Tarif de base : 1,5 TND/KM
  
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

// Fonction pour obtenir le multiplicateur selon le type de véhicule
export const getVehicleMultiplier = (vehicleType?: string): number => {
  switch (vehicleType) {
    case 'bus':
      return 3.5; // Bus : ×3,5
    case 'minibus':
      return 2.5; // Minibus : ×2,5
    case 'limousine':
    case 'truck':
      return 2.0; // Limousine et Camion : ×2
    default:
      return 1.0; // Autres véhicules (berline, pickup, van, utilitaire) : tarif normal
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
  scheduledTime: string | Date
): { basePrice: number; surcharges: PriceSurcharges; finalPrice: number } => {
  const basePrice = calculatePrice(distanceKm, vehicleType);
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

// Adresses populaires en Tunisie pour l'autocomplétion
export const popularAddresses = [
  'Avenue Habib Bourguiba, Tunis',
  'Aéroport Tunis-Carthage',
  'Aéroport Enfidha-Hammamet',
  'Aéroport Djerba-Zarzis',
  'Aéroport de Monastir',
  'Aéroport de Sfax',
  'Aéroport de Tabarka',
  'Gare de Tunis',
  'Centre Ville, Tunis',
  'Ariana', 'Raoued', 'Kalaat el-Andalous', 'Ettadhamen', 'La Soukra', 'Mnihla', 'Sidi Thabet',
'Béja', 'Testour', 'Medjez el-Bab', 'Téboursouk', 'Goubellat', 'Amdoun', 'Nefza', 'Thibar',
'Ben Arous', 'Hammam Lif', 'Hammam Chott', 'Radès', 'Mégrine', 'Mohamedia', 'Fouchana', 'Bou Mhel', 'El Mourouj',
'Bizerte', 'Menzel Bourguiba', 'Mateur', 'Ras Jebel', 'Ghar El Melh', 'Menzel Jemil', 'Sejnane', 'Utique', 'El Alia', 'Tinja',
'Gabès', 'El Hamma', 'Mareth', 'Métouia', 'Ghannouch', 'Matmata', 'Chenini Nahal',
'Gafsa', 'Métlaoui', 'Redeyef', 'Moularès', 'El Ksar', 'El Guettar', 'Mdhila', 'Sened', 'Sidi Aïch', 'Belkhir',
'Jendouba', 'Aïn Draham', 'Tabarka', 'Bou Salem', 'Ghardimaou', 'Fernana', 'Oued Meliz', 'Balta-Bou Aouane',
'Kairouan', 'Sbikha', 'Chebika', 'Haffouz', 'Oueslatia', 'Bou Hajla', 'Nasrallah', 'Hajeb El Ayoun',
'Kasserine', 'Sbeitla', 'Fériana', 'Thala', 'Foussana', 'Hassi El Ferid', 'Majel Bel Abbès', 'El Ayoun',
'Kebili', 'Douz', 'Souk Lahad', 'Jemna', 'El Golaa', 'Faouar',
'Le Kef', 'Dahmani', 'Tajerouine', 'Nebeur', 'Kalaat Khasba', 'Sakiet Sidi Youssef', 'Jerissa', 'Kalâat Senan',
'Mahdia', 'Ksour Essef', 'Chebba', 'El Jem', 'Melloulèche', 'Bou Merdes', 'Sidi Alouane', 'Chorbane', 'Hbira',
'Manouba', 'Oued Ellil', 'Douar Hicher', 'Tebourba', 'Borj El Amri', 'El Battan', 'Mornaguia', 'Jedaida',
'Médenine', 'Zarzis', 'Djerba', 'Houmt Souk', 'Midoun', 'Ajim', 'Beni Khedache', 'Sidi Makhlouf',
'Monastir', 'Moknine', 'Ksibet el-Médiouni', 'Ksar Hellal', 'Jammel', 'Sahline', 'Teboulba', 'Bekalta', 'Lamta', 'Sayada',
'Nabeul', 'Hammamet', 'Korba', 'Dar Chaabane', 'Beni Khiar', 'Kelibia', 'Menzel Temime', 'Takelsa', 'Soliman', 'Bou Argoub', 'Grombalia', 'Menzel Bouzelfa', 'Haouaria', 'Beni Khalled',
'Sfax', 'Mahres', 'Skhira', 'Kerkennah', 'Jebiniana', 'El Amra', 'Agareb', 'Chihia', 'Sakiet Ezzit', 'Sakiet Eddaïer', 'Thyna', 'Graïba', 'Bir Ali Ben Khalifa',
'Sidi Bouzid', 'Regueb', 'Meknassy', 'Bir El Hafey', 'Menzel Bouzaiane', 'Souk Jedid', 'Jelma', 'Ouled Haffouz',
'Siliana', 'Gaafour', 'Bargou', 'Makthar', 'El Krib', 'Kesra', 'Rouhia', 'Bou Arada',
'Sousse', 'Msaken', 'Kalaa Kebira', 'Kalaa Seghira', 'Akouda', 'Hammam Sousse', 'Hergla', 'Enfidha', 'Bouficha', 'Kondar',
'Tataouine', 'Remada', 'Ghomrassen', 'Bir Lahmar', 'Dehiba', 'Smar',
'Tozeur', 'Nefta', 'Degache', 'Tameghza', 'Hezoua',
'Tunis', 'Bab Souika', 'Bab El Bhar', 'Le Bardo', 'El Menzah', 'La Marsa', 'Sidi Bou Saïd', 'Carthage', 'El Kram', 'La Goulette',
'Zaghouan', 'Zriba', 'El Fahs', 'Bir Mcherga', 'Saouaf', 'Nadhour'
];

// Villes principales de Tunisie pour l'autocomplétion des résidences
export const tunisianCities = [
  'Ariana', 'Raoued', 'Kalaat el-Andalous', 'Ettadhamen', 'La Soukra', 'Mnihla', 'Sidi Thabet',
'Béja', 'Testour', 'Medjez el-Bab', 'Téboursouk', 'Goubellat', 'Amdoun', 'Nefza', 'Thibar',
'Ben Arous', 'Hammam Lif', 'Hammam Chott', 'Radès', 'Mégrine', 'Mohamedia', 'Fouchana', 'Bou Mhel', 'El Mourouj',
'Bizerte', 'Menzel Bourguiba', 'Mateur', 'Ras Jebel', 'Ghar El Melh', 'Menzel Jemil', 'Sejnane', 'Utique', 'El Alia', 'Tinja',
'Gabès', 'El Hamma', 'Mareth', 'Métouia', 'Ghannouch', 'Matmata', 'Chenini Nahal',
'Gafsa', 'Métlaoui', 'Redeyef', 'Moularès', 'El Ksar', 'El Guettar', 'Mdhila', 'Sened', 'Sidi Aïch', 'Belkhir',
'Jendouba', 'Aïn Draham', 'Tabarka', 'Bou Salem', 'Ghardimaou', 'Fernana', 'Oued Meliz', 'Balta-Bou Aouane',
'Kairouan', 'Sbikha', 'Chebika', 'Haffouz', 'Oueslatia', 'Bou Hajla', 'Nasrallah', 'Hajeb El Ayoun',
'Kasserine', 'Sbeitla', 'Fériana', 'Thala', 'Foussana', 'Hassi El Ferid', 'Majel Bel Abbès', 'El Ayoun',
'Kebili', 'Douz', 'Souk Lahad', 'Jemna', 'El Golaa', 'Faouar',
'Le Kef', 'Dahmani', 'Tajerouine', 'Nebeur', 'Kalaat Khasba', 'Sakiet Sidi Youssef', 'Jerissa', 'Kalâat Senan',
'Mahdia', 'Ksour Essef', 'Chebba', 'El Jem', 'Melloulèche', 'Bou Merdes', 'Sidi Alouane', 'Chorbane', 'Hbira',
'Manouba', 'Oued Ellil', 'Douar Hicher', 'Tebourba', 'Borj El Amri', 'El Battan', 'Mornaguia', 'Jedaida',
'Médenine', 'Zarzis', 'Djerba', 'Houmt Souk', 'Midoun', 'Ajim', 'Beni Khedache', 'Sidi Makhlouf',
'Monastir', 'Moknine', 'Ksibet el-Médiouni', 'Ksar Hellal', 'Jammel', 'Sahline', 'Teboulba', 'Bekalta', 'Lamta', 'Sayada',
'Nabeul', 'Hammamet', 'Korba', 'Dar Chaabane', 'Beni Khiar', 'Kelibia', 'Menzel Temime', 'Takelsa', 'Soliman', 'Bou Argoub', 'Grombalia', 'Menzel Bouzelfa', 'Haouaria', 'Beni Khalled',
'Sfax', 'Mahres', 'Skhira', 'Kerkennah', 'Jebiniana', 'El Amra', 'Agareb', 'Chihia', 'Sakiet Ezzit', 'Sakiet Eddaïer', 'Thyna', 'Graïba', 'Bir Ali Ben Khalifa',
'Sidi Bouzid', 'Regueb', 'Meknassy', 'Bir El Hafey', 'Menzel Bouzaiane', 'Souk Jedid', 'Jelma', 'Ouled Haffouz',
'Siliana', 'Gaafour', 'Bargou', 'Makthar', 'El Krib', 'Kesra', 'Rouhia', 'Bou Arada',
'Sousse', 'Msaken', 'Kalaa Kebira', 'Kalaa Seghira', 'Akouda', 'Hammam Sousse', 'Hergla', 'Enfidha', 'Bouficha', 'Kondar',
'Tataouine', 'Remada', 'Ghomrassen', 'Bir Lahmar', 'Dehiba', 'Smar',
'Tozeur', 'Nefta', 'Degache', 'Tameghza', 'Hezoua',
'Tunis', 'Bab Souika', 'Bab El Bhar', 'Le Bardo', 'El Menzah', 'La Marsa', 'Sidi Bou Saïd', 'Carthage', 'El Kram', 'La Goulette',
'Zaghouan', 'Zriba', 'El Fahs', 'Bir Mcherga', 'Saouaf', 'Nadhour'
];

// Coordonnées approximatives des principales villes tunisiennes
export const tunisianCityCoordinates: Record<string, Coordinates> = {
  'Tunis': { latitude: 36.8064, longitude: 10.1815 },
'Ariana': { latitude: 36.8625, longitude: 10.1956 },
'Ben Arous': { latitude: 36.7531, longitude: 10.2189 },
'Manouba': { latitude: 36.8101, longitude: 10.0970 },
'La Marsa': { latitude: 36.8781, longitude: 10.3240 },
'Sidi Bou Saïd': { latitude: 36.8700, longitude: 10.3414 },
'Carthage': { latitude: 36.8529, longitude: 10.3230 },
'El Kram': { latitude: 36.8357, longitude: 10.3132 },
'La Goulette': { latitude: 36.8183, longitude: 10.3050 },
'Le Bardo': { latitude: 36.8092, longitude: 10.1404 },
'El Menzah': { latitude: 36.8390, longitude: 10.1840 },

'Bizerte': { latitude: 37.2746, longitude: 9.8739 },
'Menzel Bourguiba': { latitude: 37.1536, longitude: 9.7850 },
'Mateur': { latitude: 37.0410, longitude: 9.6630 },
'Ras Jebel': { latitude: 37.2260, longitude: 10.1210 },
'Ghar El Melh': { latitude: 37.1700, longitude: 10.1900 },
'Menzel Jemil': { latitude: 37.2350, longitude: 9.9130 },
'Sejnane': { latitude: 37.0560, longitude: 9.2380 },
'Utique': { latitude: 37.0660, longitude: 10.0600 },
'El Alia': { latitude: 37.1680, longitude: 10.0300 },
'Tinja': { latitude: 37.1670, longitude: 9.7520 },

'Nabeul': { latitude: 36.4510, longitude: 10.7376 },
'Hammamet': { latitude: 36.4008, longitude: 10.6223 },
'Korba': { latitude: 36.5780, longitude: 10.8580 },
'Dar Chaabane': { latitude: 36.4630, longitude: 10.7440 },
'Beni Khiar': { latitude: 36.4690, longitude: 10.7830 },
'Kelibia': { latitude: 36.8481, longitude: 11.0939 },
'Menzel Temime': { latitude: 36.7810, longitude: 10.9870 },
'Takelsa': { latitude: 36.7890, longitude: 10.6420 },
'Soliman': { latitude: 36.6960, longitude: 10.4890 },
'Bou Argoub': { latitude: 36.5420, longitude: 10.5040 },
'Grombalia': { latitude: 36.6020, longitude: 10.5020 },
'Menzel Bouzelfa': { latitude: 36.6950, longitude: 10.5850 },
'Haouaria': { latitude: 37.0560, longitude: 11.0100 },
'Beni Khalled': { latitude: 36.6500, longitude: 10.6000 },

'Sousse': { latitude: 35.8256, longitude: 10.6411 },
'Msaken': { latitude: 35.7330, longitude: 10.5850 },
'Kalaa Kebira': { latitude: 35.8700, longitude: 10.5400 },
'Kalaa Seghira': { latitude: 35.8380, longitude: 10.5350 },
'Akouda': { latitude: 35.8690, longitude: 10.5650 },
'Hammam Sousse': { latitude: 35.8600, longitude: 10.5930 },
'Hergla': { latitude: 36.0300, longitude: 10.5000 },
'Enfidha': { latitude: 36.1300, longitude: 10.3800 },
'Bouficha': { latitude: 36.2400, longitude: 10.4200 },
'Kondar': { latitude: 35.9800, longitude: 10.1500 },

'Monastir': { latitude: 35.7770, longitude: 10.8262 },
'Moknine': { latitude: 35.6410, longitude: 10.8920 },
'Ksibet el-Médiouni': { latitude: 35.7200, longitude: 10.7800 },
'Ksar Hellal': { latitude: 35.6480, longitude: 10.8900 },
'Jammel': { latitude: 35.6340, longitude: 10.7590 },
'Sahline': { latitude: 35.7440, longitude: 10.7110 },
'Teboulba': { latitude: 35.6430, longitude: 10.9090 },
'Bekalta': { latitude: 35.6320, longitude: 10.9940 },
'Lamta': { latitude: 35.6750, longitude: 10.8790 },
'Sayada': { latitude: 35.6750, longitude: 10.8980 },

'Mahdia': { latitude: 35.5047, longitude: 11.0622 },
'Ksour Essef': { latitude: 35.4170, longitude: 10.9940 },
'Chebba': { latitude: 35.2370, longitude: 11.1160 },
'El Jem': { latitude: 35.3000, longitude: 10.7167 },
'Melloulèche': { latitude: 35.1800, longitude: 11.0500 },
'Bou Merdes': { latitude: 35.4500, longitude: 10.9000 },
'Sidi Alouane': { latitude: 35.3660, longitude: 10.9700 },
'Chorbane': { latitude: 35.3120, longitude: 10.3830 },
'Hbira': { latitude: 35.2500, longitude: 10.2500 },

'Sfax': { latitude: 34.7406, longitude: 10.7603 },
'Mahres': { latitude: 34.5330, longitude: 10.5000 },
'Skhira': { latitude: 34.3000, longitude: 10.0830 },
'Kerkennah': { latitude: 34.6400, longitude: 11.2200 },
'Jebiniana': { latitude: 35.0330, longitude: 10.9160 },
'El Amra': { latitude: 35.1660, longitude: 10.7830 },
'Agareb': { latitude: 34.7450, longitude: 10.5000 },
'Chihia': { latitude: 34.7620, longitude: 10.7360 },
'Sakiet Ezzit': { latitude: 34.7760, longitude: 10.7730 },
'Sakiet Eddaïer': { latitude: 34.7610, longitude: 10.7620 },
'Thyna': { latitude: 34.6850, longitude: 10.7030 },
'Graïba': { latitude: 34.3830, longitude: 10.1860 },
'Bir Ali Ben Khalifa': { latitude: 34.7330, longitude: 10.1000 },

'Gabès': { latitude: 33.8815, longitude: 10.0982 },
'El Hamma': { latitude: 33.8910, longitude: 9.7960 },
'Mareth': { latitude: 33.6110, longitude: 10.4500 },
'Métouia': { latitude: 33.9680, longitude: 10.0250 },
'Ghannouch': { latitude: 33.8830, longitude: 10.1000 },
'Matmata': { latitude: 33.5440, longitude: 9.9660 },
'Chenini Nahal': { latitude: 33.9000, longitude: 10.0830 },

'Gafsa': { latitude: 34.4250, longitude: 8.7842 },
'Métlaoui': { latitude: 34.3330, longitude: 8.4000 },
'Redeyef': { latitude: 34.3830, longitude: 8.1500 },
'Moularès': { latitude: 34.3500, longitude: 8.2500 },
'El Ksar': { latitude: 34.4160, longitude: 8.7830 },
'El Guettar': { latitude: 34.3660, longitude: 8.9500 },
'Mdhila': { latitude: 34.2500, longitude: 8.5500 },
'Sened': { latitude: 34.6500, longitude: 9.0000 },
'Sidi Aïch': { latitude: 34.6160, longitude: 9.1330 },
'Belkhir': { latitude: 34.4830, longitude: 9.1330 },

'Kairouan': { latitude: 35.6812, longitude: 10.0963 },
'Sbikha': { latitude: 35.9340, longitude: 10.0170 },
'Chebika': { latitude: 35.5960, longitude: 9.9350 },
'Haffouz': { latitude: 35.6320, longitude: 9.6780 },
'Oueslatia': { latitude: 35.8470, longitude: 9.6080 },
'Bou Hajla': { latitude: 35.3450, longitude: 10.0300 },
'Nasrallah': { latitude: 35.2960, longitude: 9.7890 },
'Hajeb El Ayoun': { latitude: 35.3900, longitude: 9.5300 },

'Kasserine': { latitude: 35.1676, longitude: 8.8365 },
'Sbeitla': { latitude: 35.2330, longitude: 9.1200 },
'Fériana': { latitude: 34.9500, longitude: 8.5830 },
'Thala': { latitude: 35.5660, longitude: 8.6660 },
'Foussana': { latitude: 35.3160, longitude: 8.5660 },
'Hassi El Ferid': { latitude: 35.1670, longitude: 8.7660 },
'Majel Bel Abbès': { latitude: 34.8580, longitude: 8.3550 },
'El Ayoun': { latitude: 35.5160, longitude: 8.6660 },

'Le Kef': { latitude: 36.1826, longitude: 8.7140 },
'Dahmani': { latitude: 35.9500, longitude: 8.8330 },
'Tajerouine': { latitude: 35.8730, longitude: 8.5520 },
'Nebeur': { latitude: 36.1500, longitude: 8.5330 },
'Kalaat Khasba': { latitude: 35.9660, longitude: 8.4330 },
'Sakiet Sidi Youssef': { latitude: 36.2200, longitude: 8.3560 },
'Jerissa': { latitude: 35.8700, longitude: 8.6460 },
'Kalâat Senan': { latitude: 35.8660, longitude: 8.3500 },

'Jendouba': { latitude: 36.5011, longitude: 8.7802 },
'Aïn Draham': { latitude: 36.7830, longitude: 8.6830 },
'Tabarka': { latitude: 36.9540, longitude: 8.7580 },
'Bou Salem': { latitude: 36.6110, longitude: 8.9730 },
'Ghardimaou': { latitude: 36.4500, longitude: 8.4330 },
'Fernana': { latitude: 36.6500, longitude: 8.6660 },
'Oued Meliz': { latitude: 36.4660, longitude: 8.5500 },
'Balta-Bou Aouane': { latitude: 36.5830, longitude: 8.7500 },

'Béja': { latitude: 36.7333, longitude: 9.1833 },
'Testour': { latitude: 36.5510, longitude: 9.4430 },
'Medjez El Bab': { latitude: 36.6490, longitude: 9.6120 },
'Téboursouk': { latitude: 36.4560, longitude: 9.2410 },
'Goubellat': { latitude: 36.5290, longitude: 9.6600 },
'Amdoun': { latitude: 36.7420, longitude: 9.2200 },
'Nefza': { latitude: 36.9830, longitude: 9.0000 },
'Thibar': { latitude: 36.5500, longitude: 9.2000 },

'Zaghouan': { latitude: 36.4029, longitude: 10.1429 },
'Zriba': { latitude: 36.4000, longitude: 10.1830 },
'El Fahs': { latitude: 36.3720, longitude: 9.9090 },
'Bir Mcherga': { latitude: 36.6160, longitude: 10.1800 },
'Saouaf': { latitude: 36.3500, longitude: 10.0330 },
'Nadhour': { latitude: 36.2830, longitude: 10.0500 },

'Siliana': { latitude: 36.0833, longitude: 9.3667 },
'Gaafour': { latitude: 36.3160, longitude: 9.3330 },
'Bargou': { latitude: 36.1300, longitude: 9.6000 },
'Makthar': { latitude: 35.8500, longitude: 9.2000 },
'El Krib': { latitude: 36.3330, longitude: 9.2000 },
'Kesra': { latitude: 35.8000, longitude: 9.2000 },
'Rouhia': { latitude: 35.9500, longitude: 9.2160 },
'Bou Arada': { latitude: 36.3500, longitude: 9.6160 },

'Médenine': { latitude: 33.3540, longitude: 10.5050 },
'Zarzis': { latitude: 33.5030, longitude: 11.1120 },
'Djerba': { latitude: 33.8000, longitude: 10.9000 },
'Houmt Souk': { latitude: 33.8750, longitude: 10.8570 },
'Midoun': { latitude: 33.8080, longitude: 10.9920 },
'Ajim': { latitude: 33.7260, longitude: 10.7550 },
'Beni Khedache': { latitude: 33.2590, longitude: 10.1740 },
'Sidi Makhlouf': { latitude: 33.5150, longitude: 10.5690 },

'Tataouine': { latitude: 32.9297, longitude: 10.4518 },
'Remada': { latitude: 32.3160, longitude: 10.4000 },
'Ghomrassen': { latitude: 33.0500, longitude: 10.3830 },
'Bir Lahmar': { latitude: 33.0830, longitude: 10.4160 },
'Dehiba': { latitude: 32.0200, longitude: 10.7000 },
'Smar': { latitude: 33.0330, longitude: 10.1830 },

'Tozeur': { latitude: 33.9197, longitude: 8.1335 },
'Nefta': { latitude: 33.8730, longitude: 7.8770 },
'Degache': { latitude: 33.9830, longitude: 8.2330 },
'Tameghza': { latitude: 34.3830, longitude: 7.9500 },
'Hezoua': { latitude: 33.8660, longitude: 7.8330 },

'Kebili': { latitude: 33.7060, longitude: 8.9710 },
'Douz': { latitude: 33.4600, longitude: 9.0200 },
'Souk Lahad': { latitude: 33.4720, longitude: 8.9730 },
'Jemna': { latitude: 33.5660, longitude: 9.0200 },
'El Golaa': { latitude: 33.4830, longitude: 8.9660 },
'Faouar': { latitude: 33.4430, longitude: 8.9740 },

'Sidi Bouzid': { latitude: 35.0380, longitude: 9.4850 },
'Regueb': { latitude: 34.8500, longitude: 9.8000 },
'Meknassy': { latitude: 34.5500, longitude: 9.6160 },
'Bir El Hafey': { latitude: 34.9330, longitude: 9.2000 },
'Menzel Bouzaiane': { latitude: 34.5830, longitude: 9.4660 },
'Souk Jedid': { latitude: 34.7660, longitude: 9.5330 },
'Jelma': { latitude: 35.2500, longitude: 9.2830 },
'Ouled Haffouz': { latitude: 35.1660, longitude: 9.2160 }
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
      return data.map((result: { display_name: string }) => {
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