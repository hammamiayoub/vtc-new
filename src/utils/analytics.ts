// Utilitaires pour Google Analytics et Google Ads
declare global {
  interface Window {
    gtag: (...args: any[]) => void;
  }
}

// Types pour les événements Google Analytics
export interface GoogleAnalyticsEvent {
  action: string;
  category: string;
  label?: string;
  value?: number;
}

export interface GoogleAdsConversion {
  send_to: string;
  value?: number;
  currency?: string;
  transaction_id?: string;
}

// Fonction utilitaire pour envoyer des événements Google Analytics
export const trackEvent = (event: GoogleAnalyticsEvent) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', event.action, {
      event_category: event.category,
      event_label: event.label,
      value: event.value,
    });
  }
};

// Fonction pour tracker une conversion Google Ads
export const trackConversion = (conversion: GoogleAdsConversion) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'conversion', conversion);
  }
};

// Événements spécifiques à TuniDrive
export const analytics = {
  // Événements d'inscription
  trackSignup: (userType: 'client' | 'driver') => {
    trackEvent({
      action: 'signup',
      category: 'engagement',
      label: userType,
    });
  },

  // Événements de connexion
  trackLogin: (userType: 'client' | 'driver' | 'admin') => {
    trackEvent({
      action: 'login',
      category: 'engagement',
      label: userType,
    });
  },

  // Événements de réservation
  trackBookingCreated: (clientId: string, price: number) => {
    trackEvent({
      action: 'booking_created',
      category: 'booking',
      label: clientId,
      value: price,
    });

    // Conversion Google Ads pour réservation créée
    trackConversion({
      send_to: 'AW-17599907390', // Votre ID de conversion
      value: price,
      currency: 'TND',
      transaction_id: clientId,
    });
  },

  // Conversion spécifique pour itinéraire (réservation)
  trackItineraryConversion: () => {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'conversion', {
        'send_to': 'AW-17599907390/yz0xCPuh36EbEL6MpchB'
      });
    }
  },

  trackBookingCompleted: (driverId: string, price: number) => {
    trackEvent({
      action: 'booking_completed',
      category: 'booking',
      label: driverId,
      value: price,
    });
  },

  trackBookingCancelled: (userId: string, userType: 'client' | 'driver', reason?: string) => {
    trackEvent({
      action: 'booking_cancelled',
      category: 'booking',
      label: `${userType}_${reason || 'unknown'}`,
    });
  },

  // Événements de navigation
  trackPageView: (pageName: string) => {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('config', 'AW-17599907390', {
        page_title: pageName,
        page_location: window.location.href,
      });
    }
  },

  // Événements de contact
  trackContactForm: () => {
    trackEvent({
      action: 'contact_form_submit',
      category: 'engagement',
      label: 'contact',
    });
  },

  // Événements de téléchargement/utilisation
  trackAppUsage: (feature: string) => {
    trackEvent({
      action: 'feature_used',
      category: 'app_usage',
      label: feature,
    });
  },
};

// Hook React pour utiliser les analytics
export const useAnalytics = () => {
  return {
    trackEvent,
    trackConversion,
    analytics,
  };
};

// Fonction pour initialiser les analytics (optionnel)
export const initAnalytics = () => {
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    console.log('📊 Google Analytics initialisé pour TuniDrive');
    
    // Événement de démarrage de l'application
    trackEvent({
      action: 'app_started',
      category: 'engagement',
      label: 'tunidrive_app',
    });
  }
};
