# Erreur "You must use an API key to authenticate"

## 🔍 **Diagnostic de l'erreur**

Cette erreur indique que Google Maps ne reconnaît pas votre clé API. Voici les causes possibles :

### **1. Vérifications immédiates**

#### ✅ **Clé API dans .env**
```bash
# Vérifiez que votre .env contient :
VITE_GOOGLE_MAPS_API_KEY=AIzaSyCHHlwh5ihJp_ywn6T8JBrKQfHR1rg6iBc
```

#### ✅ **Redémarrage du serveur**
```bash
# Arrêtez le serveur (Ctrl+C) puis :
npm run dev
```

#### ✅ **Vérification dans la console**
Ouvrez F12 → Console et cherchez :
- `🔑 Clé API détectée: AIzaSyCHHlwh5ihJp...`
- `📡 Configuration des options...`
- `📚 Import de la bibliothèque Places...`

### **2. Configuration Google Cloud Console**

#### ✅ **APIs activées**
Dans [Google Cloud Console](https://console.cloud.google.com/) :
- Maps JavaScript API ✅
- Places API ✅
- Geocoding API ✅

#### ✅ **Restrictions de sécurité**
Dans "Restrictions" de votre clé API :
- **HTTP referrers (sites web)** : 
  - `localhost:5173/*`
  - `127.0.0.1:5173/*`
  - Votre domaine de production

#### ✅ **Facturation activée**
- Compte de facturation lié
- Quotas non dépassés

### **3. Tests de diagnostic**

#### **Test 1: Vérification de la clé**
```javascript
// Dans la console du navigateur :
console.log(import.meta.env.VITE_GOOGLE_MAPS_API_KEY);
```

#### **Test 2: Test direct de l'API**
```javascript
// Dans la console du navigateur :
fetch(`https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&libraries=places`)
  .then(response => console.log('API accessible:', response.ok))
  .catch(error => console.log('Erreur API:', error));
```

### **4. Solutions par problème**

#### **Problème : Clé non reconnue**
```bash
# Vérifiez le format de la clé
echo $VITE_GOOGLE_MAPS_API_KEY
# Doit commencer par "AIza"
```

#### **Problème : Restrictions trop strictes**
- Ajoutez `localhost:5173/*` dans les restrictions HTTP referrer
- Ou désactivez temporairement les restrictions pour tester

#### **Problème : APIs non activées**
- Activez Maps JavaScript API
- Activez Places API
- Attendez 5-10 minutes pour la propagation

#### **Problème : Quota dépassé**
- Vérifiez l'onglet "Quotas" dans Google Cloud Console
- Augmentez les limites si nécessaire

### **5. Vérification finale**

Une fois corrigé, vous devriez voir dans la console :
```
🔑 Clé API détectée: AIzaSyCHHlwh5ihJp...
📡 Configuration des options...
📚 Import de la bibliothèque Places...
✅ Google Maps chargé avec succès
✅ Objet google disponible: true
✅ Places API disponible: true
```

### **6. Support Google**

Si le problème persiste :
- [Documentation officielle](https://developers.google.com/maps/documentation/javascript/get-api-key)
- [Support Google Maps](https://developers.google.com/maps/support)
- Vérifiez les [statuts des services Google](https://status.cloud.google.com/)
