// Utilitaire pour gérer les balises meta SEO
export interface SEOData {
  title: string;
  description: string;
  keywords?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  canonical?: string;
}

// Données SEO par page
export const seoData: Record<string, SEOData> = {
  home: {
    title: "TuniDrive - Chauffeur privé Tunisie | VTC et Transport collectif",
    description: "TuniDrive est la plateforme de référence pour trouver un chauffeur privé en Tunisie. Services VTC, transport collectif, déménagement. Chauffeurs professionnels certifiés pour tous vos trajets.",
    keywords: "chauffeur privé Tunisie, VTC Tunisie, transport collectif Tunisie, déménagement Tunisie, chauffeur professionnel Tunisie, transport privé Tunisie",
    ogTitle: "TuniDrive - Chauffeur privé Tunisie | VTC et Transport",
    ogDescription: "Plateforme de référence pour chauffeur privé en Tunisie. Services VTC, transport collectif, déménagement. Chauffeurs professionnels certifiés.",
    canonical: "/"
  },
  signup: {
    title: "Devenir Chauffeur Privé Tunisie | Poste Chauffeur VTC TuniDrive",
    description: "Rejoignez TuniDrive comme chauffeur privé en Tunisie. Poste chauffeur VTC disponible, formation incluse, revenus attractifs. Devenez chauffeur professionnel certifié.",
    keywords: "poste chauffeur privé Tunisie, devenir chauffeur VTC Tunisie, emploi chauffeur Tunisie, chauffeur professionnel Tunisie, recrutement chauffeur Tunisie",
    ogTitle: "Devenir Chauffeur Privé Tunisie | TuniDrive",
    ogDescription: "Rejoignez TuniDrive comme chauffeur privé. Poste chauffeur VTC disponible, formation incluse, revenus attractifs en Tunisie.",
    canonical: "/signup"
  },
  "client-signup": {
    title: "Inscription Client | Chauffeur Privé Tunisie TuniDrive",
    description: "Inscrivez-vous sur TuniDrive pour réserver un chauffeur privé en Tunisie. Accès aux meilleurs chauffeurs VTC, transport collectif et services de déménagement.",
    keywords: "inscription client Tunisie, réserver chauffeur privé Tunisie, VTC Tunisie, transport collectif Tunisie, déménagement Tunisie",
    ogTitle: "Inscription Client | TuniDrive Tunisie",
    ogDescription: "Inscrivez-vous sur TuniDrive pour réserver un chauffeur privé. Accès aux meilleurs chauffeurs VTC et services de transport en Tunisie.",
    canonical: "/client-signup"
  },
  "driver-login": {
    title: "Connexion Chauffeur | TuniDrive Tunisie",
    description: "Connectez-vous à votre espace chauffeur TuniDrive. Gérez vos réservations, votre planning et vos revenus de chauffeur privé en Tunisie.",
    keywords: "connexion chauffeur Tunisie, espace chauffeur VTC Tunisie, chauffeur privé Tunisie, TuniDrive chauffeur",
    ogTitle: "Connexion Chauffeur | TuniDrive",
    ogDescription: "Connectez-vous à votre espace chauffeur TuniDrive. Gérez vos réservations et votre planning de chauffeur privé.",
    canonical: "/driver-login"
  },
  "client-login": {
    title: "Connexion Client | TuniDrive Tunisie",
    description: "Connectez-vous à votre espace client TuniDrive. Réservez un chauffeur privé, gérez vos trajets et accédez aux services VTC en Tunisie.",
    keywords: "connexion client Tunisie, espace client VTC Tunisie, réserver chauffeur privé Tunisie, TuniDrive client",
    ogTitle: "Connexion Client | TuniDrive",
    ogDescription: "Connectez-vous à votre espace client TuniDrive. Réservez un chauffeur privé et gérez vos trajets en Tunisie.",
    canonical: "/client-login"
  },
  "client-dashboard": {
    title: "Tableau de Bord Client | TuniDrive Tunisie",
    description: "Gérez vos réservations de chauffeur privé sur TuniDrive. Consultez vos trajets, réservez un VTC et accédez aux services de transport collectif en Tunisie.",
    keywords: "tableau de bord client Tunisie, réservations chauffeur privé Tunisie, VTC Tunisie, transport collectif Tunisie",
    ogTitle: "Tableau de Bord Client | TuniDrive",
    ogDescription: "Gérez vos réservations de chauffeur privé. Consultez vos trajets et réservez un VTC en Tunisie.",
    canonical: "/client-dashboard"
  },
  "privacy-policy": {
    title: "Politique de Confidentialité | TuniDrive Tunisie",
    description: "Politique de confidentialité de TuniDrive. Protection des données des clients, chauffeurs VTC et transporteurs de colis Europe ↔ Tunisie.",
    keywords: "politique confidentialité Tunisie, protection données TuniDrive, RGPD Tunisie, transport colis Tunisie, confidentialité transporteur",
    ogTitle: "Politique de Confidentialité | TuniDrive",
    ogDescription: "Protection des données personnelles sur TuniDrive : VTC, devis colis internationaux et comptes transporteurs.",
    canonical: "/privacy-policy"
  },
  "terms-of-service": {
    title: "Conditions d'Utilisation | TuniDrive Tunisie",
    description: "CGU TuniDrive : réservation VTC, devis transport de colis Europe ↔ Tunisie, obligations des chauffeurs et transporteurs partenaires.",
    keywords: "conditions utilisation Tunisie, CGU TuniDrive, chauffeur privé Tunisie, transporteur colis Tunisie, VTC Tunisie",
    ogTitle: "Conditions d'Utilisation | TuniDrive",
    ogDescription: "Conditions générales d'utilisation de TuniDrive : mobilité VTC et mise en relation pour le transport international de colis.",
    canonical: "/terms-of-service"
  }
};

// Fonction pour mettre à jour les balises meta
export const updateSEO = (pageKey: string) => {
  const seo = seoData[pageKey];
  if (!seo) return;

  // Mettre à jour le titre
  document.title = seo.title;

  // Mettre à jour la meta description
  let metaDescription = document.querySelector('meta[name="description"]');
  if (!metaDescription) {
    metaDescription = document.createElement('meta');
    metaDescription.setAttribute('name', 'description');
    document.head.appendChild(metaDescription);
  }
  metaDescription.setAttribute('content', seo.description);

  // Mettre à jour les mots-clés
  if (seo.keywords) {
    let metaKeywords = document.querySelector('meta[name="keywords"]');
    if (!metaKeywords) {
      metaKeywords = document.createElement('meta');
      metaKeywords.setAttribute('name', 'keywords');
      document.head.appendChild(metaKeywords);
    }
    metaKeywords.setAttribute('content', seo.keywords);
  }

  // Mettre à jour les balises Open Graph
  if (seo.ogTitle) {
    let ogTitle = document.querySelector('meta[property="og:title"]');
    if (!ogTitle) {
      ogTitle = document.createElement('meta');
      ogTitle.setAttribute('property', 'og:title');
      document.head.appendChild(ogTitle);
    }
    ogTitle.setAttribute('content', seo.ogTitle);
  }

  if (seo.ogDescription) {
    let ogDescription = document.querySelector('meta[property="og:description"]');
    if (!ogDescription) {
      ogDescription = document.createElement('meta');
      ogDescription.setAttribute('property', 'og:description');
      document.head.appendChild(ogDescription);
    }
    ogDescription.setAttribute('content', seo.ogDescription);
  }

  if (seo.ogImage) {
    let ogImage = document.querySelector('meta[property="og:image"]');
    if (!ogImage) {
      ogImage = document.createElement('meta');
      ogImage.setAttribute('property', 'og:image');
      document.head.appendChild(ogImage);
    }
    ogImage.setAttribute('content', seo.ogImage);
  }

  // Mettre à jour le lien canonique
  if (seo.canonical) {
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', `${window.location.origin}${seo.canonical}`);
  }
};

// Fonction pour obtenir les données SEO d'une page
export const getSEOData = (pageKey: string): SEOData | null => {
  return seoData[pageKey] || null;
};
