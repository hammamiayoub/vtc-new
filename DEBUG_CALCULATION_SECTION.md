# 🔍 Diagnostic de la section de calcul

## 🎯 **Objectif**

Identifier pourquoi la section de calcul de distance et prix ne s'affiche pas après la saisie des adresses et du type de véhicule.

## 🔧 **Debug ajouté**

### **1. Logs de console**
```javascript
console.log('🔍 Debug section calcul:', {
  estimatedDistance,
  estimatedPrice,
  isCalculating,
  pickupCoords,
  destinationCoords,
  watchVehicleType
});
```

### **2. Affichage visuel de debug**
Une section jaune s'affiche maintenant avec les valeurs en temps réel :
- Distance: null/XX km
- Prix: null/XX TND
- Calcul en cours: Oui/Non
- Coords départ: null/XX.XX, XX.XX
- Coords arrivée: null/XX.XX, XX.XX
- Type véhicule: null/standard

## 🧪 **Test de diagnostic**

### **1. Ouvrir l'application**
```
http://localhost:5176/
```

### **2. Aller sur le formulaire de réservation**
1. **Sélectionner une adresse de départ** avec l'autocomplétion
2. **Sélectionner une adresse d'arrivée** avec l'autocomplétion
3. **Choisir un type de véhicule** (Standard, Premium, etc.)
4. **Observer la section de debug** qui s'affiche

### **3. Analyser les valeurs**

#### **Si toutes les valeurs sont null :**
- ❌ **Coords départ/arrivée null** → Problème avec l'autocomplétion Google Maps
- ❌ **Type véhicule null** → Problème avec la sélection du type de véhicule

#### **Si les coords sont définies mais distance/prix null :**
- ❌ **Calcul ne se déclenche pas** → Problème dans le useEffect
- ❌ **Erreur dans le calcul** → Vérifier la console pour les erreurs

#### **Si distance est définie mais prix null :**
- ❌ **Type de véhicule non sélectionné** → Vérifier la sélection
- ❌ **Erreur dans le calcul de prix** → Vérifier la fonction calculatePriceWithSurcharges

## 🔍 **Diagnostic par étapes**

### **Étape 1: Vérifier l'autocomplétion**
```
1. Taper dans le champ "Point de départ"
2. Vérifier que des suggestions apparaissent
3. Cliquer sur une suggestion
4. Vérifier que "Coords départ" n'est plus null
```

### **Étape 2: Vérifier la sélection du type de véhicule**
```
1. Cliquer sur le type de véhicule
2. Vérifier que "Type véhicule" n'est plus null
3. Vérifier que le calcul se déclenche
```

### **Étape 3: Vérifier les logs de console**
```
1. Ouvrir F12 → Console
2. Chercher les messages :
   - "📍 En attente des coordonnées Google Maps..."
   - "📍 Calcul avec les coordonnées Google Maps..."
   - "✅ Distance calculée: XX km"
   - "💰 Prix calculé: {...}"
```

## 🚨 **Problèmes courants**

### **1. Autocomplétion ne fonctionne pas**
- **Symptôme** : Pas de suggestions, coords restent null
- **Solution** : Vérifier que Google Maps est chargé, clé API correcte

### **2. Type de véhicule non sélectionné**
- **Symptôme** : Type véhicule reste null
- **Solution** : Vérifier que le formulaire est correctement configuré

### **3. Calcul ne se déclenche pas**
- **Symptôme** : Coords définies mais distance/prix null
- **Solution** : Vérifier les dépendances du useEffect

### **4. Erreur dans le calcul**
- **Symptôme** : Erreurs dans la console
- **Solution** : Vérifier les fonctions de calcul, API OSRM

## 📊 **Messages de console attendus**

### **Séquence normale :**
```
📍 En attente des coordonnées Google Maps...
📍 Calcul avec les coordonnées Google Maps: {pickup: {...}, destination: {...}}
✅ Distance calculée: XX km
🚗 Type de véhicule sélectionné: standard
💰 Prix calculé: {basePrice: XX, surcharges: {...}, finalPrice: XX}
✅ Distance et prix mis à jour: {distance: XX, price: XX, isReturnTrip: false}
```

### **Séquence avec erreur :**
```
❌ Erreur lors du calcul de la route: [erreur]
❌ Google Maps n'est pas chargé après l'initialisation
```

## 🎯 **Résultat attendu**

Après le diagnostic :
- ✅ **Section de debug visible** avec toutes les valeurs
- ✅ **Coords départ/arrivée définies** après sélection d'adresses
- ✅ **Type véhicule défini** après sélection
- ✅ **Distance et prix calculés** automatiquement
- ✅ **Section de calcul s'affiche** quand toutes les conditions sont remplies

## 🔄 **Prochaines étapes**

1. **Tester l'application** avec le debug activé
2. **Identifier la valeur manquante** dans la section de debug
3. **Corriger le problème** selon le diagnostic
4. **Retirer le debug** une fois le problème résolu

Le debug devrait révéler exactement pourquoi la section ne s'affiche pas ! 🔍
