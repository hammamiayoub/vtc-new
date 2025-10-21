# Dépannage Google Maps API

## Problème : "Chargement de l'autocomplétion" qui ne se termine jamais

### ✅ **Étapes de vérification :**

#### 1. Vérifier la clé API dans .env
```bash
# Votre fichier .env doit contenir :
VITE_GOOGLE_MAPS_API_KEY=votre_vraie_cle_api_ici
```

#### 2. Redémarrer le serveur de développement
```bash
npm run dev
# ou
yarn dev
```

#### 3. Vérifier la console du navigateur
Ouvrez les outils de développement (F12) et regardez la console pour :
- ✅ "🔑 Chargement de Google Maps avec la clé API..."
- ✅ "✅ Google Maps chargé avec succès"
- ❌ Messages d'erreur spécifiques

#### 4. Vérifier la configuration Google Cloud Console

**APIs à activer :**
- ✅ Maps JavaScript API
- ✅ Places API
- ✅ Geocoding API (optionnel)

**Restrictions de sécurité :**
- ✅ Restriction par domaine HTTP referrer
- ✅ Ajouter `localhost:5173` pour le développement
- ✅ Ajouter votre domaine de production

#### 5. Vérifier les quotas et facturation
- ✅ Compte Google Cloud actif
- ✅ Facturation activée
- ✅ Quotas non dépassés

### 🔧 **Solutions courantes :**

#### Problème : "API key not valid"
```bash
# Vérifiez que votre clé est correcte dans .env
echo $VITE_GOOGLE_MAPS_API_KEY
```

#### Problème : "This API project is not authorized"
- Activez les APIs dans Google Cloud Console
- Vérifiez que le projet est correct

#### Problème : "RefererNotAllowedMapError"
- Ajoutez `localhost:5173` dans les restrictions HTTP referrer
- Ou désactivez temporairement les restrictions pour tester

### 🧪 **Test rapide :**

1. Ouvrez la console du navigateur
2. Tapez : `console.log(import.meta.env.VITE_GOOGLE_MAPS_API_KEY)`
3. Vérifiez que votre clé s'affiche (pas "your_google_maps_api_key_here")

### 📞 **Support :**
Si le problème persiste, vérifiez :
- Les logs de la console
- La configuration Google Cloud Console
- Les restrictions de sécurité de votre clé API
