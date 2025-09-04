# MyRide - Plateforme de réservation chauffeurs privés

## Configuration OAuth

### 1. Configuration Supabase

Dans votre dashboard Supabase (`https://supabase.com/dashboard/project/YOUR_PROJECT_ID`):

#### Authentication > Providers

**Google OAuth:**
1. Activez le provider Google
2. Ajoutez vos identifiants Google:
   - Client ID: `YOUR_GOOGLE_CLIENT_ID`
   - Client Secret: `YOUR_GOOGLE_CLIENT_SECRET`

**Facebook OAuth:**
1. Activez le provider Facebook
2. Ajoutez vos identifiants Facebook:
   - App ID: `YOUR_FACEBOOK_APP_ID`
   - App Secret: `YOUR_FACEBOOK_APP_SECRET`

#### Authentication > URL Configuration

**Site URL:** `https://plateforme-de-r-serv-m5qt.bolt.host`

**Redirect URLs (ajoutez ces URLs):**
```
https://plateforme-de-r-serv-m5qt.bolt.host/auth/callback
http://localhost:5173/auth/callback
```

### 2. Configuration Google Cloud Console

1. Allez sur [Google Cloud Console](https://console.cloud.google.com/)
2. Créez un nouveau projet ou sélectionnez un projet existant
3. Activez l'API Google+ 
4. Créez des identifiants OAuth 2.0:
   - Type: Application Web
   - Origines JavaScript autorisées:
     ```
     https://plateforme-de-r-serv-m5qt.bolt.host
     http://localhost:5173
     ```
   - URI de redirection autorisés:
     ```
     https://iunyqsxcxlsbuomtwtst.supabase.co/auth/v1/callback
     ```

### 3. Configuration Facebook Developers

1. Allez sur [Facebook Developers](https://developers.facebook.com/)
2. Créez une nouvelle app ou utilisez une app existante
3. Ajoutez le produit "Facebook Login"
4. Dans les paramètres Facebook Login:
   - URI de redirection OAuth valides:
     ```
     https://iunyqsxcxlsbuomtwtst.supabase.co/auth/v1/callback
     ```
   - Domaines d'app valides:
     ```
     plateforme-de-r-serv-m5qt.bolt.host
     localhost
     ```

### 4. Variables d'environnement

Assurez-vous que votre fichier `.env` contient:
```
VITE_SUPABASE_URL=https://iunyqsxcxlsbuomtwtst.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### 5. Test de l'OAuth

1. Redémarrez votre application après la configuration
2. Testez la connexion Google/Facebook depuis les pages d'inscription/connexion
3. Vérifiez que la redirection fonctionne correctement

## Dépannage

### Erreur "n'autorise pas la connexion"
- Vérifiez que les URLs de redirection sont correctement configurées
- Assurez-vous que les domaines sont autorisés dans Google/Facebook
- Vérifiez que l'URL Supabase est correcte dans les paramètres OAuth

### Erreur de redirection
- Vérifiez que les URLs de callback sont bien configurées
- Testez avec et sans le hash (#) dans l'URL
- Vérifiez les logs dans la console du navigateur