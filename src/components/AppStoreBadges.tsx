import React from 'react';

interface AppStoreBadgesProps {
  className?: string;
  imageClassName?: string;
  /** Empile verticalement (recommandé footer / bannière étroite) */
  layout?: 'row' | 'column';
}

const PLAY_URL = 'https://play.google.com/store/apps/details?id=com.tunidrive.mobile';
const APP_STORE_URL = 'https://apps.apple.com/fr/app/tunidrive/id6753982765';

/** Dimensions communes pour aligner Google Play et App Store */
const BADGE_WIDTH = 135;
const BADGE_HEIGHT = 40;
const BADGE_STROKE = 1;
const BADGE_INSET = BADGE_STROKE / 2;
const TEXT_X = 44;
const ICON_X = 10;
const ICON_SIZE = 24;

/** Contour inset pour éviter que le trait ne soit rogné en bas du SVG */
function BadgeFrame() {
  return (
    <rect
      x={BADGE_INSET}
      y={BADGE_INSET}
      width={BADGE_WIDTH - BADGE_STROKE}
      height={BADGE_HEIGHT - BADGE_STROKE}
      rx="5"
      fill="#000"
      stroke="#A6A6A6"
      strokeWidth={BADGE_STROKE}
    />
  );
}

const APPLE_LOGO_PATH =
  'M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.5 107.2 125.2 25-.8 42-17.1 75.8-17.1 33.2 0 41.9 17.1 75.2 16.6 30.7-.5 51.4-59.8 86.2-101.9-4.7-2.6-69.2-38.1-69.9-113.1zM256.9 87.5c31.1-37.5 27.2-71.5 26.3-83.7-28.6 1.6-61.9 19.2-82 42.5-18.9 21.2-32.6 49.3-30.1 78.3 31.5 2.4 63.7-16.9 85.8-37.1z';

function GooglePlayBadge({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${BADGE_WIDTH} ${BADGE_HEIGHT}`}
      role="img"
      aria-label="Disponible sur Google Play"
      className={className}
      overflow="visible"
    >
      <BadgeFrame />
      <g transform={`translate(${ICON_X - 0.5}, 9)`}>
        <path fill="#EA4335" d="M0 0.2 13.3 12 0 23.8z" />
        <path fill="#FBBC04" d="M0 0.2 13.3 12l6.2-3.6z" />
        <path fill="#34A853" d="M0 23.8 13.3 12l6.2 3.6z" />
        <path fill="#4285F4" d="M19.5 0.4 13.3 12 19.5 15.6l8.5-4.9z" />
      </g>
      <text
        x={TEXT_X}
        y="14"
        fill="#fff"
        fontFamily="system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
        fontSize="7"
      >
        DISPONIBLE SUR
      </text>
      <text
        x={TEXT_X}
        y="28"
        fill="#fff"
        fontFamily="system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
        fontSize="13"
        fontWeight="600"
      >
        Google Play
      </text>
    </svg>
  );
}

function AppStoreBadge({
  className,
  completeBottomBorder = false,
}: {
  className?: string;
  completeBottomBorder?: boolean;
}) {
  const appleWidth = ICON_SIZE * (384 / 512);
  const appleX = ICON_X + (ICON_SIZE - appleWidth) / 2;
  const appleY = (BADGE_HEIGHT - ICON_SIZE) / 2 + 1;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${BADGE_WIDTH} ${BADGE_HEIGHT}`}
      role="img"
      aria-label="Télécharger dans l'App Store"
      className={className}
      overflow="visible"
    >
      <BadgeFrame />
      {completeBottomBorder && (
        <line
          x1={5}
          y1={BADGE_HEIGHT - BADGE_INSET}
          x2={BADGE_WIDTH - 5}
          y2={BADGE_HEIGHT - BADGE_INSET}
          stroke="#A6A6A6"
          strokeWidth={BADGE_STROKE}
        />
      )}
      <g
        transform={`translate(${appleX}, ${appleY}) scale(${appleWidth / 384}, ${ICON_SIZE / 512})`}
        aria-hidden="true"
      >
        <path fill="#fff" d={APPLE_LOGO_PATH} />
      </g>
      <text
        x={TEXT_X}
        y="14"
        fill="#fff"
        fontFamily="system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
        fontSize="7"
      >
        {"Télécharger dans l'"}
      </text>
      <text
        x={TEXT_X}
        y="28"
        fill="#fff"
        fontFamily="system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
        fontSize="13"
        fontWeight="600"
      >
        App Store
      </text>
    </svg>
  );
}

export const AppStoreBadges: React.FC<AppStoreBadgesProps> = ({
  className = '',
  imageClassName,
  layout = 'row',
}) => {
  const isColumn = layout === 'column';
  const badgeClass =
    imageClassName ?? (isColumn ? 'block h-10 w-full' : 'block h-10 w-auto');

  const linkClass = isColumn
    ? 'relative block w-full hover:opacity-90 transition-opacity flex-shrink-0'
    : 'block w-[135px] hover:opacity-90 transition-opacity flex-shrink-0';

  return (
    <div
      className={`flex gap-2.5 ${
        isColumn
          ? 'flex-col items-stretch w-[135px] max-w-full'
          : 'flex-row flex-wrap items-center'
      } ${className}`}
    >
      <a
        href={PLAY_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={linkClass}
      >
        <GooglePlayBadge className={badgeClass} />
      </a>
      <a
        href={APP_STORE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={linkClass}
      >
        <AppStoreBadge className={badgeClass} completeBottomBorder={isColumn} />
        {isColumn && (
          <span
            className="pointer-events-none absolute inset-x-[5px] bottom-0 z-10 h-px bg-[#A6A6A6]"
            aria-hidden="true"
          />
        )}
      </a>
    </div>
  );
};
