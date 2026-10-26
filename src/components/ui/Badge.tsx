import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../utils/cn';

export type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'brand';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  /** sm : listes denses (12 px). md : en-têtes de page (14 px). */
  size?: 'sm' | 'md';
  /** Icône Lucide affichée devant le texte. */
  icon?: LucideIcon;
  /** Affiche une pastille de couleur devant le texte (ignoré si `icon` est fourni). */
  dot?: boolean;
}

const TONES: Record<BadgeTone, { badge: string; dot: string }> = {
  neutral: { badge: 'bg-gray-100 text-gray-800', dot: 'bg-gray-500' },
  success: { badge: 'bg-success-100 text-success-800', dot: 'bg-success-600' },
  warning: { badge: 'bg-warning-100 text-warning-800', dot: 'bg-warning-600' },
  danger: { badge: 'bg-danger-100 text-danger-800', dot: 'bg-danger-600' },
  info: { badge: 'bg-info-100 text-info-800', dot: 'bg-info-600' },
  brand: { badge: 'bg-brand-muted text-brand', dot: 'bg-brand' },
};

export const Badge: React.FC<BadgeProps> = ({
  tone = 'neutral',
  size = 'sm',
  icon: Icon,
  dot,
  className,
  children,
  ...props
}) => (
  <span
    className={cn(
      'inline-flex items-center gap-1 rounded-full font-medium whitespace-nowrap',
      size === 'sm' ? 'px-3 py-1 text-xs' : 'px-3 py-1 text-sm',
      TONES[tone].badge,
      className
    )}
    {...props}
  >
    {Icon ? (
      <Icon size={size === 'sm' ? 12 : 16} aria-hidden="true" />
    ) : (
      dot && <span className={cn('h-1.5 w-1.5 rounded-full', TONES[tone].dot)} aria-hidden="true" />
    )}
    {children}
  </span>
);
