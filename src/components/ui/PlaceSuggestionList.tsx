import React from 'react';

export interface PlaceSuggestionItem {
  id: string;
  title: string;
  subtitle?: string;
}

interface PlaceSuggestionListProps {
  listId: string;
  items: PlaceSuggestionItem[];
  activeIndex: number;
  onHover: (index: number) => void;
  onSelect: (index: number) => void;
  showGoogleCredit?: boolean;
}

export const PlaceSuggestionList: React.FC<PlaceSuggestionListProps> = ({
  listId,
  items,
  activeIndex,
  onHover,
  onSelect,
  showGoogleCredit = false,
}) => {
  if (items.length === 0) return null;

  return (
    <ul
      id={listId}
      role="listbox"
      className="absolute z-[80] left-0 right-0 mt-1 max-h-60 overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg"
    >
      {items.map((item, index) => (
        <li key={item.id} role="presentation">
          <button
            type="button"
            role="option"
            aria-selected={index === activeIndex}
            onMouseDown={(event) => {
              event.preventDefault();
              onSelect(index);
            }}
            onMouseEnter={() => onHover(index)}
            className={`w-full px-3 py-2 text-left ${
              index === activeIndex ? 'bg-gray-100' : 'bg-white hover:bg-gray-50'
            }`}
          >
            <span className="block text-sm text-gray-900">{item.title}</span>
            {item.subtitle && <span className="block text-xs text-gray-500">{item.subtitle}</span>}
          </button>
        </li>
      ))}
      {showGoogleCredit && (
        <li className="px-3 py-1 text-right text-[10px] text-gray-400">Google</li>
      )}
    </ul>
  );
};
