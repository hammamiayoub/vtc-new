import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, X, ChevronLeft, ChevronRight, Send, Search } from 'lucide-react';
import { faqCategories, FaqCategory, FaqItem } from '../data/faqData';
import { faqCategoriesEn } from '../data/faqData.en';
import { useLocale } from '../i18n/locale';
import {
  searchAssistantKnowledge,
  getQuickSuggestions,
  formatAssistantFallback,
  type AssistantEntry,
} from '../utils/assistantSearch';

type Screen = 'categories' | 'questions' | 'answer' | 'search';

interface ChatMessage {
  type: 'bot' | 'user';
  text: string;
}

const HIGH_CONFIDENCE_SCORE = 55;

/** Au-dessus des bannières cookies + téléchargement app (variables CSS sur :root) */
const CHAT_FLOAT_BOTTOM =
  'calc(max(1rem, var(--td-bottom-banner-offset, 0px)) + var(--td-app-download-offset, 0px) + 1.5rem)';
const CHAT_PANEL_BOTTOM =
  'calc(max(1rem, var(--td-bottom-banner-offset, 0px)) + var(--td-app-download-offset, 0px) + 4.5rem)';

export const ChatWidget: React.FC = () => {
  const { locale } = useLocale();
  const en = locale === 'en';
  const categories = en ? faqCategoriesEn : faqCategories;
  const [isOpen, setIsOpen] = useState(false);
  const [screen, setScreen] = useState<Screen>('categories');
  const [selectedCategory, setSelectedCategory] = useState<FaqCategory | null>(null);
  const [selectedItem, setSelectedItem] = useState<FaqItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<AssistantEntry[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      type: 'bot',
      text:
        en
          ? 'Hello, I am the TuniDrive assistant.\n\nAsk a question below (fares, airport, parcels, driver…) or choose a category.'
          : 'Bonjour ! Je suis l\'assistant TuniDrive.\n\nPosez votre question ci-dessous (tarifs, aéroport, colis, chauffeur…) ou choisissez une catégorie.',
    },
  ]);
  const [hasUnread, setHasUnread] = useState(true);

  useEffect(() => {
    setMessages([
      {
        type: 'bot',
        text: en
          ? 'Hello, I am the TuniDrive assistant.\n\nAsk a question below (fares, airport, parcels, driver…) or choose a category.'
          : 'Bonjour ! Je suis l\'assistant TuniDrive.\n\nPosez votre question ci-dessous (tarifs, aéroport, colis, chauffeur…) ou choisissez une catégorie.',
      },
    ]);
    setScreen('categories');
    setSelectedCategory(null);
    setSearchResults([]);
  }, [en]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setHasUnread(false);
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [isOpen, messages, searchResults]);

  const pushBotMessage = useCallback((text: string) => {
    setMessages((prev) => [...prev, { type: 'bot', text }]);
  }, []);

  const pushUserMessage = useCallback((text: string) => {
    setMessages((prev) => [...prev, { type: 'user', text }]);
  }, []);

  const showAnswer = useCallback(
    (item: FaqItem, options?: { skipUserEcho?: boolean }) => {
      setSelectedItem(item);
      setScreen('answer');
      if (!options?.skipUserEcho) {
        pushUserMessage(item.question);
      }
      setTimeout(() => {
        pushBotMessage(item.answer);
        setTimeout(() => {
          pushBotMessage(
            en
              ? 'Does that answer your question? You can ask another one or go back to the categories.'
              : 'Est-ce que cela répond à votre question ? Vous pouvez poser une autre question ou revenir aux catégories.',
          );
        }, 400);
      }, 300);
    },
    [en, pushBotMessage, pushUserMessage],
  );

  const handleOpen = () => {
    setIsOpen(true);
    setHasUnread(false);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleSelectCategory = (category: FaqCategory) => {
    setSelectedCategory(category);
    setScreen('questions');
    setSearchResults([]);
    pushUserMessage(category.label);
    pushBotMessage(
      en
        ? `Here are the frequent questions for “${category.label.replace('I am a ', '')}”. Which one interests you?`
        : `Voici les questions fréquentes pour « ${category.label.replace('Je suis ', '')} ». Laquelle vous intéresse ?`,
    );
  };

  const handleSelectQuestion = (item: FaqItem) => {
    setSearchResults([]);
    showAnswer(item);
  };

  const handleSelectEntry = (entry: AssistantEntry) => {
    setSearchResults([]);
    setSearchQuery('');
    showAnswer({ id: entry.id, question: entry.question, answer: entry.answer });
  };

  const runSearch = useCallback(
    (rawQuery: string) => {
      const query = rawQuery.trim();
      if (query.length < 2) return;

      setScreen('search');
      setSearchResults([]);
      pushUserMessage(query);

      const results = searchAssistantKnowledge(query, 4, locale);

      if (results.length === 0) {
        pushBotMessage(formatAssistantFallback(locale));
        return;
      }

      const best = results[0];
      if (best.score >= HIGH_CONFIDENCE_SCORE) {
        setSearchQuery('');
        showAnswer(
          {
            id: best.entry.id,
            question: best.entry.question,
            answer: best.entry.answer,
          },
          { skipUserEcho: true },
        );
        return;
      }

      setSearchResults(results.map((r) => r.entry));
      pushBotMessage(
        results.length === 1
          ? (en ? 'I found one possible answer. Click it to open it:' : 'J\'ai trouvé une réponse possible. Cliquez dessus pour l\'afficher :')
          : (en
            ? `I found ${results.length} possible answers. Which one matches your question?`
            : `J\'ai trouvé ${results.length} réponses possibles. Laquelle correspond à votre question ?`),
      );
    },
    [en, locale, pushBotMessage, pushUserMessage, showAnswer],
  );

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    runSearch(searchQuery);
  };

  const handleBackToCategories = () => {
    setScreen('categories');
    setSelectedCategory(null);
    setSelectedItem(null);
    setSearchResults([]);
    setSearchQuery('');
    pushBotMessage(en ? 'Choose a category or ask a new question.' : 'Choisissez une catégorie ou posez une nouvelle question.');
  };

  const handleBackToQuestions = () => {
    setSelectedItem(null);
    setSearchResults([]);
    if (!selectedCategory) {
      handleBackToCategories();
      return;
    }
    setScreen('questions');
    pushBotMessage(en ? 'Here are the other available questions. Which one interests you?' : 'Voici les autres questions disponibles. Laquelle vous intéresse ?');
  };

  const formatAnswer = (text: string) => {
    return text.split('\n').map((line, i, arr) => (
      <span key={i}>
        {line}
        {i < arr.length - 1 && <br />}
      </span>
    ));
  };

  const quickSuggestions = getQuickSuggestions(locale);

  return (
    <>
      <div
        className="fixed right-4 sm:right-6 z-50 flex flex-col items-end gap-3"
        style={{ bottom: CHAT_FLOAT_BOTTOM }}
      >
        {!isOpen && hasUnread && (
          <div className="bg-white border border-gray-200 rounded-2xl px-4 py-2 shadow-lg text-sm text-gray-700 max-w-[200px] text-right animate-bounce">
            {en ? 'Need help?' : "Besoin d'aide ?"} 💬
          </div>
        )}
        <button
          onClick={isOpen ? handleClose : handleOpen}
          className="relative w-14 h-14 bg-black text-white rounded-full shadow-xl flex items-center justify-center hover:bg-gray-800 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-700"
          aria-label={isOpen ? (en ? 'Close chat' : 'Fermer le chat') : (en ? 'Open chat' : 'Ouvrir le chat')}
        >
          {isOpen ? <X size={22} /> : <MessageCircle size={22} />}
          {!isOpen && hasUnread && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white" />
          )}
        </button>
      </div>

      {isOpen && (
        <div
          className="fixed left-4 right-4 sm:left-auto sm:right-6 z-50 sm:w-[380px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden h-[min(520px,calc(100dvh-8rem))] max-h-[min(520px,calc(100dvh-8rem))]"
          style={{ bottom: CHAT_PANEL_BOTTOM }}
        >
          <div className="bg-black px-4 py-3 flex items-center gap-3 flex-shrink-0">
            <div className="w-9 h-9 bg-white rounded-full flex items-center justify-center flex-shrink-0">
              <MessageCircle size={18} className="text-black" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-sm leading-tight">{en ? 'TuniDrive assistant' : 'Assistant TuniDrive'}</p>
              <p className="text-gray-400 text-xs">{en ? 'Smart FAQ · verified answers' : 'FAQ intelligente · réponses vérifiées'}</p>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-white transition-colors p-1"
              aria-label={en ? 'Close' : 'Fermer'}
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-gray-50">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.type === 'bot' && (
                  <div className="w-7 h-7 bg-black rounded-full flex items-center justify-center flex-shrink-0 mr-2 mt-0.5">
                    <MessageCircle size={13} className="text-white" />
                  </div>
                )}
                <div
                  className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                    msg.type === 'user'
                      ? 'bg-black text-white rounded-br-sm'
                      : 'bg-white text-gray-800 shadow-sm border border-gray-100 rounded-bl-sm'
                  }`}
                >
                  {formatAnswer(msg.text)}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <form
            onSubmit={handleSearchSubmit}
            className="border-t border-gray-100 bg-white px-3 py-2 flex-shrink-0 flex gap-2"
          >
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={en ? 'e.g. Tunis airport fare, parcel quote…' : 'Ex : tarif aéroport Tunis, devis colis…'}
                className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400"
                aria-label={en ? 'Ask your question' : 'Posez votre question'}
              />
            </div>
            <button
              type="submit"
              disabled={searchQuery.trim().length < 2}
              className="flex-shrink-0 w-10 h-10 rounded-xl bg-black text-white flex items-center justify-center hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label={en ? 'Send question' : 'Envoyer la question'}
            >
              <Send size={16} />
            </button>
          </form>

          <div className="border-t border-gray-100 bg-white flex-shrink-0 max-h-[42%] overflow-y-auto">
            {screen === 'search' && searchResults.length > 0 && (
              <div className="p-3 space-y-1.5">
                {searchResults.map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => handleSelectEntry(entry)}
                    className="w-full text-left px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 hover:border-gray-300 transition-all text-sm text-gray-800 flex items-center justify-between gap-2 group"
                  >
                    <span className="line-clamp-2">{entry.question}</span>
                    <ChevronRight size={14} className="text-gray-400 flex-shrink-0 group-hover:text-gray-600" />
                  </button>
                ))}
                <button
                  type="button"
                  onClick={handleBackToCategories}
                  className="w-full text-center text-xs text-gray-500 hover:text-gray-800 py-2"
                >
                  {en ? 'See all categories' : 'Voir toutes les catégories'}
                </button>
              </div>
            )}

            {screen === 'categories' && (
              <div className="p-3 space-y-2">
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide px-1">
                  {en ? 'Frequent questions' : 'Questions fréquentes'}
                </p>
                <div className="flex flex-wrap gap-1.5 px-1 pb-1">
                  {quickSuggestions.map((entry) => (
                    <button
                      key={entry.id}
                      type="button"
                      onClick={() => handleSelectEntry(entry)}
                      className="text-xs px-2.5 py-1.5 rounded-full border border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      {entry.question.length > 42 ? `${entry.question.slice(0, 40)}…` : entry.question}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide px-1 pt-1">
                  {en ? 'Categories' : 'Catégories'}
                </p>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleSelectCategory(cat)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 hover:border-gray-300 transition-all duration-150 text-left group"
                  >
                    <span className="text-lg">{cat.emoji}</span>
                    <span className="flex-1 text-sm font-medium text-gray-800">{cat.label}</span>
                    <ChevronRight size={15} className="text-gray-400 group-hover:text-gray-600 transition-colors" />
                  </button>
                ))}
              </div>
            )}

            {screen === 'questions' && selectedCategory && (
              <div className="p-3">
                <div className="flex items-center gap-2 mb-2">
                  <button
                    type="button"
                    onClick={handleBackToCategories}
                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 transition-colors"
                  >
                    <ChevronLeft size={14} />
                    {en ? 'Back' : 'Retour'}
                  </button>
                  <span className="text-xs text-gray-400">|</span>
                  <span className="text-xs text-gray-500 font-medium">
                    {selectedCategory.emoji} {selectedCategory.label}
                  </span>
                </div>
                <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                  {selectedCategory.items.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelectQuestion(item)}
                      className="w-full text-left px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 hover:border-gray-300 transition-all duration-150 text-sm text-gray-800 flex items-center justify-between gap-2 group"
                    >
                      <span className="line-clamp-2">{item.question}</span>
                      <ChevronRight size={14} className="text-gray-400 flex-shrink-0 group-hover:text-gray-600 transition-colors" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {screen === 'answer' && (
              <div className="p-3 flex gap-2">
                <button
                  type="button"
                  onClick={handleBackToQuestions}
                  disabled={!selectedCategory}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-40"
                >
                  <ChevronLeft size={14} />
                  {en ? 'Another question' : 'Autre question'}
                </button>
                <button
                  type="button"
                  onClick={handleBackToCategories}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-black text-white text-sm hover:bg-gray-800 transition-colors"
                >
                  {en ? 'Categories' : 'Catégories'}
                </button>
              </div>
            )}

            {screen === 'search' && searchResults.length === 0 && (
              <div className="p-3">
                <button
                  type="button"
                  onClick={handleBackToCategories}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  {en ? 'Browse categories' : 'Parcourir les catégories'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
