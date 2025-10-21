# Correction erreur 403 Places API REST

## 🔍 **Problème identifié**

L'API JavaScript Maps fonctionne (comme confirmé par l'URL de chargement), mais l'API Places REST (`places.googleapis.com`) renvoie une erreur 403. C'est un problème de restrictions de sécurité.

## ✅ **Solutions appliquées**

### **1. Utilisation exclusive de l'API JavaScript Maps**

J'ai modifié le code pour utiliser uniquement l'API JavaScript Maps qui fonctionne, en évitant l'API REST problématique.

### **2. Configuration des restrictions de sécurité**

#### **A. Dans Google Cloud Console :**
1. Allez dans **APIs & Services** → **Credentials**
2. Cliquez sur votre clé API
3. Dans **Restrictions d'application** :
   - Sélectionnez **HTTP referrers (sites web)**
   - Ajoutez ces domaines :
     ```
     localhost:5174/*
     127.0.0.1:5174/*
     http://localhost:5174/*
     https://localhost:5174/*
     ```

#### **B. APIs autorisées :**
- ✅ **Maps JavaScript API**
- ✅ **Places API** (pour l'autocomplétion JavaScript)
- ✅ **Geocoding API**

### **3. Test de diagnostic**

J'ai créé `test-places-api.html` pour tester spécifiquement l'API Places REST.

## 🧪 **Test de fonctionnement**

### **Messages de console attendus :**
```
🔑 Chargement de Google Maps avec la clé API...
📡 Configuration des options...
📚 Import de la bibliothèque Places...
✅ Google Maps chargé avec succès
🔧 Initialisation de l'autocomplétion avec l'API JavaScript Maps...
✅ API JavaScript Maps Autocomplete initialisée
```

### **Test de l'autocomplétion :**
1. **Tapez "béni"** dans le champ de départ
2. **Vérifiez les suggestions** : "Beni Khalled Tunisia", "Béni Khiar Tunisia", etc.
3. **Sélectionnez une adresse** et vérifiez que les coordonnées sont récupérées

## 🔧 **Vérifications supplémentaires**

### **1. Quotas et facturation**
- ✅ Compte de facturation actif
- ✅ Quotas non dépassés
- ✅ Carte de crédit valide

### **2. Restrictions de sécurité**
- ✅ HTTP referrers configurés
- ✅ APIs autorisées
- ✅ Pas de restrictions IP trop strictes

### **3. Test avec le fichier HTML**
Ouvrez `test-places-api.html` dans votre navigateur pour tester l'API Places REST directement.

## 🎯 **Résultat attendu**

L'autocomplétion devrait maintenant fonctionner avec :
- ✅ **API JavaScript Maps** (qui fonctionne)
- ✅ **Suggestions en temps réel**
- ✅ **Restriction à la Tunisie**
- ✅ **Géolocalisation automatique**

## 📚 **Références**

- [Google Maps JavaScript API](https://developers.google.com/maps/documentation/javascript)
- [Places API Documentation](https://developers.google.com/maps/documentation/places)
- [API Key Restrictions](https://developers.google.com/maps/api-key-restrictions)

L'erreur 403 devrait maintenant être résolue en utilisant uniquement l'API JavaScript Maps ! 🎉
