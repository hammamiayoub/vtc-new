import React, { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '../../utils/cn';

export interface TabItem {
  id: string;
  label: React.ReactNode;
  /** Pastille rouge de notification (ex. nouvelles demandes). Masquée si 0. */
  alertCount?: number;
  hidden?: boolean;
}

interface TabBarProps {
  tabs: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  ariaLabel?: string;
  className?: string;
}

/**
 * Barre d'onglets des tableaux de bord. Défile horizontalement sur mobile (fondus aux bords quand
 * du contenu est masqué), ramène l'onglet actif dans la vue et garde des zones tactiles de 48 px.
 */
export const TabBar: React.FC<TabBarProps> = ({ tabs, activeId, onChange, ariaLabel, className }) => {
  const scrollerRef = useRef<HTMLElement>(null);
  const [edges, setEdges] = useState({ left: false, right: false });

  const updateEdges = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    setEdges({
      left: el.scrollLeft > 4,
      right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4,
    });
  }, []);

  useEffect(() => {
    updateEdges();
    window.addEventListener('resize', updateEdges);
    return () => window.removeEventListener('resize', updateEdges);
  }, [updateEdges, tabs.length]);

  useEffect(() => {
    const el = scrollerRef.current;
    const active = el?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!el || !active) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // Défilement horizontal uniquement : scrollIntoView pourrait faire bouger la page verticalement.
    const target = active.offsetLeft - (el.clientWidth - active.offsetWidth) / 2;
    el.scrollTo({ left: Math.max(0, target), behavior: reduce ? 'auto' : 'smooth' });
  }, [activeId]);

  return (
    <div className={cn('relative bg-white border-b border-gray-200', className)}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav
          ref={scrollerRef}
          aria-label={ariaLabel}
          onScroll={updateEdges}
          className="flex gap-1 sm:gap-8 overflow-x-auto scrollbar-hide"
        >
          {tabs
            .filter((tab) => !tab.hidden)
            .map((tab) => {
              const active = tab.id === activeId;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onChange(tab.id)}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'focus-ring shrink-0 inline-flex items-center gap-2 min-h-[48px] py-4 px-3 sm:px-1 border-b-2',
                    'text-sm sm:text-base font-medium whitespace-nowrap transition-colors',
                    active
                      ? 'border-black text-black'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  )}
                >
                  {tab.label}
                  {!!tab.alertCount && tab.alertCount > 0 && (
                    <span className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-danger-600 px-1.5 py-0.5 text-xs font-bold leading-none text-white">
                      {tab.alertCount}
                    </span>
                  )}
                </button>
              );
            })}
        </nav>
      </div>

      <div
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-white to-transparent transition-opacity sm:hidden',
          edges.left ? 'opacity-100' : 'opacity-0'
        )}
      />
      <div
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-white to-transparent transition-opacity sm:hidden',
          edges.right ? 'opacity-100' : 'opacity-0'
        )}
      />
    </div>
  );
};
