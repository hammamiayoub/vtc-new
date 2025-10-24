// Utilitaire centralisé pour charger l'API Google Maps
// Évite les chargements multiples et gère l'état global

interface GoogleMapsState {
  isLoaded: boolean;
  isLoading: boolean;
  loadPromise: Promise<void> | null;
}

class GoogleMapsLoader {
  private state: GoogleMapsState = {
    isLoaded: false,
    isLoading: false,
    loadPromise: null
  };

  private callbacks: (() => void)[] = [];

  // Vérifier si Google Maps est déjà chargé
  isGoogleMapsLoaded(): boolean {
    return this.state.isLoaded && 
           typeof window !== 'undefined' && 
           window.google && 
           window.google.maps && 
           window.google.maps.places;
  }

  // Charger l'API Google Maps (une seule fois)
  async loadGoogleMaps(): Promise<void> {
    // Si déjà chargé, retourner immédiatement
    if (this.isGoogleMapsLoaded()) {
      console.log('✅ Google Maps déjà chargé');
      return Promise.resolve();
    }

    // Si en cours de chargement, retourner la promesse existante
    if (this.state.isLoading && this.state.loadPromise) {
      console.log('⏳ Google Maps en cours de chargement, attente...');
      return this.state.loadPromise;
    }

    // Démarrer le chargement
    this.state.isLoading = true;
    this.state.loadPromise = this._loadGoogleMapsScript();
    
    return this.state.loadPromise;
  }

  private async _loadGoogleMapsScript(): Promise<void> {
    if (typeof window === 'undefined') {
      throw new Error('Google Maps ne peut pas être chargé côté serveur');
    }

    try {
      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      
      if (!apiKey || apiKey === 'your_google_maps_api_key_here') {
        throw new Error('Clé API Google Maps manquante ou non configurée');
      }

      console.log('🔑 Chargement de Google Maps avec la clé API...');

      // Vérifier si un script Google Maps existe déjà
      const existingScripts = document.querySelectorAll('script[src*="maps.googleapis.com"]');
      if (existingScripts.length > 0) {
        console.log(`⚠️ ${existingScripts.length} script(s) Google Maps déjà présent(s), attente du chargement...`);
        
        // Attendre que l'API soit disponible
        await this._waitForGoogleMaps();
        this.state.isLoaded = true;
        this.state.isLoading = false;
        this._notifyCallbacks();
        return;
      }

      // Charger l'API Google Maps
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=googleMapsGlobalCallback&language=en`;
        script.async = true;
        script.defer = true;
        
        // Callback global unique
        (window as any).googleMapsGlobalCallback = () => {
          console.log('✅ Google Maps chargé avec succès (callback global)');
          resolve();
        };
        
        script.onerror = (error) => {
          console.error('❌ Erreur de chargement de Google Maps');
          reject(new Error('Erreur de chargement de Google Maps'));
        };
        
        document.head.appendChild(script);
      });

      // Attendre que l'objet google soit disponible
      await this._waitForGoogleMaps();
      
      this.state.isLoaded = true;
      this.state.isLoading = false;
      this._notifyCallbacks();
      
      console.log('✅ Google Maps chargé et initialisé avec succès');

    } catch (error) {
      this.state.isLoading = false;
      this.state.loadPromise = null;
      console.error('❌ Erreur lors du chargement de Google Maps:', error);
      throw error;
    }
  }

  private async _waitForGoogleMaps(): Promise<void> {
    return new Promise((resolve) => {
      const checkGoogle = () => {
        if (window.google && window.google.maps && window.google.maps.places) {
          resolve();
        } else {
          setTimeout(checkGoogle, 100);
        }
      };
      checkGoogle();
    });
  }

  private _notifyCallbacks(): void {
    this.callbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('❌ Erreur dans le callback Google Maps:', error);
      }
    });
    this.callbacks = [];
  }

  // Ajouter un callback à exécuter quand Google Maps est chargé
  onGoogleMapsLoaded(callback: () => void): void {
    if (this.isGoogleMapsLoaded()) {
      callback();
    } else {
      this.callbacks.push(callback);
    }
  }

  // Réinitialiser l'état (pour les tests)
  reset(): void {
    this.state = {
      isLoaded: false,
      isLoading: false,
      loadPromise: null
    };
    this.callbacks = [];
  }
}

// Instance singleton
export const googleMapsLoader = new GoogleMapsLoader();

// Fonction utilitaire pour les composants
export const loadGoogleMaps = (): Promise<void> => {
  return googleMapsLoader.loadGoogleMaps();
};

// Fonction utilitaire pour vérifier si Google Maps est chargé
export const isGoogleMapsLoaded = (): boolean => {
  return googleMapsLoader.isGoogleMapsLoaded();
};

// Fonction utilitaire pour ajouter un callback
export const onGoogleMapsLoaded = (callback: () => void): void => {
  googleMapsLoader.onGoogleMapsLoaded(callback);
};
