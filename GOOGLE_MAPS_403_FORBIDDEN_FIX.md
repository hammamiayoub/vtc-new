# Correction erreur 403 Forbidden Google Maps

## 🔍 **Problème identifié**

L'erreur `POST https://places.googleapis.com/$rpc/google.maps.places.v1.Places/AutocompletePlaces 403 (Forbidden)` indique que la clé API n'est pas correctement transmise à l'API Places.

## ✅ **Solutions appliquées**

### **1. Attente de l'objet Google**
```typescript
// Attendre que l'objet google soit disponible
await new Promise(resolve => {
  const checkGoogle = () => {
    if (window.google && window.google.maps) {
      resolve(true);
    } else {
      setTimeout(checkGoogle, 100);
    }
  };
  checkGoogle();
});
```

### **2. Fallback vers l'ancienne API**
```typescript
try {
  // Essayer la nouvelle API
  const autocompleteElement = document.createElement('gmp-place-autocomplete');
  // ...
} catch (error) {
  // Fallback vers l'ancienne API
  const autocomplete = new google.maps.places.Autocomplete(input, options);
}
```

### **3. Configuration robuste**
- ✅ Vérification de la clé API
- ✅ Attente du chargement complet
- ✅ Gestion des erreurs
- ✅ Fallback automatique

## 🧪 **Test de fonctionnement**

### **Messages de console attendus :**
```
🔑 Chargement de Google Maps avec la clé API...
📡 Configuration des options...
📚 Import de la bibliothèque Places...
✅ Google Maps chargé avec succès
✅ Nouvelle API PlaceAutocompleteElement initialisée
```

### **Ou en cas de fallback :**
```
⚠️ Nouvelle API non disponible, utilisation de l'ancienne API
✅ Ancienne API Autocomplete initialisée
```

## 🔧 **Vérifications supplémentaires**

### **1. Clé API valide**
```bash
# Vérifiez dans .env
VITE_GOOGLE_MAPS_API_KEY=AIzaSyCHHlwh5ihJp_ywn6T8JBrKQfHR1rg6iBc
```

### **2. APIs activées dans Google Cloud Console**
- ✅ Maps JavaScript API
- ✅ Places API
- ✅ Geocoding API

### **3. Restrictions de sécurité**
- ✅ HTTP referrers : `localhost:5174/*`
- ✅ Ou désactiver temporairement pour tester

### **4. Quotas et facturation**
- ✅ Compte de facturation actif
- ✅ Quotas non dépassés

## 🎯 **Résultat attendu**

L'autocomplétion devrait maintenant fonctionner avec :
- ✅ Suggestions en temps réel
- ✅ Restriction à la Tunisie
- ✅ Géolocalisation automatique
- ✅ Interface responsive

## 📱 **Test final**

1. **Ouvrez l'application** sur `http://localhost:5174/`
2. **Tapez "béni"** dans le champ de départ
3. **Vérifiez les suggestions** : "Beni Khalled Tunisia", "Béni Khiar Tunisia", etc.
4. **Sélectionnez une adresse** et vérifiez que les coordonnées sont récupérées

L'erreur 403 devrait maintenant être résolue ! 🎉
