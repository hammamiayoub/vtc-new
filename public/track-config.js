// Configuration publique pour la page de suivi
// Renseignez ces valeurs depuis votre environnement (copie de .env) si vous servez statiquement
// ou générez dynamiquement ce fichier lors du build/deploy.
window.TRACK_CONFIG = {
    VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL || '',
    VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY || '',
};
