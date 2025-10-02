// Fonction utilitaire pour déclencher les conversions Google Ads
// Utilise l'ID de conversion principal pour les inscriptions et réservations

export const triggerGoogleAdsConversion = (conversionType: 'signup' | 'booking' = 'signup') => {
  if (typeof window !== 'undefined' && window.gtag) {
    console.log(`🎯 Conversion Google Ads déclenchée (${conversionType})`);
    
    // ID de conversion principal pour les inscriptions et réservations
    const conversionId = 'AW-17599907390/Q3o8CIfGmaUbEL6MpchB';
    
    window.gtag('event', 'conversion', {
      'send_to': conversionId,
      'value': 1.0,
      'currency': 'EUR'
    });
    
    console.log('✅ Conversion Google Ads envoyée:', {
      conversionType,
      send_to: conversionId,
      value: 1.0,
      currency: 'EUR'
    });
  } else {
    console.error('❌ Google Tag Manager non disponible');
  }
};

// Hook pour déclencher l'événement Google Ads spécifique
export const useGoogleAdsConversion = () => {
  const triggerConversion = (conversionType: 'signup' | 'booking' = 'signup') => {
    triggerGoogleAdsConversion(conversionType);
  };

  return { triggerConversion };
};
