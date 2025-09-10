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
- Clé API Resend pour les emails
## Domaine
Le site est configuré pour fonctionner sur `tuniride.net`