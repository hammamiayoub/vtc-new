# Intégration Google Maps API

## Configuration requise

### 1. Variables d'environnement
Ajoutez dans votre fichier `.env` :

```env
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

### 2. APIs Google à activer
Dans la [Google Cloud Console](https://console.cloud.google.com/), activez :
- **Maps JavaScript API**
- **Places API** 
- **Geocoding API** (optionnel)

### 3. Restrictions de sécurité
- Restreignez votre clé API par domaine
- Activez les restrictions par IP si nécessaire

## Fonctionnalités implémentées

### Autocomplétion d'adresses
- ✅ Suggestions en temps réel
- ✅ Restriction géographique à la Tunisie
- ✅ Géolocalisation automatique des coordonnées
- ✅ Interface utilisateur responsive

### Composants créés
- `AddressAutocomplete.tsx` : Composant d'autocomplétion réutilisable
- Intégration dans `BookingForm.tsx`

### Utilisation
```tsx
<AddressAutocomplete
  value={address}
  onChange={setAddress}
  onPlaceSelect={handlePlaceSelect}
  placeholder="Saisissez une adresse..."
  label="Adresse"
/>
```

## Avantages
- 🚀 Performance optimisée avec chargement asynchrone
- 🎯 Suggestions précises et localisées
- 📱 Interface responsive
- 🔒 Sécurisé avec restrictions API
- 🌍 Géolocalisation automatique

## Coûts
- Places API : ~$0.017 par requête
- Maps JavaScript API : Gratuit jusqu'à 28,000 chargements/mois
- Geocoding API : ~$0.005 par requête
