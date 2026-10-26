import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  MessageCircle,
  X,
  ChevronLeft,
  ChevronRight,
  Send,
  RotateCcw,
  ThumbsUp,
  ThumbsDown,
  Mail,
} from 'lucide-react';
import { faqCategories, FaqCategory, FaqItem } from '../data/faqData';
import { faqCategoriesEn } from '../data/faqData.en';
import { useLocale } from '../i18n/locale';
import {
  searchAssistantKnowledge,
  getQuickSuggestions,
  getRelatedEntries,
  findAssistantEntryById,
  audienceForPath,
  formatAssistantFallback,
  type AssistantEntry,
} from '../utils/assistantSearch';
import { cn } from '../utils/cn';

type Screen = 'categories' | 'questions' | 'answer' | 'search' | 'contact';

interface ChatMessage {
  type: 'bot' | 'user';
  text: string;
}

const HIGH_CONFIDENCE_SCORE = 55;
const WHATSAPP_URL = 'https://wa.me/21628528477';
const SUPPORT_EMAIL = 'support@tunidrive.net';
const TEASER_KEY = 'td_chat_teaser_seen';
const OPENED_KEY = 'td_chat_opened';

/** Au-dessus des bannières cookies + téléchargement app (variables CSS sur :root) */
const CHAT_FLOAT_BOTTOM =
  'calc(max(1rem, var(--td-bottom-banner-offset, 0px)) + var(--td-app-download-offset, 0px) + 1.5rem)';
const CHAT_PANEL_BOTTOM =
  'calc(max(1rem, var(--td-bottom-banner-offset, 0px)) + var(--td-app-download-offset, 0px) + 4.5rem)';

function readSession(key: string): boolean {
  try {
    return window.sessionStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

function writeSession(key: string) {
  try {
    window.sessionStorage.setItem(key, '1');
  } catch {
    /* stockage indisponible : le comportement reste correct sans mémoire */
  }
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Salutations et remerciements : on répond poliment au lieu d'afficher « aucun résultat ». */
function smallTalk(query: string, en: boolean): string | null {
  const q = normalize(query);
  if (q.length > 24) return null;
  if (/^(bonjour|bonsoir|salut|salam|coucou|hello|hi|hey|good morning|good evening)( .*)?$/.test(q)) {
    return en
      ? 'Hello! How can I help you? Ask a question or pick a topic below.'
      : 'Bonjour ! Comment puis-je vous aider ? Posez votre question ou choisissez un sujet ci-dessous.';
  }
  if (/^(merci|merci beaucoup|thanks|thank you|thx|chokran|shokran)( .*)?$/.test(q)) {
    return en
      ? 'You are welcome! Is there anything else I can help with?'
      : 'Avec plaisir ! Puis-je vous aider sur autre chose ?';
  }
  return null;
}

const LINK_PATTERN = /(https?:\/\/[^\s]+)|([\w.+-]+@[\w-]+\.[\w.-]+)|(\+216(?: ?\d){8})/g;

/** Texte de réponse : puces, paragraphes, et liens cliquables (téléphone, email, URL). */
function renderRichText(text: string, linkClass: string): React.ReactNode {
  return text.split('\n').map((line, lineIndex) => {
    if (line.trim() === '') return <div key={lineIndex} className="h-2" aria-hidden="true" />;

    const bullet = line.startsWith('• ');
    const content = bullet ? line.slice(2) : line;

    const nodes: React.ReactNode[] = [];
    let last = 0;
    for (const match of content.matchAll(LINK_PATTERN)) {
      const index = match.index ?? 0;
      if (index > last) nodes.push(content.slice(last, index));
      const [value, url, email, phone] = match;
      const href = url ? value : email ? `mailto:${value}` : `tel:${phone.replace(/\s/g, '')}`;
      nodes.push(
        <a
          key={`${lineIndex}-${index}`}
          href={href}
          className={linkClass}
          {...(url ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
        >
          {value}
        </a>,
      );
      last = index + value.length;
    }
    if (last < content.length) nodes.push(content.slice(last));

    return bullet ? (
      <div key={lineIndex} className="flex gap-2 pl-1">
        <span aria-hidden="true">•</span>
        <span className="min-w-0">{nodes}</span>
      </div>
    ) : (
      <div key={lineIndex}>{nodes}</div>
    );
  });
}

const chipClass =
  'focus-ring w-full text-left px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 transition-colors text-sm text-gray-800 flex items-center justify-between gap-2 group';

export const ChatWidget: React.FC = () => {
  const { locale, logicalPath } = useLocale();
  const en = locale === 'en';
  const showWhatsApp = logicalPath === '/';
  const audience = audienceForPath(logicalPath);
  const categories = en ? faqCategoriesEn : faqCategories;

  const greeting = en
    ? 'Hello, I am the TuniDrive assistant.\n\nAsk a question below (fares, airport, parcels, driver…) or choose a category.'
    : "Bonjour ! Je suis l'assistant TuniDrive.\n\nPosez votre question ci-dessous (tarifs, aéroport, colis, chauffeur…) ou choisissez une catégorie.";

  const [isOpen, setIsOpen] = useState(false);
  const [screen, setScreen] = useState<Screen>('categories');
  const [selectedCategory, setSelectedCategory] = useState<FaqCategory | null>(null);
  const [currentEntry, setCurrentEntry] = useState<AssistantEntry | null>(null);
  const [awaitingFeedback, setAwaitingFeedback] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<AssistantEntry[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([{ type: 'bot', text: greeting }]);
  const [hasUnread, setHasUnread] = useState(() => !readSession(OPENED_KEY));
  const [showTeaser, setShowTeaser] = useState(false);

  const scrollEndRef = useRef<HTMLDivElement>(null);
  const lastBotRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const timersRef = useRef<number[]>([]);

  const schedule = useCallback((fn: () => void, ms: number) => {
    timersRef.current.push(window.setTimeout(fn, ms));
  }, []);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  // Nouvelle langue : on repart d'une conversation propre
  useEffect(() => {
    clearTimers();
    setIsTyping(false);
    setMessages([{ type: 'bot', text: greeting }]);
    setScreen('categories');
    setSelectedCategory(null);
    setCurrentEntry(null);
    setAwaitingFeedback(false);
    setSearchResults([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [en]);

  // Bulle d'invitation : une seule fois par session, discrète, qui disparaît seule
  useEffect(() => {
    if (readSession(TEASER_KEY) || readSession(OPENED_KEY)) return;
    const show = window.setTimeout(() => {
      setShowTeaser(true);
      writeSession(TEASER_KEY);
    }, 4000);
    const hide = window.setTimeout(() => setShowTeaser(false), 13000);
    return () => {
      window.clearTimeout(show);
      window.clearTimeout(hide);
    };
  }, []);

  // Une nouvelle réponse s'affiche depuis son début (on lit de haut en bas), pas depuis sa fin.
  // Les autres cas (message de l'utilisateur, indicateur de saisie) restent calés en bas.
  useEffect(() => {
    if (!isOpen || messages.length <= 1) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const behavior = reduce ? 'auto' : 'smooth';
    const last = messages[messages.length - 1];
    if (last.type === 'bot' && !isTyping) {
      lastBotRef.current?.scrollIntoView({ behavior, block: 'start' });
    } else {
      scrollEndRef.current?.scrollIntoView({ behavior, block: 'end' });
    }
  }, [isOpen, messages, isTyping]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    launcherRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, handleClose]);

  const handleOpen = () => {
    setIsOpen(true);
    setHasUnread(false);
    setShowTeaser(false);
    writeSession(OPENED_KEY);
    // Sur mobile, ne pas ouvrir le clavier d'office : il masquerait la conversation
    if (window.matchMedia('(pointer: fine)').matches) {
      window.setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const pushUser = useCallback((text: string) => {
    setMessages((prev) => [...prev, { type: 'user', text }]);
  }, []);

  const pushBot = useCallback((text: string) => {
    setMessages((prev) => [...prev, { type: 'bot', text }]);
  }, []);

  /** Réponse du bot avec un court indicateur de saisie, plus naturel qu'un affichage instantané. */
  const botReply = useCallback(
    (text: string, after?: () => void, delay = 550) => {
      setIsTyping(true);
      schedule(() => {
        setIsTyping(false);
        pushBot(text);
        after?.();
      }, delay);
    },
    [pushBot, schedule],
  );

  const showAnswer = useCallback(
    (entry: AssistantEntry, options?: { skipUserEcho?: boolean }) => {
      setCurrentEntry(entry);
      setScreen('answer');
      setAwaitingFeedback(false);
      setSearchResults([]);
      setSearchQuery('');
      if (!options?.skipUserEcho) pushUser(entry.question);
      botReply(entry.answer, () => setAwaitingFeedback(true));
    },
    [botReply, pushUser],
  );

  const toEntry = (item: FaqItem, category?: FaqCategory): AssistantEntry =>
    findAssistantEntryById(item.id, locale) ?? {
      id: item.id,
      question: item.question,
      answer: item.answer,
      categoryId: category?.id ?? 'general',
      categoryLabel: category?.label ?? '',
      keywords: [],
    };

  const handleSelectCategory = (category: FaqCategory) => {
    setSelectedCategory(category);
    setScreen('questions');
    setSearchResults([]);
    pushUser(category.label);
    botReply(
      en
        ? `Here are the frequent questions for “${category.label.replace('I am a ', '')}”. Which one interests you?`
        : `Voici les questions fréquentes pour « ${category.label.replace('Je suis ', '')} ». Laquelle vous intéresse ?`,
      undefined,
      350,
    );
  };

  const goToCategories = (message?: string) => {
    setScreen('categories');
    setSelectedCategory(null);
    setCurrentEntry(null);
    setAwaitingFeedback(false);
    setSearchResults([]);
    setSearchQuery('');
    if (message) pushBot(message);
  };

  const runSearch = useCallback(
    (rawQuery: string) => {
      const query = rawQuery.trim();
      if (query.length < 2) return;

      pushUser(query);
      setSearchQuery('');
      setAwaitingFeedback(false);
      setSearchResults([]);

      const talk = smallTalk(query, en);
      if (talk) {
        setScreen('categories');
        botReply(talk, undefined, 350);
        return;
      }

      const results = searchAssistantKnowledge(query, 4, locale, audience);

      if (results.length === 0) {
        setScreen('contact');
        botReply(formatAssistantFallback(locale));
        return;
      }

      const best = results[0];
      if (best.score >= HIGH_CONFIDENCE_SCORE) {
        showAnswer(best.entry, { skipUserEcho: true });
        return;
      }

      setScreen('search');
      botReply(
        results.length === 1
          ? en
            ? 'I found one possible answer. Tap it to open it:'
            : "J'ai trouvé une réponse possible. Touchez-la pour l'afficher :"
          : en
            ? `I found ${results.length} possible answers. Which one matches your question?`
            : `J'ai trouvé ${results.length} réponses possibles. Laquelle correspond à votre question ?`,
        () => setSearchResults(results.map((r) => r.entry)),
        450,
      );
    },
    [audience, botReply, en, locale, pushUser, showAnswer],
  );

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    runSearch(searchQuery);
  };

  const handleFeedback = (helpful: boolean) => {
    setAwaitingFeedback(false);
    pushUser(helpful ? (en ? '👍 Yes, thanks' : '👍 Oui, merci') : en ? '👎 Not really' : '👎 Pas vraiment');
    if (helpful) {
      botReply(
        en
          ? 'Glad I could help! You can ask another question anytime.'
          : "Ravi d'avoir pu vous aider ! Vous pouvez poser une autre question à tout moment.",
        undefined,
        350,
      );
    } else {
      setScreen('contact');
      botReply(
        en
          ? 'Sorry about that. Try rephrasing your question, or contact our team directly:'
          : 'Désolé. Essayez de reformuler votre question, ou contactez directement notre équipe :',
        undefined,
        400,
      );
    }
  };

  const resetConversation = () => {
    clearTimers();
    setIsTyping(false);
    setMessages([{ type: 'bot', text: greeting }]);
    goToCategories();
  };

  const quickSuggestions = getQuickSuggestions(locale, logicalPath);
  const relatedEntries = currentEntry ? getRelatedEntries(currentEntry, locale, 3) : [];

  const botLinkClass = 'underline underline-offset-2 font-medium text-gray-900 hover:text-gray-600';
  const userLinkClass = 'underline underline-offset-2 font-medium text-white hover:text-gray-200';

  const contactButtons = (
    <div className="grid gap-2">
      <a
        href={WHATSAPP_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="focus-ring flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#1ebe5d]"
      >
        <WhatsAppIcon />
        WhatsApp · +216 28 528 477
      </a>
      <a
        href={`mailto:${SUPPORT_EMAIL}`}
        className="focus-ring flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-sm font-medium text-gray-800 transition-colors hover:bg-gray-50"
      >
        <Mail size={16} aria-hidden="true" />
        {SUPPORT_EMAIL}
      </a>
    </div>
  );

  return (
    <>
      <div
        className="fixed right-4 sm:right-6 z-50 flex flex-col items-end gap-3"
        style={{ bottom: CHAT_FLOAT_BOTTOM }}
      >
        {!isOpen && showTeaser && (
          <div className="relative max-w-[220px] animate-slide-up rounded-2xl border border-gray-200 bg-white py-2.5 pl-4 pr-9 text-sm text-gray-800 shadow-lg">
            <button
              type="button"
              onClick={() => setShowTeaser(false)}
              className="focus-ring absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              aria-label={en ? 'Dismiss' : 'Masquer'}
            >
              <X size={14} />
            </button>
            <button type="button" onClick={handleOpen} className="text-left">
              {en ? 'Need help? Ask me about fares, airport or parcels.' : 'Besoin d’aide ? Interrogez-moi sur les tarifs, l’aéroport ou les colis.'}
            </button>
          </div>
        )}
        <button
          ref={launcherRef}
          onClick={isOpen ? handleClose : handleOpen}
          className="focus-ring relative flex h-14 w-14 items-center justify-center rounded-full bg-black text-white shadow-xl transition-all duration-200 hover:scale-105 hover:bg-gray-800"
          aria-label={isOpen ? (en ? 'Close chat' : 'Fermer le chat') : en ? 'Open help chat' : "Ouvrir le chat d'aide"}
          aria-expanded={isOpen}
        >
          {isOpen ? <X size={22} /> : <MessageCircle size={22} />}
          {!isOpen && hasUnread && (
            <span className="absolute -right-0.5 -top-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-danger-500" />
          )}
        </button>
      </div>

      {isOpen && (
        <div
          role="dialog"
          aria-label={en ? 'TuniDrive assistant' : 'Assistant TuniDrive'}
          className="fixed left-3 right-3 sm:left-auto sm:right-6 z-50 flex animate-slide-up flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-overlay sm:w-[400px] h-[min(620px,calc(100dvh-7rem))]"
          style={{ bottom: CHAT_PANEL_BOTTOM }}
        >
          <div className="flex flex-shrink-0 items-center gap-3 bg-black px-4 py-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-white">
              <MessageCircle size={20} className="text-black" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-semibold leading-tight text-white">
                {en ? 'TuniDrive assistant' : 'Assistant TuniDrive'}
              </p>
              <p className="flex items-center gap-1.5 text-xs text-gray-400">
                <span className="h-1.5 w-1.5 rounded-full bg-success-500" aria-hidden="true" />
                {en ? 'Instant answers' : 'Réponses instantanées'}
              </p>
            </div>
            {showWhatsApp && (
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="focus-ring flex h-10 w-10 items-center justify-center rounded-full text-[#25D366] transition-colors hover:bg-white/10"
                aria-label={en ? 'Contact us on WhatsApp' : 'Contactez-nous sur WhatsApp'}
                title="WhatsApp"
              >
                <WhatsAppIcon size={20} />
              </a>
            )}
            <button
              type="button"
              onClick={resetConversation}
              className="focus-ring flex h-10 w-10 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
              aria-label={en ? 'Start a new conversation' : 'Nouvelle conversation'}
              title={en ? 'New conversation' : 'Nouvelle conversation'}
            >
              <RotateCcw size={17} />
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="focus-ring flex h-10 w-10 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
              aria-label={en ? 'Close' : 'Fermer'}
            >
              <X size={19} />
            </button>
          </div>

          {/* Conversation + choix proposés dans un seul défilement : toute la hauteur sert à lire */}
          <div className="flex-1 overflow-y-auto bg-gray-50 px-4 py-4">
            <div role="log" aria-live="polite" className="space-y-3">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  ref={idx === messages.length - 1 ? lastBotRef : undefined}
                  className={cn('flex scroll-mt-3', msg.type === 'user' ? 'justify-end' : 'justify-start')}
                >
                  {msg.type === 'bot' && (
                    <div className="mr-2 mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-black">
                      <MessageCircle size={13} className="text-white" />
                    </div>
                  )}
                  <div
                    className={cn(
                      'max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
                      msg.type === 'user'
                        ? 'rounded-br-sm bg-black text-white'
                        : 'rounded-bl-sm border border-gray-100 bg-white text-gray-800 shadow-sm',
                    )}
                  >
                    {renderRichText(msg.text, msg.type === 'user' ? userLinkClass : botLinkClass)}
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="flex justify-start" role="status" aria-label={en ? 'The assistant is typing' : "L'assistant écrit"}>
                  <div className="mr-2 mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-black">
                    <MessageCircle size={13} className="text-white" />
                  </div>
                  <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm border border-gray-100 bg-white px-4 py-3.5 shadow-sm">
                    {[0, 150, 300].map((delay) => (
                      <span
                        key={delay}
                        className="h-1.5 w-1.5 animate-pulse rounded-full bg-gray-400 motion-reduce:animate-none"
                        style={{ animationDelay: `${delay}ms` }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {!isTyping && (
              <div className="mt-4 space-y-2">
                {screen === 'categories' && (
                  <>
                    <p className="px-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      {en ? 'Suggested for you' : 'Suggestions pour vous'}
                    </p>
                    {quickSuggestions.map((entry) => (
                      <button key={entry.id} type="button" onClick={() => showAnswer(entry)} className={chipClass}>
                        <span className="line-clamp-2">{entry.question}</span>
                        <ChevronRight size={14} className="flex-shrink-0 text-gray-400 group-hover:text-gray-600" />
                      </button>
                    ))}
                    <p className="px-1 pt-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      {en ? 'Browse by topic' : 'Parcourir par sujet'}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {categories.map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => handleSelectCategory(cat)}
                          className="focus-ring flex flex-col items-start gap-1 rounded-xl border border-gray-200 bg-white p-3 text-left transition-colors hover:border-gray-300 hover:bg-gray-50"
                        >
                          <span className="text-xl" aria-hidden="true">{cat.emoji}</span>
                          <span className="text-sm font-medium leading-snug text-gray-800">{cat.label}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}

                {screen === 'questions' && selectedCategory && (
                  <>
                    <button
                      type="button"
                      onClick={() => goToCategories()}
                      className="focus-ring flex min-h-[36px] items-center gap-1 rounded-lg px-1 text-xs font-medium text-gray-600 hover:text-gray-900"
                    >
                      <ChevronLeft size={14} />
                      {en ? 'All topics' : 'Tous les sujets'}
                    </button>
                    {selectedCategory.items.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => showAnswer(toEntry(item, selectedCategory))}
                        className={chipClass}
                      >
                        <span className="line-clamp-2">{item.question}</span>
                        <ChevronRight size={14} className="flex-shrink-0 text-gray-400 group-hover:text-gray-600" />
                      </button>
                    ))}
                  </>
                )}

                {screen === 'search' && (
                  <>
                    {searchResults.map((entry) => (
                      <button key={entry.id} type="button" onClick={() => showAnswer(entry)} className={chipClass}>
                        <span className="line-clamp-2">{entry.question}</span>
                        <ChevronRight size={14} className="flex-shrink-0 text-gray-400 group-hover:text-gray-600" />
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => goToCategories()}
                      className="focus-ring w-full rounded-lg py-2 text-center text-xs font-medium text-gray-600 hover:text-gray-900"
                    >
                      {en ? 'Browse topics instead' : 'Parcourir les sujets'}
                    </button>
                  </>
                )}

                {screen === 'answer' && (
                  <>
                    {awaitingFeedback && (
                      <div className="rounded-xl border border-gray-200 bg-white p-3">
                        <p className="mb-2 text-sm font-medium text-gray-800">
                          {en ? 'Did this answer your question?' : 'Cette réponse vous a-t-elle aidé ?'}
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => handleFeedback(true)}
                            className="focus-ring flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-800 transition-colors hover:bg-success-50 hover:border-success-300"
                          >
                            <ThumbsUp size={16} aria-hidden="true" />
                            {en ? 'Yes' : 'Oui'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleFeedback(false)}
                            className="focus-ring flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-800 transition-colors hover:bg-danger-50 hover:border-danger-300"
                          >
                            <ThumbsDown size={16} aria-hidden="true" />
                            {en ? 'No' : 'Non'}
                          </button>
                        </div>
                      </div>
                    )}
                    {relatedEntries.length > 0 && (
                      <>
                        <p className="px-1 pt-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                          {en ? 'Related questions' : 'Questions liées'}
                        </p>
                        {relatedEntries.map((entry) => (
                          <button key={entry.id} type="button" onClick={() => showAnswer(entry)} className={chipClass}>
                            <span className="line-clamp-2">{entry.question}</span>
                            <ChevronRight size={14} className="flex-shrink-0 text-gray-400 group-hover:text-gray-600" />
                          </button>
                        ))}
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => goToCategories()}
                      className="focus-ring w-full rounded-lg py-2 text-center text-xs font-medium text-gray-600 hover:text-gray-900"
                    >
                      {en ? 'Back to topics' : 'Retour aux sujets'}
                    </button>
                  </>
                )}

                {screen === 'contact' && (
                  <>
                    {contactButtons}
                    <button
                      type="button"
                      onClick={() => goToCategories()}
                      className="focus-ring w-full rounded-lg py-2 text-center text-xs font-medium text-gray-600 hover:text-gray-900"
                    >
                      {en ? 'Browse topics' : 'Parcourir les sujets'}
                    </button>
                  </>
                )}
              </div>
            )}

            <div ref={scrollEndRef} />
          </div>

          <form
            onSubmit={handleSearchSubmit}
            className="flex flex-shrink-0 gap-2 border-t border-gray-100 bg-white px-3 py-3"
          >
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              maxLength={200}
              autoComplete="off"
              enterKeyHint="send"
              placeholder={en ? 'Type your question…' : 'Écrivez votre question…'}
              className="h-11 min-w-0 flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 text-base focus:border-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-gray-900/10 sm:text-sm"
              aria-label={en ? 'Ask your question' : 'Posez votre question'}
            />
            <button
              type="submit"
              disabled={searchQuery.trim().length < 2}
              className="focus-ring flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-black text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label={en ? 'Send question' : 'Envoyer la question'}
            >
              <Send size={17} />
            </button>
          </form>
        </div>
      )}
    </>
  );
};

function WhatsAppIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
      <path d="M20.5 3.5A11 11 0 0 0 2.1 17.2L1 23l5.9-1.1A11 11 0 0 0 20.5 3.5zm-8.5 17a9.1 9.1 0 0 1-4.6-1.3l-.3-.2-3.5.7.7-3.4-.2-.3A9.1 9.1 0 1 1 12 20.5zm5-6.8c-.3-.1-1.6-.8-1.8-.9s-.4-.1-.6.1-.7.9-.8 1-.3.2-.6.1a7.4 7.4 0 0 1-2.2-1.4 8.2 8.2 0 0 1-1.5-1.9c-.2-.3 0-.4.1-.6l.4-.5.2-.3a.5.5 0 0 0 0-.5c0-.1-.6-1.4-.8-1.9s-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.9 11.9 0 0 0 4.5 4 15 15 0 0 0 1.5.6 3.6 3.6 0 0 0 1.7.1 2.7 2.7 0 0 0 1.8-1.2 2.2 2.2 0 0 0 .2-1.2c-.1-.1-.3-.2-.6-.3z" />
    </svg>
  );
}
