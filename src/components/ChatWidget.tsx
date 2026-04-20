import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { faqCategories, FaqCategory, FaqItem } from '../data/faqData';

type Screen = 'categories' | 'questions' | 'answer';

interface ChatMessage {
  type: 'bot' | 'user';
  text: string;
}

export const ChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [screen, setScreen] = useState<Screen>('categories');
  const [selectedCategory, setSelectedCategory] = useState<FaqCategory | null>(null);
  const [selectedItem, setSelectedItem] = useState<FaqItem | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { type: 'bot', text: 'Bonjour ! Je suis l\'assistant TuniDrive 👋\nChoisissez une catégorie pour que je puisse vous aider.' },
  ]);
  const [hasUnread, setHasUnread] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setHasUnread(false);
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [isOpen, messages]);

  const pushBotMessage = (text: string) => {
    setMessages((prev) => [...prev, { type: 'bot', text }]);
  };

  const pushUserMessage = (text: string) => {
    setMessages((prev) => [...prev, { type: 'user', text }]);
  };

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
    pushUserMessage(category.label);
    pushBotMessage(`Voici les questions fréquentes pour « ${category.label.replace('Je suis ', '')} ». Laquelle vous intéresse ?`);
  };

  const handleSelectQuestion = (item: FaqItem) => {
    setSelectedItem(item);
    setScreen('answer');
    pushUserMessage(item.question);
    setTimeout(() => {
      pushBotMessage(item.answer);
      setTimeout(() => {
        pushBotMessage('Est-ce que cela répond à votre question ? Vous pouvez poser une autre question ou revenir aux catégories.');
      }, 400);
    }, 300);
  };

  const handleBackToCategories = () => {
    setScreen('categories');
    setSelectedCategory(null);
    setSelectedItem(null);
    pushBotMessage('D\'accord ! Choisissez une autre catégorie si vous avez d\'autres questions.');
  };

  const handleBackToQuestions = () => {
    setScreen('questions');
    setSelectedItem(null);
    pushBotMessage('Voici les autres questions disponibles. Laquelle vous intéresse ?');
  };

  const formatAnswer = (text: string) => {
    return text.split('\n').map((line, i) => (
      <span key={i}>
        {line}
        {i < text.split('\n').length - 1 && <br />}
      </span>
    ));
  };

  return (
    <>
      {/* Floating button */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        {/* Tooltip quand fermé */}
        {!isOpen && hasUnread && (
          <div className="bg-white border border-gray-200 rounded-2xl px-4 py-2 shadow-lg text-sm text-gray-700 max-w-[200px] text-right animate-bounce">
            Besoin d&apos;aide ? 💬
          </div>
        )}
        <button
          onClick={isOpen ? handleClose : handleOpen}
          className="relative w-14 h-14 bg-black text-white rounded-full shadow-xl flex items-center justify-center hover:bg-gray-800 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-700"
          aria-label={isOpen ? 'Fermer le chat' : 'Ouvrir le chat'}
        >
          {isOpen ? <X size={22} /> : <MessageCircle size={22} />}
          {!isOpen && hasUnread && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white" />
          )}
        </button>
      </div>

      {/* Chat panel */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-[340px] sm:w-[380px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden"
          style={{ maxHeight: '520px', height: '520px' }}
        >
          {/* Header */}
          <div className="bg-black px-4 py-3 flex items-center gap-3 flex-shrink-0">
            <div className="w-9 h-9 bg-white rounded-full flex items-center justify-center flex-shrink-0">
              <MessageCircle size={18} className="text-black" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-sm leading-tight">Assistant TuniDrive</p>
              <p className="text-gray-400 text-xs">Réponses instantanées</p>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-white transition-colors p-1"
              aria-label="Fermer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Messages */}
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

          {/* Action panel */}
          <div className="border-t border-gray-100 bg-white flex-shrink-0">
            {screen === 'categories' && (
              <div className="p-3 space-y-2">
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide px-1 mb-1">
                  Choisissez une catégorie
                </p>
                {faqCategories.map((cat) => (
                  <button
                    key={cat.id}
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
                    onClick={handleBackToCategories}
                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 transition-colors"
                  >
                    <ChevronLeft size={14} />
                    Retour
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
                  onClick={handleBackToQuestions}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <ChevronLeft size={14} />
                  Autre question
                </button>
                <button
                  onClick={handleBackToCategories}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-black text-white text-sm hover:bg-gray-800 transition-colors"
                >
                  Catégories
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
