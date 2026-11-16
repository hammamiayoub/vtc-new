import React, { useEffect, useRef, useState } from 'react';
import { MoreHorizontal, type LucideIcon } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface BottomNavItem {
  id: string;
  /** Libellé court : il tient sur une ligne sous l'icône. */
  label: string;
  icon: LucideIcon;
  /** Pastille rouge de notification. Masquée si 0. */
  alertCount?: number;
  /** Action principale de l'espace (ex. « Réserver ») : icône sur fond noir. */
  primary?: boolean;
  hidden?: boolean;
}

interface BottomNavProps {
  items: BottomNavItem[];
  activeId: string;
  onChange: (id: string) => void;
  ariaLabel: string;
  moreLabel: string;
}

/** Nombre maximal d'entrées affichées ; au-delà, les dernières passent dans le menu « Plus ». */
const MAX_VISIBLE = 5;
const OFFSET_VAR = '--td-bottom-nav-offset';

function AlertDot({ count }: { count?: number }) {
  if (!count || count <= 0) return null;
  return (
    <span className="absolute -right-2 -top-1 inline-flex min-w-[1.125rem] items-center justify-center rounded-full bg-danger-600 px-1 text-[11px] font-semibold leading-[1.125rem] text-white">
      {count}
    </span>
  );
}

/**
 * Navigation des tableaux de bord sur mobile : barre fixe en bas d'écran, à portée de pouce.
 * Masquée à partir de md, où la barre d'onglets du haut prend le relais. Sa hauteur est publiée
 * dans --td-bottom-nav-offset pour que les éléments flottants (chat, bannières) se placent au-dessus.
 */
export const BottomNav: React.FC<BottomNavProps> = ({ items, activeId, onChange, ariaLabel, moreLabel }) => {
  const navRef = useRef<HTMLElement>(null);
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const available = items.filter((item) => !item.hidden);
  const hasOverflow = available.length > MAX_VISIBLE;
  const visible = hasOverflow ? available.slice(0, MAX_VISIBLE - 1) : available;
  const overflow = hasOverflow ? available.slice(MAX_VISIBLE - 1) : [];
  const overflowActive = overflow.some((item) => item.id === activeId);
  const overflowAlerts = overflow.reduce((sum, item) => sum + (item.alertCount ?? 0), 0);

  useEffect(() => {
    const node = navRef.current;
    if (!node) return;
    const root = document.documentElement;

    const update = () => {
      // Hauteur nulle quand la barre est masquée (écran md et plus).
      const height = node.offsetHeight;
      if (height > 0) root.style.setProperty(OFFSET_VAR, `${height}px`);
      else root.style.removeProperty(OFFSET_VAR);
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => {
      observer.disconnect();
      root.style.removeProperty(OFFSET_VAR);
    };
  }, []);

  useEffect(() => {
    if (!isMoreOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      if (!navRef.current?.contains(e.target as Node)) setIsMoreOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMoreOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isMoreOpen]);

  const select = (id: string) => {
    setIsMoreOpen(false);
    onChange(id);
  };

  const itemClass = (active: boolean) =>
    cn(
      'focus-ring relative flex min-h-[56px] min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 pt-1.5 pb-1 text-[11px] leading-none transition-colors',
      active ? 'font-semibold text-gray-900' : 'font-medium text-gray-500 hover:text-gray-900',
    );

  return (
    <nav
      ref={navRef}
      aria-label={ariaLabel}
      className="fixed inset-x-0 bottom-0 z-30 border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {isMoreOpen && (
        <div
          role="menu"
          className="absolute bottom-full right-2 mb-2 w-60 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-overlay animate-fade-in"
        >
          {overflow.map(({ id, label, icon: Icon, alertCount }) => (
            <button
              key={id}
              type="button"
              role="menuitem"
              onClick={() => select(id)}
              aria-current={id === activeId ? 'page' : undefined}
              className={cn(
                'flex min-h-[48px] w-full items-center gap-3 px-4 text-left text-sm transition-colors hover:bg-gray-100',
                id === activeId ? 'font-semibold text-gray-900' : 'font-medium text-gray-700',
              )}
            >
              <Icon size={20} aria-hidden="true" />
              <span className="flex-1">{label}</span>
              {!!alertCount && alertCount > 0 && (
                <span className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-danger-600 px-1.5 py-0.5 text-xs font-semibold leading-none text-white">
                  {alertCount}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      <div className="mx-auto flex max-w-lg items-stretch">
        {visible.map(({ id, label, icon: Icon, alertCount, primary }) => {
          const active = id === activeId;
          return (
            <button
              key={id}
              type="button"
              onClick={() => select(id)}
              aria-current={active ? 'page' : undefined}
              className={itemClass(active)}
            >
              <span
                className={cn(
                  'relative flex items-center justify-center',
                  primary && 'h-8 w-12 rounded-full bg-black text-white',
                )}
              >
                <Icon size={primary ? 20 : 22} strokeWidth={active && !primary ? 2.25 : 1.75} aria-hidden="true" />
                <AlertDot count={alertCount} />
              </span>
              <span className="max-w-full truncate">{label}</span>
            </button>
          );
        })}

        {hasOverflow && (
          <button
            type="button"
            onClick={() => setIsMoreOpen((open) => !open)}
            aria-haspopup="menu"
            aria-expanded={isMoreOpen}
            className={itemClass(overflowActive || isMoreOpen)}
          >
            <span className="relative flex items-center justify-center">
              <MoreHorizontal size={22} strokeWidth={overflowActive ? 2.25 : 1.75} aria-hidden="true" />
              <AlertDot count={overflowAlerts} />
            </span>
            <span className="max-w-full truncate">{moreLabel}</span>
          </button>
        )}
      </div>
    </nav>
  );
};
