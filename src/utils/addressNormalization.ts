/**
 * Utilitaires pour la normalisation et la comparaison d'adresses
 */

export interface NormalizedAddress {
  original: string;
  normalized: string;
  city: string;
  country: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

/**
 * Normalise une adresse pour la comparaison
 * @param address - L'adresse à normaliser
 * @returns L'adresse normalisée
 */
export const normalizeAddress = (address: string): string => {
  if (!address) return '';

  return address
    // Convertir en minuscules
    .toLowerCase()
    // Supprimer les espaces multiples
    .replace(/\s+/g, ' ')
    // Supprimer les espaces en début et fin
    .trim()
    // Supprimer les caractères spéciaux et accents
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    // Supprimer les virgules et points en fin
    .replace(/[,.]$/, '')
    // Normaliser les variantes de pays
    .replace(/\btunisie\b/g, 'tunisia')
    .replace(/\btunis\b/g, 'tunis')
    .replace(/\bnabeul\b/g, 'nabeul')
    .replace(/\bsfax\b/g, 'sfax')
    .replace(/\bsousse\b/g, 'sousse')
    .replace(/\bmonastir\b/g, 'monastir')
    .replace(/\bjerba\b/g, 'jerba')
    .replace(/\bdjerba\b/g, 'jerba')
    .replace(/\bzarzis\b/g, 'zarzis')
    .replace(/\bhammamet\b/g, 'hammamet')
    .replace(/\benfidha\b/g, 'enfidha')
    .replace(/\btabarka\b/g, 'tabarka')
    .replace(/\bbizerte\b/g, 'bizerte')
    .replace(/\bbizert\b/g, 'bizerte')
    .replace(/\bkairouan\b/g, 'kairouan')
    .replace(/\bgafsa\b/g, 'gafsa')
    .replace(/\btozeur\b/g, 'tozeur')
    .replace(/\btataouine\b/g, 'tataouine')
    .replace(/\bmedenine\b/g, 'medenine')
    .replace(/\bkebili\b/g, 'kebili')
    .replace(/\bsiliana\b/g, 'siliana')
    .replace(/\bzaghouan\b/g, 'zaghouan')
    .replace(/\bmanouba\b/g, 'manouba')
    .replace(/\bben arous\b/g, 'ben arous')
    .replace(/\bariana\b/g, 'ariana')
    .replace(/\bmehdia\b/g, 'mehdia')
    .replace(/\bkelibia\b/g, 'kelibia')
    .replace(/\bkorba\b/g, 'korba')
    .replace(/\bmenzel bourguiba\b/g, 'menzel bourguiba')
    .replace(/\bmenzel temime\b/g, 'menzel temime')
    .replace(/\bferryville\b/g, 'menzel bourguiba')
    .replace(/\bporto farina\b/g, 'menzel temime')
    // Supprimer les mots vides
    .replace(/\b(le|la|les|de|du|des|et|à|au|aux|en|dans|sur|sous|avec|pour|par|chez|vers|depuis|jusqu'à|jusqu'au|jusqu'aux)\b/g, '')
    // Supprimer les espaces multiples après suppression des mots vides
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Extrait la ville principale d'une adresse
 * @param address - L'adresse à analyser
 * @returns Le nom de la ville
 */
export const extractCity = (address: string): string => {
  const normalized = normalizeAddress(address);
  
  // Liste des villes tunisiennes principales
  const cities = [
    'tunis', 'sfax', 'sousse', 'monastir', 'jerba', 'zarzis', 'hammamet', 
    'enfidha', 'tabarka', 'bizerte', 'kairouan', 'gafsa', 'tozeur', 
    'tataouine', 'medenine', 'kebili', 'siliana', 'zaghouan', 'manouba',
    'ben arous', 'ariana', 'nabeul', 'mehdia', 'kelibia', 'korba',
    'menzel bourguiba', 'menzel temime'
  ];
  
  // Chercher la première ville trouvée dans l'adresse
  for (const city of cities) {
    if (normalized.includes(city)) {
      return city;
    }
  }
  
  // Si aucune ville n'est trouvée, retourner le premier mot
  const words = normalized.split(' ').filter(word => word.length > 2);
  return words[0] || normalized;
};

/**
 * Extrait le pays d'une adresse
 * @param address - L'adresse à analyser
 * @returns Le nom du pays
 */
export const extractCountry = (address: string): string => {
  const normalized = normalizeAddress(address);
  
  if (normalized.includes('tunisia') || normalized.includes('tunisie')) {
    return 'tunisia';
  }
  
  return 'tunisia'; // Par défaut pour la Tunisie
};

/**
 * Compare deux adresses pour déterminer si elles sont similaires
 * @param address1 - Première adresse
 * @param address2 - Deuxième adresse
 * @param threshold - Seuil de similarité (0-1, par défaut 0.8)
 * @returns true si les adresses sont similaires
 */
export const areAddressesSimilar = (
  address1: string, 
  address2: string, 
  threshold: number = 0.8
): boolean => {
  const normalized1 = normalizeAddress(address1);
  const normalized2 = normalizeAddress(address2);
  
  // Comparaison exacte
  if (normalized1 === normalized2) {
    return true;
  }
  
  // Comparaison par ville
  const city1 = extractCity(address1);
  const city2 = extractCity(address2);
  
  if (city1 === city2 && city1.length > 3) {
    return true;
  }
  
  // Calcul de similarité avec l'algorithme de Jaro-Winkler
  const similarity = calculateJaroWinklerSimilarity(normalized1, normalized2);
  
  return similarity >= threshold;
};

/**
 * Calcule la similarité entre deux chaînes avec l'algorithme de Jaro-Winkler
 * @param str1 - Première chaîne
 * @param str2 - Deuxième chaîne
 * @returns Score de similarité entre 0 et 1
 */
const calculateJaroWinklerSimilarity = (str1: string, str2: string): number => {
  if (str1 === str2) return 1.0;
  if (str1.length === 0 || str2.length === 0) return 0.0;
  
  const matchWindow = Math.floor(Math.max(str1.length, str2.length) / 2) - 1;
  if (matchWindow < 0) return 0.0;
  
  const str1Matches = new Array(str1.length).fill(false);
  const str2Matches = new Array(str2.length).fill(false);
  
  let matches = 0;
  let transpositions = 0;
  
  // Trouver les correspondances
  for (let i = 0; i < str1.length; i++) {
    const start = Math.max(0, i - matchWindow);
    const end = Math.min(i + matchWindow + 1, str2.length);
    
    for (let j = start; j < end; j++) {
      if (str2Matches[j] || str1[i] !== str2[j]) continue;
      str1Matches[i] = true;
      str2Matches[j] = true;
      matches++;
      break;
    }
  }
  
  if (matches === 0) return 0.0;
  
  // Compter les transpositions
  let k = 0;
  for (let i = 0; i < str1.length; i++) {
    if (!str1Matches[i]) continue;
    while (!str2Matches[k]) k++;
    if (str1[i] !== str2[k]) transpositions++;
    k++;
  }
  
  const jaro = (matches / str1.length + matches / str2.length + (matches - transpositions / 2) / matches) / 3;
  
  // Amélioration Winkler
  let prefix = 0;
  for (let i = 0; i < Math.min(str1.length, str2.length, 4); i++) {
    if (str1[i] === str2[i]) prefix++;
    else break;
  }
  
  return jaro + (0.1 * prefix * (1 - jaro));
};

/**
 * Crée un objet d'adresse normalisée
 * @param address - L'adresse originale
 * @param coordinates - Coordonnées optionnelles
 * @returns Objet d'adresse normalisée
 */
export const createNormalizedAddress = (
  address: string, 
  coordinates?: { latitude: number; longitude: number }
): NormalizedAddress => {
  return {
    original: address,
    normalized: normalizeAddress(address),
    city: extractCity(address),
    country: extractCountry(address),
    coordinates
  };
};

/**
 * Trouve l'adresse la plus similaire dans une liste
 * @param targetAddress - Adresse cible
 * @param addressList - Liste d'adresses à comparer
 * @param threshold - Seuil de similarité
 * @returns L'adresse la plus similaire ou null
 */
export const findMostSimilarAddress = (
  targetAddress: string,
  addressList: string[],
  threshold: number = 0.8
): string | null => {
  let bestMatch = null;
  let bestScore = 0;
  
  for (const address of addressList) {
    const similarity = calculateJaroWinklerSimilarity(
      normalizeAddress(targetAddress),
      normalizeAddress(address)
    );
    
    if (similarity > bestScore && similarity >= threshold) {
      bestScore = similarity;
      bestMatch = address;
    }
  }
  
  return bestMatch;
};

/**
 * Groupe les adresses similaires
 * @param addresses - Liste d'adresses
 * @param threshold - Seuil de similarité
 * @returns Groupes d'adresses similaires
 */
export const groupSimilarAddresses = (
  addresses: string[],
  threshold: number = 0.8
): string[][] => {
  const groups: string[][] = [];
  const processed = new Set<number>();
  
  for (let i = 0; i < addresses.length; i++) {
    if (processed.has(i)) continue;
    
    const group = [addresses[i]];
    processed.add(i);
    
    for (let j = i + 1; j < addresses.length; j++) {
      if (processed.has(j)) continue;
      
      if (areAddressesSimilar(addresses[i], addresses[j], threshold)) {
        group.push(addresses[j]);
        processed.add(j);
      }
    }
    
    groups.push(group);
  }
  
  return groups;
};
