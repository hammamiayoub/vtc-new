import { faqCategories, type FaqItem } from '../data/faqData';
import { vtcSeoFaqItems } from '../data/vtcSeoFaq';

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

function flattenFaq(): AssistantEntry[] {
  const fromCategories = faqCategories.flatMap((cat) =>
    cat.items.map((item) => ({
      id: item.id,
      question: item.question,
      answer: item.answer,
      categoryId: cat.id,
      categoryLabel: cat.label,
      keywords: buildKeywords(item.question, item.answer),
    })),
  );

  const fromSeo = vtcSeoFaqItems.map((item, index) => ({
    id: `seo-${index + 1}`,
    question: item.question,
    answer: item.answer,
    categoryId: 'client',
    categoryLabel: 'Je suis client',
    keywords: buildKeywords(item.question, item.answer, ['vtc', 'tunisie', 'aeroport']),
  }));

  const fromExtra = EXTRA_ENTRIES.map((entry, index) => ({
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

let cachedEntries: AssistantEntry[] | null = null;

export function getAssistantEntries(): AssistantEntry[] {
  if (!cachedEntries) cachedEntries = flattenFaq();
  return cachedEntries;
}

export function findAssistantEntryById(id: string): AssistantEntry | undefined {
  return getAssistantEntries().find((e) => e.id === id);
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
  if (/combien|tarif|prix|coute/.test(normalizedQuery) && /tarif|prix|tnd|km/.test(normalizeText(entry.answer))) {
    score += 10;
  }
  if (/aeroport|transfert|tun|enfidha/.test(normalizedQuery) && entry.keywords.includes('aeroport')) {
    score += 15;
  }
  if (/colis|europe|envoi|parcel/.test(normalizedQuery) && entry.categoryId === 'parcel') {
    score += 12;
  }
  if (/chauffeur|conducteur|inscri|partenaire|vtc/.test(normalizedQuery) && entry.categoryId === 'driver') {
    score += 10;
  }

  return score;
}

export function searchAssistantKnowledge(
  query: string,
  limit = 3,
): AssistantSearchResult[] {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const queryTokens = tokenize(trimmed);
  if (queryTokens.length === 0) return [];

  return getAssistantEntries()
    .map((entry) => ({ entry, score: scoreEntry(trimmed, queryTokens, entry) }))
    .filter((r) => r.score >= 14)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function getQuickSuggestions(): AssistantEntry[] {
  const ids = ['c3', 'c1', 'p1', 'd1', 'g3', 'extra-1', 'seo-2'];
  return ids
    .map((id) => findAssistantEntryById(id))
    .filter((e): e is AssistantEntry => Boolean(e));
}

export function formatAssistantFallback(): string {
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
