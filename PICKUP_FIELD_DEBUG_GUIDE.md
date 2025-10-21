# 🔍 Guide de diagnostic du champ de départ

## 🎯 **Problème identifié**

- ✅ **Coordonnées d'arrivée** : Définies (35.9016187, 10.5846034)
- ❌ **Coordonnées de départ** : Null
- ✅ **Type véhicule** : Défini (sedan)

## 🔧 **Debug ajouté**

### **1. Logs détaillés dans AddressAutocomplete**
```javascript
console.log('📍 Lieu sélectionné:', place);
console.log('🔍 onPlaceSelect callback:', onPlaceSelect);
console.log('🔍 Appel de onPlaceSelect avec:', place);
console.log('✅ onPlaceSelect appelé avec succès');
```

### **2. Vérification des données**
```javascript
if (place && place.formatted_address) {
  // Données complètes
} else {
  console.log('❌ Place ou formatted_address manquant:', { place, formatted_address: place?.formatted_address });
}
```

## 🧪 **Test de diagnostic spécifique**

### **1. Ouvrir l'application**
```
http://localhost:5176/
```

### **2. Tester spécifiquement le champ de départ**

#### **Étape 1: Tester le champ de départ**
1. **Cliquer dans le champ "Point de départ"**
2. **Taper "Tunis"** et attendre les suggestions
3. **Cliquer sur une suggestion**
4. **Vérifier la console** (F12) pour les messages :
   - `📍 Lieu sélectionné:`
   - `🔍 onPlaceSelect callback:`
   - `🔍 Appel de onPlaceSelect avec:`
   - `✅ onPlaceSelect appelé avec succès`
   - `🔍 handlePickupPlaceSelect appelé avec:`

#### **Étape 2: Comparer avec le champ d'arrivée**
1. **Cliquer dans le champ "Point d'arrivée"**
2. **Taper "Sfax"** et attendre les suggestions
3. **Cliquer sur une suggestion**
4. **Vérifier que les coordonnées d'arrivée se mettent à jour**

## 🔍 **Diagnostic des problèmes**

### **Si les messages n'apparaissent pas pour le champ de départ :**
- ❌ **Problème** : L'événement `place_changed` ne se déclenche pas
- 🔧 **Solution** : Vérifier l'initialisation de l'autocomplétion

### **Si `📍 Lieu sélectionné:` apparaît mais pas `🔍 handlePickupPlaceSelect appelé avec:` :**
- ❌ **Problème** : Le callback `onPlaceSelect` n'est pas appelé
- 🔧 **Solution** : Vérifier la liaison du callback

### **Si `🔍 handlePickupPlaceSelect appelé avec:` apparaît mais les coordonnées restent null :**
- ❌ **Problème** : `place.geometry?.location` est undefined
- 🔧 **Solution** : Vérifier les champs demandés dans l'autocomplétion

### **Si tout fonctionne mais les coordonnées ne se mettent pas à jour :**
- ❌ **Problème** : La fonction `setPickupCoords` ne fonctionne pas
- 🔧 **Solution** : Vérifier l'état React

## 📊 **Messages de console attendus**

### **Séquence normale pour le champ de départ :**
```
📍 Lieu sélectionné: {formatted_address: "...", geometry: {...}}
🔍 onPlaceSelect callback: function
🔍 Appel de onPlaceSelect avec: {formatted_address: "...", geometry: {...}}
✅ onPlaceSelect appelé avec succès
🔍 handlePickupPlaceSelect appelé avec: {formatted_address: "...", geometry: {...}}
📍 Lieu de départ sélectionné: Avenue Habib Bourguiba, Tunis {latitude: 36.8064, longitude: 10.1815}
📍 Coordonnées de départ mises à jour: {latitude: 36.8064, longitude: 10.1815}
```

### **Séquence avec erreur :**
```
❌ Place ou formatted_address manquant: {place: {...}, formatted_address: null}
```

## 🎯 **Résultat attendu**

Après le test :
- ✅ **Messages de debug** dans la console pour le champ de départ
- ✅ **Coordonnées de départ** définies dans la section de debug
- ✅ **Section de calcul** qui s'affiche avec distance et prix

## 🔄 **Prochaines étapes**

1. **Tester le champ de départ** avec le debug activé
2. **Identifier où ça bloque** (événement, callback, coordonnées)
3. **Corriger le problème** selon le diagnostic
4. **Retirer le debug** une fois le problème résolu

Le debug va révéler exactement pourquoi le champ de départ ne fonctionne pas ! 🔍
