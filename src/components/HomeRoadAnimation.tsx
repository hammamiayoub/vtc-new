import React from 'react';

/**
 * Fil de trajet décoratif : départ → destination, avec un trait lumineux qui glisse lentement.
 * Purement visuel ; statique si prefers-reduced-motion.
 */
export const HomeRoadAnimation: React.FC = () => (
  <div className="page-container py-2" aria-hidden="true">
    <div
      className="route-line"
      ref={(el) => {
        if (el) el.style.setProperty('--route-w', `${el.clientWidth}px`);
      }}
    >
      <span className="route-line__dot" />
      <span className="route-line__glide" />
      <span className="route-line__pin" />
    </div>
  </div>
);
