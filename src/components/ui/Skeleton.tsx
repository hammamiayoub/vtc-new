import React from 'react';
import { cn } from '../../utils/cn';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Rend le bloc rond (avatars). */
  circle?: boolean;
}

/** Bloc de chargement animé. Donner la taille via className (ex. "h-4 w-32"). */
export const Skeleton: React.FC<SkeletonProps> = ({ circle, className, ...props }) => (
  <div
    aria-hidden="true"
    className={cn(
      'relative overflow-hidden bg-gray-200',
      'after:absolute after:inset-0 after:-translate-x-full after:animate-shimmer',
      'after:bg-gradient-to-r after:from-transparent after:via-white/60 after:to-transparent',
      circle ? 'rounded-full' : 'rounded-lg',
      className
    )}
    {...props}
  />
);

/** Squelette de carte (liste de courses, de chauffeurs...). */
export const SkeletonCard: React.FC<{ className?: string }> = ({ className }) => (
  <div
    role="status"
    aria-label="Chargement"
    className={cn('rounded-card border border-surface-border bg-white p-6 space-y-4', className)}
  >
    <div className="flex items-center gap-4">
      <Skeleton circle className="h-12 w-12" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    </div>
    <Skeleton className="h-3 w-full" />
    <Skeleton className="h-3 w-4/5" />
  </div>
);

/** Liste de cartes de chargement (demandes, courses, devis...). */
export const SkeletonList: React.FC<{ count?: number; className?: string }> = ({ count = 3, className }) => (
  <div className={cn('space-y-4', className)}>
    {Array.from({ length: count }, (_, i) => (
      <SkeletonCard key={i} />
    ))}
  </div>
);

/** Squelette pleine page de tableau de bord (en-tête, indicateurs, liste). */
export const DashboardSkeleton: React.FC = () => (
  <div role="status" aria-label="Chargement" className="min-h-screen bg-gray-50">
    <div className="h-16 border-b border-surface-border bg-white">
      <div className="page-container flex h-full items-center justify-between">
        <Skeleton className="h-6 w-32" />
        <Skeleton circle className="h-9 w-9" />
      </div>
    </div>
    <div className="page-container space-y-6 py-8">
      <Skeleton className="h-8 w-56" />
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="space-y-3 rounded-card border border-surface-border bg-white p-6">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-8 w-20" />
          </div>
        ))}
      </div>
      <SkeletonList count={3} />
    </div>
  </div>
);

/** Ligne de chargement d'une liste déjà encadrée (courses, historique), sans bordure propre. */
export const SkeletonRow: React.FC<{ className?: string }> = ({ className }) => (
  <div role="status" aria-label="Chargement" className={cn('space-y-3 p-6', className)}>
    <Skeleton className="h-4 w-2/5" />
    <Skeleton className="h-3 w-4/5" />
    <Skeleton className="h-3 w-3/5" />
    <div className="flex items-center justify-between pt-1">
      <Skeleton className="h-6 w-24 rounded-full" />
      <Skeleton className="h-6 w-20" />
    </div>
  </div>
);
