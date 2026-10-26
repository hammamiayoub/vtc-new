import React from 'react';
import { cn } from '../../utils/cn';

interface SectionProps extends Omit<React.HTMLAttributes<HTMLElement>, 'title'> {
  eyebrow?: React.ReactNode;
  title?: React.ReactNode;
  description?: React.ReactNode;
  tone?: 'default' | 'muted' | 'dark';
  align?: 'left' | 'center';
}

/** Section de page : rythme vertical, conteneur et en-tête (sur-titre, titre, description) cohérents. */
export const Section: React.FC<SectionProps> = ({
  eyebrow,
  title,
  description,
  tone = 'default',
  align = 'left',
  className,
  children,
  ...props
}) => (
  <section
    className={cn(
      'py-16 sm:py-20',
      {
        'bg-white text-gray-900': tone === 'default',
        'bg-surface-muted text-gray-900': tone === 'muted',
        'bg-black text-white': tone === 'dark',
      },
      className
    )}
    {...props}
  >
    <div className="page-container">
      {(eyebrow || title || description) && (
        <header className={cn('mb-10 max-w-2xl', align === 'center' && 'mx-auto text-center')}>
          {eyebrow && (
            <p
              className={cn(
                'mb-3 text-body-sm font-semibold uppercase tracking-wider',
                tone === 'dark' ? 'text-gray-400' : 'text-ink-subtle'
              )}
            >
              {eyebrow}
            </p>
          )}
          {title && <h2 className="text-display-md">{title}</h2>}
          {description && (
            <p className={cn('mt-4 text-body-lg', tone === 'dark' ? 'text-gray-300' : 'text-ink-muted')}>
              {description}
            </p>
          )}
        </header>
      )}
      {children}
    </div>
  </section>
);
