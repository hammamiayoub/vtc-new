// Utilitaire pour gérer les balises meta SEO
import { vtcSeoFaqItems } from '../data/vtcSeoFaq';

export const SITE_URL = 'https://tunidrive.net';
export const DEFAULT_OG_IMAGE = `${SITE_URL}/tunidrive-logo.png`;

export interface SEOData {
  title: string;
  description: string;
  keywords?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  canonical?: string;
}

export interface FaqStructuredItem {
  question: string;
  answer: string;
}

// Données SEO par page
export const seoData: Record<string, SEOData> = {
  home: {
    title: 'VTC Tunisie | Chauffeur privé, transfert aéroport & taxi — TuniDrive',
    description:
      'Réservez un VTC, un chauffeur privé ou un taxi en Tunisie avec TuniDrive. Transfert aéroport Tunis-Carthage, Enfidha, Monastir, transport collectif (van, bus), trajets inter-villes. Prix affiché avant confirmation.',
    keywords:
      'vtc tunisie, chauffeur privé tunisie, transfert aéroport tunisie, réserver taxi tunisie, réserver chauffeur tunisie, transport collectif tunisie, vtc tunis, taxi aéroport tunis carthage, chauffeur privé sfax, vtc sousse, réserver vtc en ligne tunisie',
    ogTitle: 'VTC Tunisie — Chauffeur privé & transfert aéroport | TuniDrive',
    ogDescription:
      'Réservez votre chauffeur privé VTC en Tunisie : transferts aéroport, taxi en ligne, van et bus pour groupes. Tarif transparent sur tunidrive.net.',
    ogImage: DEFAULT_OG_IMAGE,
    canonical: '/',
  },
  'vtc-tunisie': {
    title: 'VTC Tunisie — Chauffeur privé, transfert aéroport & transport collectif | TuniDrive',
    description:
      'Page dédiée VTC Tunisie : réservez un chauffeur privé, un transfert aéroport (Tunis, Enfidha, Monastir, Djerba), un taxi ou un transport collectif (van, minibus, bus) partout en Tunisie.',
    keywords:
      'vtc tunisie, chauffeur privé tunisie, transfert aéroport tunisie, réserver taxi tunisie, réserver chauffeur tunisie, transport collectif tunisie, transfert aéroport tunis carthage, vtc enfidha hammamet, chauffeur privé djerba',
    ogTitle: 'VTC Tunisie — Réserver un chauffeur privé en ligne | TuniDrive',
    ogDescription:
      'Transfert aéroport, taxi VTC, transport collectif : réservez votre chauffeur privé en Tunisie avec TuniDrive.',
    ogImage: DEFAULT_OG_IMAGE,
    canonical: '/vtc-tunisie',
  },
  'parcel-transport': {
    title: 'Transport de colis Europe ↔ Tunisie | Devis gratuit TuniDrive',
    description:
      'Envoyez ou recevez des colis et marchandises entre l\'Europe et la Tunisie. Déposez une demande de devis gratuite, comparez les propositions des transporteurs partenaires et validez en ligne.',
    keywords:
      'transport colis Europe Tunisie, envoi colis Tunisie France, colis France Tunisie, transporteur colis international, devis transport colis, envoi marchandises Tunisie, colis Italie Tunisie, colis Allemagne Tunisie',
    ogTitle: 'Transport de colis Europe ↔ Tunisie | TuniDrive',
    ogDescription:
      'Demandez un devis gratuit pour le transport international de colis et marchandises entre l\'Europe et la Tunisie. Plusieurs transporteurs, prix transparents.',
    ogImage: DEFAULT_OG_IMAGE,
    canonical: '/transport-colis-europe-tunisie',
  },
  blog: {
    title: 'Blog TuniDrive | VTC, transport colis & mobilité en Tunisie',
    description:
      'Articles et guides TuniDrive : chauffeur privé VTC en Tunisie, transport de colis Europe ↔ Tunisie, conseils pratiques et actualités transport.',
    keywords:
      'blog VTC Tunisie, transport colis Europe Tunisie, conseils chauffeur privé, envoi colis Tunisie, actualités mobilité Tunisie',
    ogTitle: 'Blog TuniDrive | VTC & transport colis',
    ogDescription:
      'Guides et articles sur le VTC en Tunisie et le transport international de colis Europe ↔ Tunisie.',
    ogImage: DEFAULT_OG_IMAGE,
    canonical: '/blog',
  },
  about: {
    title: 'À propos de TuniDrive | Comment ça marche — VTC & colis',
    description:
      'Découvrez le fonctionnement de TuniDrive : réservation VTC en Tunisie, transfert aéroport, transport collectif et devis colis Europe ↔ Tunisie. Tarifs transparents, chauffeurs et transporteurs partenaires.',
    keywords:
      'à propos TuniDrive, comment fonctionne TuniDrive, plateforme VTC Tunisie, transport colis Europe Tunisie, réserver chauffeur privé',
    ogTitle: 'À propos de TuniDrive — Comment ça marche',
    ogDescription:
      'TuniDrive met en relation clients, chauffeurs VTC et transporteurs de colis. Découvrez comment réserver une course ou demander un devis.',
    ogImage: DEFAULT_OG_IMAGE,
    canonical: '/a-propos',
  },
  signup: {
    title: 'Devenir chauffeur ou transporteur | VTC & colis TuniDrive',
    description:
      'Rejoignez TuniDrive : chauffeur VTC en Tunisie ou transporteur de colis Europe ↔ Tunisie. Inscription gratuite, revenus flexibles, demandes de courses et devis colis.',
    keywords:
      'devenir chauffeur VTC Tunisie, transporteur colis Europe Tunisie, emploi chauffeur Tunisie, recrutement transporteur colis, chauffeur privé Tunisie',
    ogTitle: 'Devenir chauffeur ou transporteur | TuniDrive',
    ogDescription:
      'Inscrivez-vous comme chauffeur VTC ou transporteur de colis internationaux. Développez votre activité avec TuniDrive.',
    ogImage: DEFAULT_OG_IMAGE,
    canonical: '/signup',
  },
  'client-signup': {
    title: 'Inscription client | VTC & transport de colis TuniDrive',
    description:
      'Créez votre compte TuniDrive pour réserver un chauffeur privé en Tunisie ou demander un devis transport de colis Europe ↔ Tunisie.',
    keywords:
      'inscription client Tunisie, réserver chauffeur privé, devis colis Europe Tunisie, VTC Tunisie, compte client transport colis',
    ogTitle: 'Inscription client | TuniDrive',
    ogDescription:
      'Compte client TuniDrive : courses VTC en Tunisie et demandes de devis pour colis internationaux.',
    ogImage: DEFAULT_OG_IMAGE,
    canonical: '/client-signup',
  },
  'driver-login': {
    title: 'Connexion chauffeur / transporteur | TuniDrive',
    description:
      'Espace chauffeur et transporteur TuniDrive : gérez vos courses VTC, vos demandes de colis Europe ↔ Tunisie et votre planning.',
    keywords:
      'connexion chauffeur Tunisie, espace transporteur colis, chauffeur VTC Tunisie, TuniDrive chauffeur',
    ogTitle: 'Connexion chauffeur / transporteur | TuniDrive',
    ogDescription:
      'Connectez-vous à votre espace chauffeur ou transporteur TuniDrive.',
    ogImage: DEFAULT_OG_IMAGE,
    canonical: '/driver-login',
  },
  'client-login': {
    title: 'Connexion client | VTC & colis TuniDrive',
    description:
      'Connectez-vous à TuniDrive pour réserver une course VTC ou gérer vos demandes de transport de colis Europe ↔ Tunisie.',
    keywords:
      'connexion client Tunisie, espace client VTC, devis colis Europe Tunisie, réserver chauffeur privé',
    ogTitle: 'Connexion client | TuniDrive',
    ogDescription:
      'Accédez à votre espace client : courses VTC et transport international de colis.',
    ogImage: DEFAULT_OG_IMAGE,
    canonical: '/client-login',
  },
  'client-dashboard': {
    title: 'Tableau de bord client | TuniDrive',
    description:
      'Gérez vos réservations VTC et vos demandes de transport de colis Europe ↔ Tunisie depuis votre espace client TuniDrive.',
    keywords:
      'tableau de bord client, réservations VTC Tunisie, devis colis Europe Tunisie, suivi transport colis',
    ogTitle: 'Tableau de bord client | TuniDrive',
    ogDescription:
      'Vos courses VTC et demandes de colis internationaux sur TuniDrive.',
    ogImage: DEFAULT_OG_IMAGE,
    canonical: '/client-dashboard',
  },
  'privacy-policy': {
    title: 'Politique de confidentialité | TuniDrive',
    description:
      'Politique de confidentialité TuniDrive : protection des données clients, chauffeurs VTC et transporteurs de colis Europe ↔ Tunisie.',
    keywords:
      'politique confidentialité TuniDrive, RGPD, transport colis Tunisie, protection données transporteur',
    ogTitle: 'Politique de confidentialité | TuniDrive',
    ogDescription:
      'Protection des données sur TuniDrive : VTC, devis colis internationaux et comptes transporteurs.',
    ogImage: DEFAULT_OG_IMAGE,
    canonical: '/privacy-policy',
  },
  'terms-of-service': {
    title: "Conditions d'utilisation | TuniDrive",
    description:
      'CGU TuniDrive : réservation VTC, devis transport de colis Europe ↔ Tunisie, obligations des chauffeurs et transporteurs partenaires.',
    keywords:
      'CGU TuniDrive, conditions utilisation, transporteur colis Tunisie, chauffeur privé Tunisie, VTC Tunisie',
    ogTitle: "Conditions d'utilisation | TuniDrive",
    ogDescription:
      'Conditions générales TuniDrive : mobilité VTC et mise en relation pour le transport international de colis.',
    ogImage: DEFAULT_OG_IMAGE,
    canonical: '/terms-of-service',
  },
};

function setMetaContent(
  selector: string,
  attribute: 'name' | 'property',
  key: string,
  content: string
) {
  let el = document.querySelector(`meta[${attribute}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attribute, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setLinkRel(href: string) {
  let canonical = document.querySelector('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement('link');
    canonical.setAttribute('rel', 'canonical');
    document.head.appendChild(canonical);
  }
  canonical.setAttribute('href', href);
}

export const setFaqJsonLd = (items: FaqStructuredItem[]) => {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer.replace(/\n/g, ' '),
      },
    })),
  };
  setJsonLd('faq-page', data);
};

export const setJsonLd = (id: string, data: object) => {
  let script = document.querySelector(`script[data-seo-jsonld="${id}"]`);
  if (!script) {
    script = document.createElement('script');
    script.setAttribute('type', 'application/ld+json');
    script.setAttribute('data-seo-jsonld', id);
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(data);
};

export const removeJsonLd = (id: string) => {
  document.querySelector(`script[data-seo-jsonld="${id}"]`)?.remove();
};

// Fonction pour mettre à jour les balises meta
export const updateSEO = (pageKey: string) => {
  const seo = seoData[pageKey];
  if (!seo) return;

  const canonicalUrl = seo.canonical
    ? `${SITE_URL}${seo.canonical}`
    : `${SITE_URL}${window.location.pathname}`;

  document.title = seo.title;

  setMetaContent('meta', 'name', 'description', seo.description);

  if (seo.keywords) {
    setMetaContent('meta', 'name', 'keywords', seo.keywords);
  }

  setMetaContent('meta', 'property', 'og:type', 'website');
  setMetaContent('meta', 'property', 'og:url', canonicalUrl);
  setMetaContent('meta', 'property', 'og:site_name', 'TuniDrive');

  if (seo.ogTitle) {
    setMetaContent('meta', 'property', 'og:title', seo.ogTitle);
  }
  if (seo.ogDescription) {
    setMetaContent('meta', 'property', 'og:description', seo.ogDescription);
  }

  const ogImage = seo.ogImage ?? DEFAULT_OG_IMAGE;
  setMetaContent('meta', 'property', 'og:image', ogImage);

  setMetaContent('meta', 'property', 'twitter:card', 'summary_large_image');
  setMetaContent('meta', 'property', 'twitter:url', canonicalUrl);
  setMetaContent('meta', 'property', 'twitter:title', seo.ogTitle ?? seo.title);
  setMetaContent(
    'meta',
    'property',
    'twitter:description',
    seo.ogDescription ?? seo.description
  );
  setMetaContent('meta', 'property', 'twitter:image', ogImage);

  setLinkRel(canonicalUrl);

  if (pageKey === 'parcel-transport') {
    setFaqJsonLd(getParcelFaqItems());
  } else if (pageKey === 'home' || pageKey === 'vtc-tunisie') {
    setFaqJsonLd(vtcSeoFaqItems);
  } else {
    removeJsonLd('faq-page');
  }
};

export const getSEOData = (pageKey: string): SEOData | null => {
  return seoData[pageKey] || null;
};

export const getParcelFaqItems = (): FaqStructuredItem[] => [
  {
    question: 'Comment demander un devis pour un colis Europe ↔ Tunisie ?',
    answer:
      'Créez un compte client TuniDrive, ouvrez l\'onglet Transport colis, indiquez la direction (Europe → Tunisie ou Tunisie → Europe), les adresses, la date et la description de vos objets. Votre demande est envoyée aux transporteurs correspondants.',
  },
  {
    question: 'Quels pays européens sont couverts pour l\'envoi de colis vers la Tunisie ?',
    answer:
      'Le service couvre le transport international de colis entre la Tunisie et plusieurs pays d\'Europe : France, Italie, Allemagne, Espagne, Belgique, Luxembourg, Suisse et Pays-Bas, dans les deux sens.',
  },
  {
    question: 'Comment sont fixés les prix du transport de colis ?',
    answer:
      'Les transporteurs partenaires vous envoient des propositions de prix libres. Vous comparez les offres dans votre espace client et acceptez celle qui vous convient. Tarif en EUR pour Europe → Tunisie, en TND pour Tunisie → Europe.',
  },
  {
    question: 'Comment devenir transporteur de colis sur TuniDrive ?',
    answer:
      'Inscrivez-vous via Devenir chauffeur / transporteur, choisissez Transport de colis ou Les deux activités, complétez votre profil et vos disponibilités pour recevoir les demandes correspondantes.',
  },
];
