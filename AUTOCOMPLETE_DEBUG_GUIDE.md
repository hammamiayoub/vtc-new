# 🔍 Guide de diagnostic de l'autocomplétion

## 🎯 **Problème identifié**

Les coordonnées de départ et d'arrivée sont **null**, ce qui empêche l'affichage de la section de calcul.

## 🔧 **Debug ajouté**

### **1. Logs dans les handlers**
```javascript
console.log('🔍 handlePickupPlaceSelect appelé avec:', place);
console.log('🔍 handleDestinationPlaceSelect appelé avec:', place);
```

### **2. Vérification de la géométrie**
```javascript
if (place.geometry?.location) {
  // Coordonnées disponibles
} else {
  console.log('❌ Pas de géométrie dans le lieu sélectionné:', place);
}
```

## 🧪 **Test de diagnostic**

### **1. Ouvrir l'application**
```
http://localhost:5176/
```

### **2. Aller sur le formulaire de réservation**

### **3. Tester l'autocomplétion étape par étape**

#### **Étape 1: Tester le champ de départ**
1. **Cliquer dans le champ "Point de départ"**
2. **Taper quelques lettres** (ex: "Tunis")
3. **Vérifier que des suggestions apparaissent**
4. **Cliquer sur une suggestion**
5. **Vérifier la console** (F12) pour les messages :
   - `🔍 handlePickupPlaceSelect appelé avec:`
   - `📍 Lieu de départ sélectionné:`
   - `📍 Coordonnées de départ mises à jour:`

#### **Étape 2: Tester le champ d'arrivée**
1. **Cliquer dans le champ "Point d'arrivée"**
2. **Taper quelques lettres** (ex: "Sfax")
3. **Vérifier que des suggestions apparaissent**
4. **Cliquer sur une suggestion**
5. **Vérifier la console** pour les messages :
   - `🔍 handleDestinationPlaceSelect appelé avec:`
   - `📍 Lieu d'arrivée sélectionné:`
   - `📍 Coordonnées d'arrivée mises à jour:`

#### **Étape 3: Vérifier la section de debug**
1. **Regarder la section jaune de debug**
2. **Vérifier que les coordonnées ne sont plus null**
3. **Vérifier que la distance et le prix se calculent**

## 🔍 **Diagnostic des problèmes**

### **Si les suggestions n'apparaissent pas :**
- ❌ **Problème** : L'autocomplétion Google Maps ne fonctionne pas
- 🔧 **Solution** : Vérifier que Google Maps est chargé, clé API correcte

### **Si les suggestions apparaissent mais les handlers ne sont pas appelés :**
- ❌ **Problème** : L'événement `place_changed` ne se déclenche pas
- 🔧 **Solution** : Vérifier l'initialisation de l'autocomplétion

### **Si les handlers sont appelés mais les coordonnées restent null :**
- ❌ **Problème** : `place.geometry?.location` est undefined
- 🔧 **Solution** : Vérifier les champs demandés dans l'autocomplétion

### **Si tout fonctionne mais la section ne s'affiche pas :**
- ❌ **Problème** : Condition d'affichage non remplie
- 🔧 **Solution** : Vérifier que `estimatedDistance` et `estimatedPrice` sont définis

## 📊 **Messages de console attendus**

### **Séquence normale :**
```
🔍 handlePickupPlaceSelect appelé avec: {formatted_address: "...", geometry: {...}}
📍 Lieu de départ sélectionné: Avenue Habib Bourguiba, Tunis {latitude: 36.8064, longitude: 10.1815}
📍 Coordonnées de départ mises à jour: {latitude: 36.8064, longitude: 10.1815}
```

### **Séquence avec erreur :**
```
❌ Pas de géométrie dans le lieu sélectionné: {formatted_address: "...", geometry: null}
```

## 🎯 **Résultat attendu**

Après le test :
- ✅ **Suggestions d'adresses** qui apparaissent
- ✅ **Handlers appelés** lors de la sélection
- ✅ **Coordonnées définies** dans la section de debug
- ✅ **Section de calcul** qui s'affiche

## 🔄 **Prochaines étapes**

1. **Tester l'autocomplétion** avec le debug activé
2. **Identifier où ça bloque** (suggestions, handlers, coordonnées)
3. **Corriger le problème** selon le diagnostic
4. **Retirer le debug** une fois le problème résolu

Le debug va révéler exactement où l'autocomplétion échoue ! 🔍
