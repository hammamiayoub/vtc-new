
/**
 * Illustrations vectorielles de la livraison de colis (style sobre : noir, gris, rouge du drapeau).
 * Décoratives : le texte adjacent porte le sens, d'où aria-hidden (sauf l'illustration principale).
 */

const INK = '#111827';
const LINE = '#d1d5db';
const SOFT = '#f3f4f6';
const CARDBOARD = '#d9bb8f';
const CARDBOARD_DARK = '#b99a6b';
const RED = '#e70013';

function Box({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx="3" fill={CARDBOARD} stroke={CARDBOARD_DARK} strokeWidth="2" />
      <rect x={x + w / 2 - 5} y={y} width="10" height={h} fill={CARDBOARD_DARK} opacity="0.55" />
    </g>
  );
}

function Pin({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <path d="M0 0 C-13 -18 -18 -26 -18 -34 A18 18 0 1 1 18 -34 C18 -26 13 -18 0 0 Z" fill={RED} />
      <circle cx="0" cy="-34" r="7" fill="#fff" />
    </g>
  );
}

/** Scène principale : colis, camionnette et trajet d'un point A à un point B. */
export function DeliveryHeroIllustration({ label }: { label: string }) {
  return (
    <svg viewBox="0 0 640 280" className="w-full h-auto" role="img" aria-label={label}>
      <rect width="640" height="280" fill={SOFT} />
      <path d="M0 232 L640 232" stroke={LINE} strokeWidth="2" />
      <rect x="0" y="232" width="640" height="48" fill="#e5e7eb" />

      {/* Trajet */}
      <path
        d="M96 98 C 200 20, 440 20, 548 98"
        fill="none"
        stroke={RED}
        strokeWidth="3"
        strokeDasharray="2 9"
        strokeLinecap="round"
      />
      <Pin x={96} y={112} scale={0.9} />
      <Pin x={548} y={112} scale={0.9} />

      {/* Colis à gauche */}
      <Box x={58} y={188} w={64} h={44} />
      <Box x={128} y={200} w={46} h={32} />
      <Box x={74} y={150} w={46} h={38} />

      {/* Camionnette */}
      <ellipse cx="354" cy="236" rx="150" ry="6" fill="#000" opacity="0.12" />
      <rect x="214" y="124" width="170" height="96" rx="6" fill="#fff" stroke={LINE} strokeWidth="2" />
      <rect x="214" y="190" width="170" height="10" fill={RED} />
      <path d="M384 220 L384 150 L424 150 L462 184 L470 184 L470 220 Z" fill={INK} />
      <path d="M392 158 L420 158 L448 184 L392 184 Z" fill="#cbd5e1" />
      <rect x="456" y="196" width="14" height="8" rx="2" fill="#fde68a" />
      <rect x="226" y="136" width="46" height="34" rx="3" fill={CARDBOARD} stroke={CARDBOARD_DARK} strokeWidth="2" />
      <rect x="278" y="146" width="36" height="24" rx="3" fill={CARDBOARD} stroke={CARDBOARD_DARK} strokeWidth="2" />
      {[260, 424].map((cx) => (
        <g key={cx}>
          <circle cx={cx} cy="222" r="22" fill="#0b0f19" />
          <circle cx={cx} cy="222" r="12" fill="#d1d5db" />
          <circle cx={cx} cy="222" r="4" fill="#6b7280" />
        </g>
      ))}

      {/* Colis livré à droite */}
      <Box x={508} y={196} w={52} h={36} />
      <Box x={566} y={206} w={40} h={26} />
      <circle cx="534" cy="176" r="14" fill="#16a34a" />
      <path d="M527 176 l5 5 l9 -10" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Étape 1 : décrire la livraison (carte, deux adresses). */
export function StepAddressIllustration() {
  return (
    <svg viewBox="0 0 160 100" className="w-full h-full" aria-hidden="true" focusable="false">
      <rect width="160" height="100" fill={SOFT} />
      <g stroke={LINE} strokeWidth="1.5">
        <path d="M0 30 H160 M0 62 H160 M40 0 V100 M96 0 V100 M132 0 V100" />
      </g>
      <path d="M36 70 C 60 20, 100 80, 124 30" fill="none" stroke={RED} strokeWidth="2.5" strokeDasharray="2 6" strokeLinecap="round" />
      <Pin x={36} y={78} scale={0.55} />
      <Pin x={124} y={40} scale={0.55} />
    </svg>
  );
}

/** Étape 2 : recevoir des offres en TND. */
export function StepOffersIllustration() {
  return (
    <svg viewBox="0 0 160 100" className="w-full h-full" aria-hidden="true" focusable="false">
      <rect width="160" height="100" fill={SOFT} />
      {[0, 1, 2].map((i) => (
        <g key={i} transform={`translate(24 ${14 + i * 26})`}>
          <rect width="112" height="20" rx="6" fill="#fff" stroke={LINE} strokeWidth="1.5" />
          <circle cx="12" cy="10" r="5" fill={i === 1 ? '#16a34a' : '#9ca3af'} />
          <rect x="24" y="7" width="38" height="6" rx="3" fill="#e5e7eb" />
          <text x="104" y="14" textAnchor="end" fontSize="9" fontWeight="700" fill={INK} fontFamily="Inter, sans-serif">
            {['85', '70', '95'][i]} TND
          </text>
        </g>
      ))}
    </svg>
  );
}

/** Étape 3 : choisir et valider. */
export function StepConfirmIllustration() {
  return (
    <svg viewBox="0 0 160 100" className="w-full h-full" aria-hidden="true" focusable="false">
      <rect width="160" height="100" fill={SOFT} />
      <rect x="34" y="16" width="92" height="68" rx="10" fill="#fff" stroke={LINE} strokeWidth="1.5" />
      <circle cx="80" cy="46" r="17" fill="#16a34a" />
      <path d="M71 46 l7 7 l12 -14" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="54" y="68" width="52" height="6" rx="3" fill="#e5e7eb" />
    </svg>
  );
}

const ICON_PROPS = {
  viewBox: '0 0 64 64',
  fill: 'none',
  stroke: INK,
  strokeWidth: 2.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  focusable: false as const,
  className: 'w-full h-full',
};

/** Cartons et effets personnels. */
export function BoxesIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M8 30 L24 22 L40 30 L40 48 L24 56 L8 48 Z" />
      <path d="M8 30 L24 38 L40 30 M24 38 V56" />
      <path d="M32 26 L48 18 L58 23 L58 40 L42 48" />
      <path d="M42 28 L58 23" />
    </svg>
  );
}

/** Électroménager. */
export function ApplianceIcon() {
  return (
    <svg {...ICON_PROPS}>
      <rect x="18" y="6" width="28" height="52" rx="4" />
      <path d="M18 24 H46" />
      <path d="M24 12 V19 M24 30 V40" />
      <path d="M22 58 V61 M42 58 V61" />
    </svg>
  );
}

/** Meubles. */
export function FurnitureIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M12 34 V26 A8 8 0 0 1 20 18 H44 A8 8 0 0 1 52 26 V34" />
      <path d="M6 34 A5 5 0 0 1 12 40 V46 H52 V40 A5 5 0 0 1 58 34 A5 5 0 0 1 58 44 V50 H6 V44 A5 5 0 0 1 6 34 Z" />
      <path d="M14 50 V56 M50 50 V56" />
    </svg>
  );
}

/** Marchandises de commerçants. */
export function ShopIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M8 24 L12 10 H52 L56 24" />
      <path d="M8 24 A6 6 0 0 0 20 24 A6 6 0 0 0 32 24 A6 6 0 0 0 44 24 A6 6 0 0 0 56 24" />
      <path d="M12 30 V56 H52 V30" />
      <rect x="26" y="40" width="12" height="16" />
    </svg>
  );
}

/** Avion vu de dessus, nez vers la droite, centré sur (0,0). */
function Plane({ x, y, rotate = 0, scale = 1 }: { x: number; y: number; rotate?: number; scale?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotate}) scale(${scale})`} fill={INK}>
      <ellipse cx="0" cy="0" rx="28" ry="5.5" />
      <path d="M-2 0 L-18 -24 L-8 -24 L14 0 Z" />
      <path d="M-2 0 L-18 24 L-8 24 L14 0 Z" />
      <path d="M-22 0 L-31 -10 L-25 -10 L-15 0 Z" />
      <path d="M-22 0 L-31 10 L-25 10 L-15 0 Z" />
    </g>
  );
}

/** Colis envoyés d'Europe vers la Tunisie : avion au-dessus de la Méditerranée. */
export function InternationalParcelIllustration({ label }: { label: string }) {
  return (
    <svg viewBox="0 0 640 280" className="w-full h-auto" role="img" aria-label={label}>
      <rect width="640" height="280" fill={SOFT} />

      {/* Terres et mer */}
      <rect x="0" y="232" width="236" height="48" fill="#e5e7eb" />
      <rect x="404" y="232" width="236" height="48" fill="#e5e7eb" />
      <rect x="236" y="232" width="168" height="48" fill="#dbeafe" />
      <path
        d="M246 246 q10 -6 20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0"
        fill="none"
        stroke="#93c5fd"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M262 262 q10 -6 20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0"
        fill="none"
        stroke="#93c5fd"
        strokeWidth="2.5"
        strokeLinecap="round"
      />

      {/* Trajet aérien */}
      <path
        d="M96 104 C 200 8, 440 8, 548 104"
        fill="none"
        stroke={RED}
        strokeWidth="3"
        strokeDasharray="2 9"
        strokeLinecap="round"
      />
      <Plane x={322} y={44} />
      <Pin x={96} y={118} scale={0.9} />
      <Pin x={548} y={118} scale={0.9} />

      {/* Europe : colis à expédier */}
      <Box x={52} y={190} w={64} h={42} />
      <Box x={122} y={202} w={46} h={30} />
      <Box x={70} y={154} w={44} h={36} />
      <rect x="176" y="206" width="34" height="26" rx="3" fill="#fff" stroke={LINE} strokeWidth="2" />
      <text x="193" y="224" textAnchor="middle" fontSize="12" fontWeight="700" fill={INK} fontFamily="Inter, sans-serif">EU</text>

      {/* Tunisie : colis livrés */}
      <Box x={466} y={196} w={54} h={36} />
      <Box x={526} y={206} w={42} h={26} />
      <rect x="430" y="206" width="34" height="26" rx="3" fill="#fff" stroke={LINE} strokeWidth="2" />
      <text x="447" y="224" textAnchor="middle" fontSize="12" fontWeight="700" fill={RED} fontFamily="Inter, sans-serif">TN</text>
      <circle cx="494" cy="176" r="14" fill="#16a34a" />
      <path d="M487 176 l5 5 l9 -10" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Groupe en séjour : accueil à l'aéroport, bus, hôtel. */
export function GroupTransportIllustration({ label }: { label: string }) {
  return (
    <svg viewBox="0 0 640 280" className="w-full h-auto" role="img" aria-label={label}>
      <rect width="640" height="280" fill={SOFT} />
      <rect x="0" y="232" width="640" height="48" fill="#e5e7eb" />
      <path d="M0 232 L640 232" stroke={LINE} strokeWidth="2" />

      {/* Trajet aéroport → hôtel */}
      <path
        d="M96 98 C 200 14, 440 14, 548 98"
        fill="none"
        stroke={RED}
        strokeWidth="3"
        strokeDasharray="2 9"
        strokeLinecap="round"
      />
      <Plane x={322} y={40} />
      <Pin x={96} y={112} scale={0.9} />
      <Pin x={548} y={112} scale={0.9} />

      {/* Aéroport */}
      <rect x="28" y="200" width="118" height="32" fill="#fff" stroke={LINE} strokeWidth="2" />
      <rect x="86" y="160" width="14" height="40" fill={INK} />
      <rect x="80" y="150" width="26" height="14" rx="3" fill={INK} />
      {[40, 64, 112, 128].map((wx) => (
        <rect key={wx} x={wx} y="210" width="12" height="10" rx="2" fill="#cbd5e1" />
      ))}

      {/* Bus */}
      <ellipse cx="320" cy="236" rx="160" ry="6" fill="#000" opacity="0.12" />
      <rect x="170" y="122" width="300" height="100" rx="10" fill="#fff" stroke={LINE} strokeWidth="2" />
      <rect x="170" y="190" width="300" height="10" fill={RED} />
      <path d="M430 128 L452 128 Q464 128 466 140 L466 176 L430 176 Z" fill="#cbd5e1" />
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const wx = 184 + i * 40;
        const filled = [0, 2, 3, 5].includes(i);
        return (
          <g key={i}>
            <rect x={wx} y="136" width="32" height="38" rx="4" fill="#cbd5e1" />
            {filled && (
              <g fill="#6b7280">
                <circle cx={wx + 16} cy="152" r="7" />
                <rect x={wx + 6} y="160" width="20" height="14" rx="6" />
              </g>
            )}
          </g>
        );
      })}
      <rect x="458" y="204" width="12" height="8" rx="2" fill="#fde68a" />
      {[236, 412].map((cx) => (
        <g key={cx}>
          <circle cx={cx} cy="222" r="22" fill="#0b0f19" />
          <circle cx={cx} cy="222" r="12" fill="#d1d5db" />
          <circle cx={cx} cy="222" r="4" fill="#6b7280" />
        </g>
      ))}

      {/* Hôtel */}
      <rect x="514" y="132" width="88" height="100" fill="#fff" stroke={LINE} strokeWidth="2" />
      {[0, 1, 2].flatMap((row) =>
        [0, 1, 2].map((col) => (
          <rect
            key={`${row}-${col}`}
            x={526 + col * 26}
            y={144 + row * 24}
            width="16"
            height="14"
            rx="2"
            fill={(row + col) % 2 === 0 ? '#fde68a' : '#cbd5e1'}
          />
        )),
      )}
      <rect x="548" y="212" width="20" height="20" fill={INK} />
    </svg>
  );
}
