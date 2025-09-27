// Hook pour déclencher l'événement Google Ads spécifique
// Basé sur l'extrait fourni: "C_L0sbDEWU-fU": { "on": "visible", "vars": { "event_name": "conversion", "send_to": ["AW-17599907390/yz0xCPuh36EbEL6MpchB"] } }

export const useGoogleAdsConversion = () => {
  const triggerConversion = () => {
    if (typeof window !== 'undefined' && window.gtag) {
      console.log('🎯 Déclenchement conversion Google Ads (trigger visible)');
      
      // Implémentation de l'extrait d'événement fourni
      window.gtag('event', 'conversion', {
        'send_to': 'AW-17599907390/yz0xCPuh36EbEL6MpchB'
      });
      
      // Log pour debugging
      console.log('✅ Conversion Google Ads envoyée:', {
        event_name: 'conversion',
        send_to: 'AW-17599907390/yz0xCPuh36EbEL6MpchB'
      });
    } else {
      console.warn('⚠️ Google Tag Manager non disponible pour la conversion');
    }
  };

  return { triggerConversion };
};

// Fonction utilitaire pour déclencher la conversion
export const triggerGoogleAdsConversion = () => {
  if (typeof window !== 'undefined' && window.gtag) {
    console.log('🎯 Conversion Google Ads déclenchée (trigger visible)');
    
    // Extrait d'événement exact fourni par l'utilisateur
    window.gtag('event', 'conversion', {
      'send_to': 'AW-17599907390/yz0xCPuh36EbEL6MpchB'
    });
    
    // Log pour debugging
    console.log('✅ Conversion envoyée avec succès');
  } else {
    console.error('❌ Google Tag Manager non disponible');
  }
};
