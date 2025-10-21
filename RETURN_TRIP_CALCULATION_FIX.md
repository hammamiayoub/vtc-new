# 🔧 Correction du calcul du trajet retour

## 🎯 **Problème identifié**

- ❌ **Trajet retour non calculé** : Quand on coche "Trajet retour", le montant reste le même
- 🔍 **Cause racine** : La fonction `calculatePriceWithSurcharges` ne prenait pas en compte le paramètre `isReturnTrip`

## 🔧 **Solution appliquée**

### **1. Mise à jour de calculatePriceWithSurcharges**
```javascript
// Dans src/utils/geolocation.ts
export const calculatePriceWithSurcharges = (
  distanceKm: number, 
  vehicleType: string | undefined, 
  scheduledTime: string | Date,
  isReturnTrip: boolean = false  // ✅ Nouveau paramètre
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
```

### **2. Simplification de la logique de recalcul**
```javascript
// Dans BookingForm.tsx
// Calculer les suppléments (nuit et week-end) avec le paramètre isReturnTrip
const { surcharges, finalPrice } = calculatePriceWithSurcharges(
  baseDistance,
  watchVehicleType,
  watchScheduledTime,
  watchIsReturnTrip  // ✅ Passer le paramètre isReturnTrip
);

// Utiliser directement le résultat de calculatePriceWithSurcharges
setEstimatedPrice(finalPrice);
setPriceSurcharges(surcharges);
```

### **3. Suppression de la logique dupliquée**
- **Suppression** de la logique manuelle de calcul du trajet retour
- **Utilisation** de la fonction centralisée `calculatePriceWithSurcharges`
- **Cohérence** entre le calcul initial et le recalcul

## 🧪 **Test de validation**

### **1. Ouvrir l'application**
```
http://localhost:5176/
```

### **2. Test du trajet simple**

#### **Étape 1: Configuration de base**
1. **Sélectionner une adresse de départ** (ex: "Tunis, Tunisie")
2. **Sélectionner une adresse d'arrivée** (ex: "Sfax, Tunisie")
3. **Sélectionner un type de véhicule** (ex: "Berline")
4. **Vérifier** que la section de calcul s'affiche avec :
   - Distance estimée
   - Prix estimé (ex: 45.50 DT)

#### **Étape 2: Test du trajet retour**
1. **Cocher la case "Trajet retour"**
2. **Vérifier** que le prix change et augmente d'environ 80%
3. **Vérifier** que la distance affiche "(aller-retour)"
4. **Vérifier** que le prix affiche "(avec retour)"

#### **Étape 3: Test de décocher le trajet retour**
1. **Décocher la case "Trajet retour"**
2. **Vérifier** que le prix revient au prix initial
3. **Vérifier** que la distance ne montre plus "(aller-retour)"
4. **Vérifier** que le prix ne montre plus "(avec retour)"

#### **Étape 4: Test avec différents types de véhicules**
1. **Changer le type de véhicule** (ex: "SUV")
2. **Vérifier** que le prix change
3. **Cocher "Trajet retour"**
4. **Vérifier** que le prix augmente de 80% par rapport au nouveau prix

#### **Étape 5: Test avec date/heure programmée**
1. **Sélectionner une date/heure future**
2. **Vérifier** que les suppléments s'appliquent
3. **Cocher "Trajet retour"**
4. **Vérifier** que le prix avec retour inclut les suppléments

## 📊 **Calculs attendus**

### **Exemple de calcul :**
- **Distance** : 200 km
- **Type véhicule** : Berline (1.0x)
- **Prix de base** : 200 km × 0.5 DT/km = 100 DT

#### **Sans trajet retour :**
- **Prix final** : 100 DT

#### **Avec trajet retour :**
- **Prix de base** : 100 DT × 1.8 = 180 DT
- **Distance affichée** : 200 km (aller-retour)
- **Prix final** : 180 DT (avec retour)

### **Avec suppléments (nuit/week-end) :**
- **Prix de base avec retour** : 180 DT
- **Suppléments** : 180 DT × 20% = 36 DT
- **Prix final** : 180 DT + 36 DT = 216 DT

## 🎯 **Résultat attendu**

Après le test :
- ✅ **Trajet simple** : Prix normal
- ✅ **Trajet retour** : Prix × 1.8 (80% de majoration)
- ✅ **Distance** : Affichage correct "(aller-retour)"
- ✅ **Prix** : Affichage correct "(avec retour)"
- ✅ **Suppléments** : Appliqués sur le prix avec retour
- ✅ **Recalcul** : Automatique quand on coche/décoche

## 🔄 **Prochaines étapes**

1. **Tester le trajet simple** et vérifier le prix de base
2. **Tester le trajet retour** et vérifier l'augmentation de 80%
3. **Tester avec différents types de véhicules**
4. **Tester avec date/heure programmée**
5. **Vérifier l'affichage** des labels "(aller-retour)" et "(avec retour)"

Le calcul du trajet retour devrait maintenant fonctionner correctement ! 🎉
