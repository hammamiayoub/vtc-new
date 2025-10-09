# 📧 Configuration finale des emails - TuniDrive

## 🎯 Architecture simplifiée

**Une seule Edge Function pour tous les emails** : `send-booking-status-notification`

### Fonction à déployer :

#### ✅ `send-booking-status-notification` (PRINCIPALE)
- **Fichier** : `supabase/functions/send-booking-status-notification/index.ts`
- **Gère** : Acceptation ET Annulation (client + chauffeur)
- **Statuts supportés** : `accepted`, `cancelled`

#### ✅ `resend-email` (Pour les nouvelles réservations)
- **Fichier** : `supabase/functions/resend-email/index.ts`
- **Gère** : Nouvelle réservation (client + chauffeur + support avec délai 2s)

#### ⚠️ `send-cancellation-emails` (NE PLUS UTILISER)
- Cette fonction n'est plus appelée par le code
- Vous pouvez la supprimer ou la garder en backup

---

## 📧 Flux complet des emails

### 1️⃣ Nouvelle réservation créée
**Fonction** : `resend-email`

- ✅ Email au **client** : Confirmation de réservation avec détails complets
- ✅ Email au **chauffeur** : Notification de nouvelle réservation
- ✅ Email au **support** : Récapitulatif complet (envoyé après 2 secondes)

**Appelé depuis** : `src/components/BookingForm.tsx` (ligne 724)

---

### 2️⃣ Chauffeur accepte la réservation
**Fonction** : `send-booking-status-notification`

**Paramètres** :
```json
{
  "bookingData": { "id", "pickup_address", "destination_address", "scheduled_time", "distance_km", "price_tnd", "notes" },
  "clientData": { "first_name", "last_name", "email" },
  "driverData": { "first_name", "last_name", "email", "phone", "vehicle_info" },
  "status": "accepted"
}
```

**Emails envoyés** :
- ✅ Email au **client** : "✅ Réservation acceptée par le chauffeur"
  - Détails de la course
  - Informations du chauffeur et véhicule
  - Rappel important (être prêt 5 min avant)

**Appelé depuis** : `src/components/DriverDashboard.tsx` (ligne 277)

---

### 3️⃣ Chauffeur annule la réservation
**Fonction** : `send-booking-status-notification`

**Paramètres** :
```json
{
  "bookingData": { "id", "pickup_address", "destination_address", "scheduled_time", "distance_km", "price_tnd", "notes", "booking_url" },
  "clientData": { "first_name", "last_name", "email" },
  "driverData": { "first_name", "last_name", "email", "phone", "vehicle_info" },
  "status": "cancelled",
  "cancelledBy": "driver"
}
```

**Emails envoyés** :
- ✅ Email au **client** : "❌ Réservation annulée par le chauffeur"
  - Message d'excuses
  - Détails de la réservation annulée
  - Bouton CTA "Rechercher un autre chauffeur"
  - Coordonnées support (email + WhatsApp)

- ✅ Email au **chauffeur** : "❌ Vous avez annulé une course"
  - Confirmation d'annulation
  - Détails de la course
  - Avertissement sur l'impact sur la réputation

**Appelé depuis** : `src/components/DriverDashboard.tsx` (ligne 386)

---

### 4️⃣ Client annule la réservation
**Fonction** : `send-booking-status-notification`

**Paramètres** :
```json
{
  "bookingData": { "id", "pickup_address", "destination_address", "scheduled_time", "distance_km", "price_tnd", "notes", "booking_url" },
  "clientData": { "first_name", "last_name", "email" },
  "driverData": { "first_name", "last_name", "email", "phone", "vehicle_info" },
  "status": "cancelled",
  "cancelledBy": "client"
}
```

**Emails envoyés** :
- ✅ Email au **client** : "❌ Réservation annulée"
  - Confirmation d'annulation
  - Détails de la réservation
  - Bouton pour créer une nouvelle réservation

- ✅ Email au **chauffeur** : "❌ Course annulée par le client"
  - Notification d'annulation
  - Détails de la course
  - Message positif (peut accepter d'autres courses)

**Appelé depuis** : `src/components/ClientDashboard.tsx` (ligne 323)

---

## 🚀 Étapes de déploiement

### 1. Déployer `send-booking-status-notification`

Cette fonction gère maintenant :
- ✅ Acceptation (email au client uniquement)
- ✅ Annulation (emails au client ET au chauffeur)

**Via Supabase Dashboard** :
1. Allez sur https://supabase.com/dashboard/project/gyxqncucocmfoflhpjyh/functions
2. Créez ou éditez `send-booking-status-notification`
3. Copiez TOUT le contenu de `supabase/functions/send-booking-status-notification/index.ts` (386 lignes)
4. Cliquez sur **Deploy**
5. Attendez la fin du déploiement (100%)

### 2. Déployer `resend-email` (si pas déjà fait)

Pour les nouvelles réservations avec email support.

### 3. Tester tous les scénarios

- [ ] **Nouvelle réservation** → Client, chauffeur ET support reçoivent un email
- [ ] **Chauffeur accepte** → Client reçoit un email d'acceptation
- [ ] **Chauffeur annule** → Client ET chauffeur reçoivent un email
- [ ] **Client annule** → Client ET chauffeur reçoivent un email

### 4. Vérifier les logs

Dans Supabase Dashboard > Edge Functions > send-booking-status-notification > Logs :
- Cherchez `📧 Envoi email client à:`
- Cherchez `📧 Envoi email chauffeur à:` (pour les annulations)
- Vérifiez les résultats `✅` ou `❌`

---

## 🔑 Points importants

### Headers CORS (déjà configurés)
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
```

### Gestion des erreurs
- Si l'email client échoue → Erreur 500
- Si l'email chauffeur échoue (annulation) → Continue quand même, email client envoyé
- Résultats détaillés dans la réponse JSON

### Données requises
- ✅ `bookingData` avec toutes les propriétés en snake_case
- ✅ `clientData.email` obligatoire
- ✅ `driverData.email` obligatoire pour les annulations
- ✅ `status` : 'accepted' ou 'cancelled'
- ✅ `cancelledBy` : 'driver' ou 'client' (pour les annulations)

---

## ✅ Avantages de la nouvelle architecture

- 🎯 **Une seule fonction à maintenir** pour acceptation + annulation
- 🚀 **Plus simple à déboguer** (tous les logs au même endroit)
- 📧 **Emails cohérents** (même design, même FROM_EMAIL)
- ✨ **Gestion robuste des erreurs** (continue même si un email échoue)
- 🔍 **Logs détaillés** pour tracer tous les envois

---

## 🐛 Debug si problème

1. **Vérifier que la fonction est déployée** :
   - Supabase Dashboard > Edge Functions
   - Vérifiez la date de dernière modification

2. **Vérifier les logs** :
   - Cherchez `📊 Données reçues détaillées:`
   - Vérifiez que `clientEmail` et `driverEmail` ne sont pas vides

3. **Tester dans la console** :
   - Logs `📧 Payload envoyé:` dans le frontend
   - Vérifiez que les données sont correctes

4. **Vider le cache** :
   - Ctrl+Shift+Del
   - Navigation privée pour tester

