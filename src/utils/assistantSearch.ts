import { faqCategories, type FaqCategory, type FaqItem } from '../data/faqData';
import { faqCategoriesEn } from '../data/faqData.en';
import { vtcSeoFaqItems } from '../data/vtcSeoFaq';
import { vtcSeoFaqItemsEn } from '../data/vtcSeoFaq.en';
import type { Locale } from '../i18n/locale';

export interface AssistantEntry {
  id: string;
  question: string;
  answer: string;
  categoryId: string;
  categoryLabel: string;
  keywords: string[];
}

export interface AssistantSearchResult {
  entry: AssistantEntry;
  score: number;
}

const STOP_WORDS = new Set([
  'a', 'à', 'au', 'aux', 'avec', 'ce', 'ces', 'comment', 'd', 'dans', 'de', 'des', 'du', 'el', 'en', 'est',
  'et', 'eux', 'il', 'je', 'la', 'le', 'les', 'leur', 'lui', 'ma', 'mais', 'me', 'meme', 'mes', 'moi',
  'mon', 'ne', 'nos', 'notre', 'nous', 'on', 'ou', 'par', 'pas', 'peut', 'pour', 'qu', 'que', 'qui', 'sa',
  'se', 'ses', 'son', 'sur', 'ta', 'te', 'tes', 'ton', 'tu', 'un', 'une', 'vos', 'votre', 'vous', 'y',
  'the', 'is', 'are', 'do', 'does', 'what', 'how', 'can', 'i', 'my', 'to', 'of', 'and', 'or',
]);

/** Synonymes / reformulations fréquentes → tokens enrichis */
const SYNONYMS: Record<string, string[]> = {
  vtc: ['chauffeur', 'taxi', 'course', 'trajet', 'berline'],
  chauffeur: ['vtc', 'conducteur', 'driver', 'taxi'],
  taxi: ['vtc', 'chauffeur'],
  colis: ['parcel', 'envoi', 'marchandise', 'transporteur', 'europe'],
  parcel: ['colis', 'envoi'],
  aeroport: ['transfert', 'tun', 'enfidha', 'monastir', 'djerba', 'carthage'],
  transfert: ['aeroport', 'arrivee', 'depart'],
  tarif: ['prix', 'cout', 'coute', 'combien', 'grille', 'estimation'],
  prix: ['tarif', 'cout', 'combien'],
  abonnement: ['premium', 'subscription', 'mensuel', 'annuel', '30'],
  annuler: ['annulation', 'modifier', 'cancel'],
  inscription: ['compte', 'inscrire', 'signup', 'creer'],
  application: ['app', 'mobile', 'android', 'iphone', 'play', 'store'],
  whatsapp: ['support', 'contact', 'aide', '21628528477'],
  support: ['whatsapp', 'email', 'contact', 'aide'],
  paiement: ['payer', 'especes', 'carte', 'virement'],
  noter: ['avis', 'note', 'evaluation', 'etoile'],
  disponibilite: ['calendrier', 'horaire', 'planning'],
};

const EXTRA_ENTRIES: Omit<AssistantEntry, 'id'>[] = [
  {
    question: 'Comment contacter le support WhatsApp ?',
    answer:
      'Notre équipe est joignable sur WhatsApp au +216 28 528 477.\n\nVous pouvez aussi écrire à support@tunidrive.net (réponse sous 24 h en général).',
    categoryId: 'general',
    categoryLabel: 'Questions générales',
    keywords: ['whatsapp', 'support', 'contact', 'aide', 'telephone', '21628528477'],
  },
  {
    question: 'Où télécharger l\'application mobile TuniDrive ?',
    answer:
      'L\'application TuniDrive est disponible sur :\n• Google Play (Android)\n• App Store (iPhone/iPad)\n\nRetrouvez les liens en bas de page ou dans la bannière « Téléchargez l\'application ».',
    categoryId: 'general',
    categoryLabel: 'Questions générales',
    keywords: ['app', 'application', 'mobile', 'android', 'iphone', 'play store', 'app store', 'telecharger'],
  },
  {
    question: 'Puis-je obtenir un tarif sur l\'accueil sans me connecter ?',
    answer:
      'Oui. Sur la page d\'accueil, saisissez votre départ et destination dans le widget « Réserver maintenant », puis cliquez sur « Voir les prix ».\n\nPour confirmer une course, la création d\'un compte client (gratuit) est nécessaire. Votre devis peut être conservé si vous vous connectez juste après.',
    categoryId: 'client',
    categoryLabel: 'Je suis client',
    keywords: ['accueil', 'devis', 'prix', 'sans compte', 'estimation', 'widget'],
  },
];

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['’]/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(value: string): string[] {
  const normalized = normalizeText(value);
  if (!normalized) return [];

  const tokens = normalized.split(' ').filter((t) => t.length > 1 && !STOP_WORDS.has(t));
  const expanded = new Set(tokens);

  for (const token of tokens) {
    const extras = SYNONYMS[token];
    if (extras) extras.forEach((e) => expanded.add(normalizeText(e)));
  }

  return [...expanded];
}

function buildKeywords(question: string, answer: string, extra: string[] = []): string[] {
  const fromText = tokenize(`${question} ${answer}`);
  const fromExtra = extra.flatMap((k) => tokenize(k));
  return [...new Set([...fromText, ...fromExtra])];
}

const EXTRA_ENTRIES_EN: Omit<AssistantEntry, 'id'>[] = [
  {
    question: 'How do I contact support on WhatsApp?',
    answer:
      'Our team is available on WhatsApp at +216 28 528 477.\n\nYou can also email support@tunidrive.net (we usually reply within 24 hours).',
    categoryId: 'general',
    categoryLabel: 'General questions',
    keywords: ['whatsapp', 'support', 'contact', 'help', 'phone', '21628528477'],
  },
  {
    question: 'Where can I download the TuniDrive app?',
    answer:
      'The TuniDrive app is available on:\n• Google Play (Android)\n• App Store (iPhone/iPad)\n\nLinks are in the footer and in the download banner.',
    categoryId: 'general',
    categoryLabel: 'General questions',
    keywords: ['app', 'application', 'mobile', 'android', 'iphone', 'play store', 'app store', 'download'],
  },
  {
    question: 'Can I see a price on the homepage without signing in?',
    answer:
      'Yes. On the homepage, enter pickup and destination in Book now, then click See prices.\n\nA free rider account is required to confirm a ride. Your quote can be kept if you sign in right after.',
    categoryId: 'client',
    categoryLabel: 'I am a rider',
    keywords: ['home', 'quote', 'price', 'without account', 'estimate', 'widget'],
  },
];

function flattenFaq(locale: Locale = 'fr'): AssistantEntry[] {
  const categories: FaqCategory[] = locale === 'en' ? faqCategoriesEn : faqCategories;
  const seoItems = locale === 'en' ? vtcSeoFaqItemsEn : vtcSeoFaqItems;
  const extras = locale === 'en' ? EXTRA_ENTRIES_EN : EXTRA_ENTRIES;
  const clientLabel = locale === 'en' ? 'I am a rider' : 'Je suis client';

  const fromCategories = categories.flatMap((cat) =>
    cat.items.map((item) => ({
      id: item.id,
      question: item.question,
      answer: item.answer,
      categoryId: cat.id,
      categoryLabel: cat.label,
      keywords: buildKeywords(item.question, item.answer),
    })),
  );

  const fromSeo = seoItems.map((item, index) => ({
    id: `seo-${index + 1}`,
    question: item.question,
    answer: item.answer,
    categoryId: 'client',
    categoryLabel: clientLabel,
    keywords: buildKeywords(item.question, item.answer, ['vtc', 'tunisia', 'airport', 'aeroport']),
  }));

  const fromExtra = extras.map((entry, index) => ({
    id: `extra-${index + 1}`,
    ...entry,
    keywords: buildKeywords(entry.question, entry.answer, entry.keywords),
  }));

  const byQuestion = new Map<string, AssistantEntry>();
  for (const entry of [...fromCategories, ...fromSeo, ...fromExtra]) {
    const key = normalizeText(entry.question);
    if (!byQuestion.has(key)) byQuestion.set(key, entry);
  }

  return [...byQuestion.values()];
}

const cachedEntries: Partial<Record<Locale, AssistantEntry[]>> = {};

export function getAssistantEntries(locale: Locale = 'fr'): AssistantEntry[] {
  if (!cachedEntries[locale]) cachedEntries[locale] = flattenFaq(locale);
  return cachedEntries[locale] as AssistantEntry[];
}

export function findAssistantEntryById(id: string, locale: Locale = 'fr'): AssistantEntry | undefined {
  return getAssistantEntries(locale).find((e) => e.id === id);
}

function scoreEntry(query: string, queryTokens: string[], entry: AssistantEntry): number {
  const normalizedQuery = normalizeText(query);
  const normalizedQuestion = normalizeText(entry.question);

  if (!normalizedQuery) return 0;

  if (normalizedQuestion === normalizedQuery) return 100;
  if (normalizedQuestion.includes(normalizedQuery) || normalizedQuery.includes(normalizedQuestion)) {
    return 85;
  }

  let score = 0;
  const entryTokens = new Set(entry.keywords);

  for (const token of queryTokens) {
    if (entryTokens.has(token)) score += 12;
  }

  const questionTokens = tokenize(entry.question);
  for (const token of queryTokens) {
    if (questionTokens.includes(token)) score += 8;
  }

  // Bonus expressions fréquentes
  if (/combien|tarif|prix|coute|price|fare|cost/.test(normalizedQuery) && /tarif|prix|price|tnd|km/.test(normalizeText(entry.answer))) {
    score += 10;
  }
  if (/aeroport|airport|transfert|transfer|tun|enfidha/.test(normalizedQuery) && /aeroport|airport/.test(entry.keywords.join(' '))) {
    score += 15;
  }
  if (/colis|europe|envoi|parcel|shipping/.test(normalizedQuery) && entry.categoryId === 'parcel') {
    score += 12;
  }
  if (/chauffeur|driver|conducteur|inscri|partenaire|vtc|signup/.test(normalizedQuery) && entry.categoryId === 'driver') {
    score += 10;
  }

  return score;
}

export function searchAssistantKnowledge(
  query: string,
  limit = 3,
  locale: Locale = 'fr',
): AssistantSearchResult[] {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const queryTokens = tokenize(trimmed);
  if (queryTokens.length === 0) return [];

  return getAssistantEntries(locale)
    .map((entry) => ({ entry, score: scoreEntry(trimmed, queryTokens, entry) }))
    .filter((r) => r.score >= 14)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function getQuickSuggestions(locale: Locale = 'fr'): AssistantEntry[] {
  const ids = ['c3', 'c1', 'p1', 'd1', 'g3', 'extra-1', 'seo-2'];
  return ids
    .map((id) => findAssistantEntryById(id, locale))
    .filter((e): e is AssistantEntry => Boolean(e));
}

export function formatAssistantFallback(locale: Locale = 'fr'): string {
  if (locale === 'en') {
    return (
      'I could not find a precise answer to that question.\n\n' +
      'Try keywords such as “price”, “airport”, “parcel” or “driver subscription”, or browse the categories below.\n\n' +
      'For personal help:\n' +
      '• WhatsApp: +216 28 528 477\n' +
      '• Email: support@tunidrive.net'
    );
  }
  return (
    'Je n\'ai pas trouvé de réponse précise à cette question.\n\n' +
    'Essayez des mots-clés comme « tarif », « aéroport », « colis », « abonnement chauffeur » ou parcourez les catégories ci-dessous.\n\n' +
    'Pour une aide personnalisée :\n' +
    '• WhatsApp : +216 28 528 477\n' +
    '• Email : support@tunidrive.net'
  );
}

/** Pour tests / debug */
export function resolveFaqItem(entry: AssistantEntry): FaqItem {
  return { id: entry.id, question: entry.question, answer: entry.answer };
}
