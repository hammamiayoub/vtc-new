# 📋 Checklist de déploiement - Notifications Email (MISE À JOUR)

## 🎯 Changement important : Utilisation d'une seule Edge Function

**Nouvelle stratégie** : Utiliser uniquement `send-booking-status-notification` pour tous les emails (acceptation ET annulation).

L'ancienne fonction `send-cancellation-emails` ne sera plus utilisée.

---

# 📋 Checklist de déploiement - Notifications Email

## ✅ Modifications apportées

### 1. Corrections CORS sur les Edge Functions

Les fichiers suivants ont été mis à jour avec les headers CORS corrects :

#### `supabase/functions/send-cancellation-emails/index.ts`
- ✅ Ajout de `'Access-Control-Allow-Methods': 'POST, OPTIONS'`
- ✅ Ajout du `status: 200` explicite pour la réponse OPTIONS
- ✅ Logs de debug détaillés pour tracer les données reçues

#### `supabase/functions/resend-email/index.ts`
- ✅ Ajout de `'Access-Control-Allow-Methods': 'POST, OPTIONS'`
- ✅ Ajout du `status: 200` explicite pour la réponse OPTIONS

#### `supabase/functions/send-booking-status-notification/index.ts` (NOUVEAU)
- ✅ Création de la fonction pour notifier le client quand le chauffeur accepte/annule
- ✅ Headers CORS complets

### 2. Corrections dans le code frontend

#### `src/components/DriverDashboard.tsx`
- ✅ Ajout de `email` dans la récupération des clients (lignes 118 et 178)
- ✅ Ajout de l'appel email quand le chauffeur accepte une réservation
- ✅ Les emails d'annulation par le chauffeur utilisent déjà `send-cancellation-emails`

#### `src/components/ClientDashboard.tsx`
- ✅ Les emails d'annulation par le client utilisent déjà `send-cancellation-emails`

## 🚀 Actions à effectuer

### Étape 1 : Déployer les Edge Functions

Vous devez déployer ces 3 fonctions via le Dashboard Supabase :

1. **`send-cancellation-emails`** (modifiée)
   - Chemin : `supabase/functions/send-cancellation-emails/index.ts`
   - But : Envoyer emails d'annulation au client ET au chauffeur

2. **`resend-email`** (modifiée)
   - Chemin : `supabase/functions/resend-email/index.ts`
   - But : Envoyer emails de confirmation de nouvelle réservation (+ email support)

3. **`send-booking-status-notification`** (nouvelle)
   - Chemin : `supabase/functions/send-booking-status-notification/index.ts`
   - But : Notifier le client quand le chauffeur accepte/annule

### Étape 2 : Déploiement via Supabase Dashboard

Pour chaque fonction :

1. Allez sur https://supabase.com/dashboard/project/gyxqncucocmfoflhpjyh/functions
2. Créez ou éditez la fonction
3. Copiez le contenu du fichier `index.ts` correspondant
4. Cliquez sur **Deploy**

### Étape 3 : Vérifier les secrets

Assurez-vous que la variable `RESEND_API_KEY` est configurée :

1. Allez dans **Project Settings** > **Edge Functions**
2. Dans **Secrets**, vérifiez que `RESEND_API_KEY` est définie
3. Si elle n'existe pas, ajoutez-la avec votre clé API Resend

## 📧 Flux d'emails après déploiement

### Nouvelle réservation créée :
1. ✅ Email de confirmation au **client**
2. ✅ Email de notification au **chauffeur**
3. ✅ Email récapitulatif au **support** (avec délai de 2s)

### Chauffeur accepte la réservation :
1. ✅ Notification push au client
2. ✅ **Email d'acceptation au client** (via `send-booking-status-notification`)

### Chauffeur annule la réservation :
1. ✅ Notification push au client
2. ✅ **Email d'annulation au client** (via `send-cancellation-emails`)
3. ✅ **Email d'annulation au chauffeur** (via `send-cancellation-emails`)

### Client annule la réservation :
1. ✅ Notification push au chauffeur
2. ✅ **Email d'annulation au client** (via `send-cancellation-emails`)
3. ✅ **Email d'annulation au chauffeur** (via `send-cancellation-emails`)

## 🐛 Debug si les emails ne fonctionnent toujours pas

Si après le déploiement les emails ne fonctionnent pas :

1. **Vérifiez les logs dans Supabase Dashboard** :
   - Fonctions > [nom de la fonction] > Logs
   - Cherchez les messages d'erreur en rouge

2. **Vérifiez les données envoyées** :
   - Ouvrez la console du navigateur (F12)
   - Cherchez les logs `📧 Données email d'annulation:`
   - Vérifiez que `clientEmail` et `driverEmail` ne sont pas vides

3. **Vérifiez la configuration Resend** :
   - Domaine vérifié : `tunidrive.net`
   - Clé API valide
   - Limites d'envoi non atteintes

## ✅ Tests à effectuer après déploiement

- [ ] Créer une nouvelle réservation → Client et chauffeur reçoivent un email
- [ ] Chauffeur accepte une réservation → Client reçoit un email d'acceptation
- [ ] Chauffeur annule une réservation → Client ET chauffeur reçoivent un email
- [ ] Client annule une réservation → Client ET chauffeur reçoivent un email
- [ ] Support reçoit un email pour chaque nouvelle réservation

