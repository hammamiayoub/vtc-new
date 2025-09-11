# TuniRide

## Fonctionnalités
Plateforme de réservation de véhicules de transport avec chauffeur (VTC) en Tunisie.
- Interface client pour réserver des courses
- Interface chauffeur pour gérer les disponibilités et accepter les courses
- Interface administrateur pour valider les chauffeurs
- Système de notifications par email
- Géolocalisation et calcul automatique des prix
- Gestion des profils et photos
## Technologies
- React + TypeScript
- Tailwind CSS
- Supabase (base de données et authentification)
- Vite (bundler)
## Installation
1. Cloner le projet
2. Installer les dépendances: `npm install`
3. Configurer les variables d'environnement dans `.env`
4. Lancer le serveur de développement: `npm run dev`
## Configuration
Copier `.env.example` vers `.env` et configurer:
- URL et clés Supabase
- Clé API Resend pour les emails (voir instructions détaillées ci-dessous)

### Configuration Resend pour les emails
1. **Créer un compte Resend** : https://resend.com
2. **Vérifier votre domaine** :
   - Allez dans "Domains" dans le dashboard Resend
   - Ajoutez votre domaine (ex: tuniride.net)
   - Configurez les enregistrements DNS requis
3. **Créer une API Key** :
   - Allez dans "API Keys"
   - Créez une nouvelle clé avec les permissions d'envoi
   - Copiez la clé dans votre fichier `.env`
4. **Configurer l'adresse expéditeur** :
   - Modifiez `FROM_EMAIL` dans `supabase/functions/send-booking-notification/index.ts`
   - Utilisez votre domaine vérifié : `"TuniRide <noreply@votredomaine.com>"`

### Test des emails
- Les emails sont envoyés automatiquement lors des réservations
- Vérifiez les logs dans la console du navigateur
- Les erreurs d'envoi n'empêchent pas la création des réservations

## Domaine
Le site est configuré pour fonctionner sur `tuniride.net`