# Guide d'utilisation des Analytics TuniDrive

## 🎯 Conversions Google Ads configurées

### 1. Conversion principale (Réservation créée)
- **ID**: `AW-17599907390`
- **Déclencheur**: Quand un client crée une réservation
- **Données trackées**: Prix de la réservation, ID client
- **Localisation**: `BookingForm.tsx` ligne 585

### 2. Conversion itinéraire (Acceptation chauffeur)
- **ID**: `AW-17599907390/yz0xCPuh36EbEL6MpchB`
- **Déclencheur**: Quand un chauffeur accepte une réservation
- **Données trackées**: Conversion simple
- **Localisation**: `DriverDashboard.tsx` ligne 239

## 📊 Événements trackés automatiquement

### Événements d'engagement
```typescript
// Inscription utilisateur
analytics.trackSignup('client' | 'driver')

// Connexion utilisateur
analytics.trackLogin('client' | 'driver' | 'admin')

// Démarrage application
analytics.trackAppUsage('app_started')
```

### Événements de réservation
```typescript
// Réservation créée (avec conversion)
analytics.trackBookingCreated(clientId, price)

// Conversion itinéraire (double tracking)
analytics.trackItineraryConversion()

// Réservation terminée
analytics.trackBookingCompleted(driverId, price)

// Réservation annulée
analytics.trackBookingCancelled(userId, 'client' | 'driver', reason)
```

### Événements de navigation
```typescript
// Page visitée
analytics.trackPageView('page_name')

// Formulaire de contact
analytics.trackContactForm()
```

## 🔧 Utilisation dans vos composants

### Import
```typescript
import { analytics } from '../utils/analytics';
```

### Exemples d'utilisation
```typescript
// Dans un composant de connexion
const handleLogin = async () => {
  // ... logique de connexion
  analytics.trackLogin('client');
};

// Dans un composant de réservation
const handleBookingComplete = async () => {
  // ... logique de réservation
  analytics.trackBookingCompleted(driverId, price);
  analytics.trackItineraryConversion();
};

// Dans un composant de contact
const handleContactSubmit = async () => {
  // ... logique de contact
  analytics.trackContactForm();
};
```

## 📈 Avantages pour Google Ads

1. **Double tracking**: Conversion principale + conversion itinéraire
2. **Données détaillées**: Prix, utilisateur, contexte
3. **ROI mesurable**: Corrélation coût/revenus
4. **Optimisation**: Données pour améliorer les campagnes
5. **Remarketing**: Audiences personnalisées

## 🚀 Prochaines étapes

Pour ajouter plus de tracking :

1. **Événements personnalisés**: Utilisez `trackEvent()`
2. **Conversions supplémentaires**: Utilisez `trackConversion()`
3. **Événements e-commerce**: Ajoutez des événements de transaction
4. **A/B Testing**: Trackez les variations de pages

## 🔍 Debugging

Les logs apparaissent dans la console :
- `📊 Google Analytics initialisé pour TuniDrive`
- `📊 Tracking conversion Google Ads...`
- `🗺️ Tracking conversion itinéraire...`

Vérifiez dans Google Analytics et Google Ads que les conversions sont bien trackées.
