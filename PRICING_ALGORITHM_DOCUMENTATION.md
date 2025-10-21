# 🧮 Algorithme de calcul du prix des trajets

## 📍 **Localisation des fichiers**

L'algorithme de calcul du prix est configuré dans le fichier :
**`src/utils/geolocation.ts`** (lignes 98-196)

## 🔄 **Flux de calcul du prix**

### **1. Calcul de la distance**

#### **A. Distance routière (priorité)**
```typescript
// Fonction : calculateDrivingDistance()
// API utilisée : OSRM (Open Source Routing Machine)
// URL : https://router.project-osrm.org/route/v1/driving/
```

#### **B. Distance à vol d'oiseau (fallback)**
```typescript
// Fonction : calculateDistance()
// Formule : Haversine
// Rayon de la Terre : 6371 km
```

### **2. Calcul du prix de base**

#### **A. Tarif par kilomètre selon la distance**
```typescript
// Fonction : getPricePerKm(distanceKm)
const basePricePerKm = 1.5; // TND/KM

if (distanceKm >= 30 && distanceKm < 100) {
  return { price: 1.5, discount: '' }; // Plein tarif
} else if (distanceKm >= 100 && distanceKm < 250) {
  return { price: 1.35, discount: '(-10%)' }; // -10%
} else if (distanceKm >= 250) {
  return { price: 1.20, discount: '(-20%)' }; // -20%
} else {
  return { price: 1.5, discount: '' }; // < 30km
}
```

#### **B. Multiplicateur selon le type de véhicule**
```typescript
// Fonction : getVehicleMultiplier(vehicleType)
switch (vehicleType) {
  case 'bus': return 3.5;        // ×3,5
  case 'minibus': return 2.5;   // ×2,5
  case 'limousine': return 2.0; // ×2,0
  case 'truck': return 2.0;     // ×2,0
  default: return 1.0;          // ×1,0 (berline, pickup, van, utilitaire)
}
```

#### **C. Prix de base**
```typescript
// Fonction : calculatePrice(distanceKm, vehicleType)
const { price: pricePerKm } = getPricePerKm(distanceKm);
const basePrice = distanceKm * pricePerKm;
const vehicleMultiplier = getVehicleMultiplier(vehicleType);
const totalPrice = basePrice * vehicleMultiplier;
```

### **3. Calcul des suppléments**

#### **A. Suppléments temporels**
```typescript
// Fonction : calculateSurcharges(scheduledTime, basePrice)
const hour = date.getHours();
const dayOfWeek = date.getDay();

// Nuit : 21h-6h → +15%
const isNightTime = hour >= 21 || hour < 6;
const nightSurchargePercent = isNightTime ? 15 : 0;

// Week-end : Samedi/Dimanche → +10%
const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
const weekendSurchargePercent = isWeekend ? 10 : 0;

// Suppléments cumulatifs
const totalSurchargePercent = nightSurchargePercent + weekendSurchargePercent;
```

#### **B. Prix final avec suppléments**
```typescript
// Fonction : calculatePriceWithSurcharges()
const basePrice = calculatePrice(distanceKm, vehicleType);
const surcharges = calculateSurcharges(scheduledTime, basePrice);
const finalPrice = basePrice + surcharges.totalSurcharge;
```

### **4. Trajet retour**

#### **Multiplicateur de trajet retour**
```typescript
// Dans BookingForm.tsx
const finalDistance = watchIsReturnTrip ? baseDistance * 2 : baseDistance;
const basePrice = calculatePrice(baseDistance, watchVehicleType);
const finalPrice = watchIsReturnTrip ? basePrice * 1.8 : basePrice;
```

## 📊 **Exemples de calcul**

### **Exemple 1 : Trajet simple**
- **Distance** : 50 km
- **Véhicule** : Berline
- **Heure** : 14h00 (jour de semaine)

```
1. Prix de base : 50 km × 1.5 TND/km = 75 TND
2. Multiplicateur véhicule : 75 TND × 1.0 = 75 TND
3. Suppléments : 0% (jour, semaine)
4. Prix final : 75 TND
```

### **Exemple 2 : Trajet avec suppléments**
- **Distance** : 50 km
- **Véhicule** : Berline
- **Heure** : 22h00 (nuit, semaine)

```
1. Prix de base : 50 km × 1.5 TND/km = 75 TND
2. Multiplicateur véhicule : 75 TND × 1.0 = 75 TND
3. Supplément nuit : 75 TND × 15% = 11.25 TND
4. Prix final : 75 TND + 11.25 TND = 86.25 TND
```

### **Exemple 3 : Trajet retour**
- **Distance** : 50 km
- **Véhicule** : Berline
- **Trajet retour** : Oui

```
1. Prix de base : 50 km × 1.5 TND/km = 75 TND
2. Multiplicateur retour : 75 TND × 1.8 = 135 TND
3. Prix final : 135 TND
```

### **Exemple 4 : Bus longue distance**
- **Distance** : 200 km
- **Véhicule** : Bus
- **Heure** : 14h00 (jour de semaine)

```
1. Prix de base : 200 km × 1.35 TND/km = 270 TND
2. Multiplicateur véhicule : 270 TND × 3.5 = 945 TND
3. Prix final : 945 TND
```

## 🔧 **Configuration des paramètres**

### **Tarifs par kilomètre**
```typescript
// Ligne 100 dans geolocation.ts
const basePricePerKm = 1.5; // Modifier cette valeur
```

### **Seuils de distance**
```typescript
// Lignes 102-114 dans geolocation.ts
if (distanceKm >= 30 && distanceKm < 100) {
  // Seuil 1 : 30-100 km
} else if (distanceKm >= 100 && distanceKm < 250) {
  // Seuil 2 : 100-250 km
} else if (distanceKm >= 250) {
  // Seuil 3 : 250+ km
}
```

### **Multiplicateurs véhicules**
```typescript
// Lignes 118-130 dans geolocation.ts
case 'bus': return 3.5;        // Modifier le multiplicateur
case 'minibus': return 2.5;    // Modifier le multiplicateur
case 'limousine': return 2.0;  // Modifier le multiplicateur
```

### **Suppléments temporels**
```typescript
// Lignes 155-156 dans geolocation.ts
const nightSurchargePercent = isNightTime ? 15 : 0;    // Modifier le %
const weekendSurchargePercent = isWeekend ? 10 : 0;     // Modifier le %
```

### **Multiplicateur trajet retour**
```typescript
// Ligne 176 dans BookingForm.tsx
const finalPrice = watchIsReturnTrip ? basePrice * 1.8 : basePrice;
// Modifier 1.8 pour changer le multiplicateur
```

## 🎯 **Points d'intégration**

### **Dans BookingForm.tsx**
- **Ligne 142** : `calculatePrice(baseDistance, watchVehicleType)`
- **Ligne 148** : `calculatePriceWithSurcharges()`
- **Ligne 195** : `calculateDrivingDistance()`
- **Ligne 310** : `calculateDrivingDistance()`

### **APIs externes utilisées**
1. **OSRM** : Calcul de distance routière
2. **Nominatim** : Géocodage des adresses
3. **Google Maps** : Autocomplétion des adresses

## 📈 **Optimisations possibles**

1. **Cache des distances** : Mémoriser les distances calculées
2. **API de tarification** : Intégrer une API de tarification dynamique
3. **Géolocalisation temps réel** : Utiliser la position GPS pour des calculs plus précis
4. **Tarifs saisonniers** : Ajouter des suppléments selon la saison

L'algorithme est entièrement configurable et modulaire ! 🎉
