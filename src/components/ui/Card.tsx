import React from 'react';
import { cn } from '../../utils/cn';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Ajoute l'ombre et le retour visuel au survol (cartes cliquables). */
  interactive?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, interactive, padding = 'md', ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'bg-white rounded-card border border-surface-border',
        interactive &&
          'cursor-pointer transition-all duration-200 hover:shadow-card hover:-translate-y-0.5',
        {
          'p-0': padding === 'none',
          'p-4': padding === 'sm',
          'p-6': padding === 'md',
          'p-8': padding === 'lg',
        },
        className
      )}
      {...props}
    />
  )
);

Card.displayName = 'Card';
