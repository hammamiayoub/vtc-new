import React from 'react';

/** Illustrations vectorielles des véhicules (vue de côté, face à droite). */

function Wheel({ cx, cy = 140, r = 24 }: { cx: number; cy?: number; r?: number }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r + 4} fill="#1b1b1b" opacity="0.0" />
      <circle cx={cx} cy={cy} r={r} fill="#161616" />
      <circle cx={cx} cy={cy} r={r * 0.62} fill="#d4d4d4" />
      <circle cx={cx} cy={cy} r={r * 0.62} fill="none" stroke="#9a9a9a" strokeWidth="2" />
      <circle cx={cx} cy={cy} r={r * 0.18} fill="#6b6b6b" />
    </g>
  );
}

function Scene({ children }: { children: React.ReactNode; bg?: [string, string] }) {
  // Le fond est porté par le conteneur ; "meet" garantit que le véhicule n'est jamais rogné.
  return (
    <svg viewBox="0 0 400 200" className="w-full h-full" role="img" preserveAspectRatio="xMidYMax meet">
      <ellipse cx="200" cy="168" rx="170" ry="7" fill="#000" opacity="0.2" />
      {children}
    </svg>
  );
}

const SEDAN_BODY =
  'M38 150 L38 120 Q38 108 54 105 L118 96 L148 62 Q154 56 166 56 L258 56 Q270 56 278 64 L304 96 L344 104 Q364 108 364 126 L364 150 Z';
const SEDAN_GLASS = 'M158 66 L252 66 L284 96 L132 98 Z';

export function TaxiIllustration() {
  return (
    <Scene bg={['#f1f1ee', '#d9d9d4']}>
      <path d={SEDAN_BODY} fill="#FFC72C" />
      <path d="M38 134 L364 134 L364 140 L38 140 Z" fill="#e0a800" opacity="0.5" />
      <path d={SEDAN_GLASS} fill="#bfe0ee" />
      <rect x="203" y="66" width="3" height="31" fill="#FFC72C" />
      <rect x="180" y="44" width="46" height="13" rx="3" fill="#1f1f1f" />
      <text x="203" y="54" textAnchor="middle" fontSize="9" fontWeight="700" fill="#FFC72C" fontFamily="Inter, sans-serif">TAXI</text>
      <rect x="352" y="112" width="12" height="8" rx="2" fill="#fff6c2" />
      <rect x="38" y="112" width="8" height="8" rx="2" fill="#d93a3a" />
      <rect x="150" y="104" width="14" height="3" rx="1.5" fill="#b38600" />
      <Wheel cx={106} />
      <Wheel cx={296} />
    </Scene>
  );
}

export function BlackSedanIllustration() {
  return (
    <Scene bg={['#e9e9ec', '#cfcfd4']}>
      <path d={SEDAN_BODY} fill="#141414" />
      <path d="M44 116 Q200 102 360 116" fill="none" stroke="#fff" strokeOpacity="0.18" strokeWidth="2" />
      <path d={SEDAN_GLASS} fill="#5f7280" />
      <rect x="203" y="66" width="3" height="31" fill="#141414" />
      <rect x="352" y="112" width="12" height="8" rx="2" fill="#fff6c2" />
      <rect x="38" y="112" width="8" height="8" rx="2" fill="#d93a3a" />
      <rect x="150" y="106" width="14" height="3" rx="1.5" fill="#444" />
      <Wheel cx={106} />
      <Wheel cx={296} />
    </Scene>
  );
}

export function GreyVanIllustration() {
  return (
    <Scene bg={['#eceff1', '#d0d5d9']}>
      <path
        d="M26 150 L26 58 Q26 46 38 46 L262 46 Q274 46 282 56 L326 106 L364 114 Q374 116 374 128 L374 150 Z"
        fill="#8a9099"
      />
      <path d="M286 62 L286 104 L330 104 Z" fill="#bfe0ee" />
      <rect x="44" y="60" width="52" height="34" rx="4" fill="#bfe0ee" />
      <rect x="104" y="60" width="52" height="34" rx="4" fill="#bfe0ee" />
      <rect x="164" y="60" width="52" height="34" rx="4" fill="#bfe0ee" />
      <rect x="224" y="60" width="52" height="34" rx="4" fill="#bfe0ee" />
      <rect x="26" y="118" width="348" height="4" fill="#000" opacity="0.14" />
      <rect x="364" y="120" width="10" height="8" rx="2" fill="#fff6c2" />
      <rect x="26" y="108" width="7" height="10" rx="2" fill="#d93a3a" />
      <Wheel cx={90} cy={148} r={26} />
      <Wheel cx={296} cy={148} r={26} />
    </Scene>
  );
}

export function WhiteBusIllustration() {
  return (
    <Scene bg={['#eceff1', '#d0d5d9']}>
      <path
        d="M18 152 L18 52 Q18 38 32 38 L346 38 Q362 38 368 54 L378 152 Z"
        fill="#fafafa"
        stroke="#c9ced3"
        strokeWidth="2"
      />
      <path d="M18 112 L378 112 L378 124 L18 124 Z" fill="#2b6cb0" opacity="0.85" />
      {[34, 88, 142, 196, 250].map((x) => (
        <rect key={x} x={x} y="52" width="48" height="42" rx="4" fill="#5f7a8c" />
      ))}
      <path d="M308 52 L346 52 Q356 52 358 62 L362 94 L308 94 Z" fill="#5f7a8c" />
      <rect x="302" y="52" width="2" height="86" fill="#c9ced3" />
      <rect x="370" y="120" width="8" height="10" rx="2" fill="#fff6c2" />
      <rect x="18" y="124" width="7" height="12" rx="2" fill="#d93a3a" />
      <Wheel cx={98} cy={150} r={26} />
      <Wheel cx={296} cy={150} r={26} />
    </Scene>
  );
}

export function MercedesLuxuryIllustration() {
  return (
    <Scene bg={['#e4e5e8', '#c4c6cc']}>
      <defs>
        <linearGradient id="merc-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4a4d55" />
          <stop offset="1" stopColor="#1d1f24" />
        </linearGradient>
      </defs>
      <path
        d="M30 150 L30 122 Q30 110 48 107 L122 98 L156 62 Q162 56 176 56 L262 56 Q276 56 286 64 L318 98 L352 104 Q372 108 372 126 L372 150 Z"
        fill="url(#merc-body)"
      />
      <path d="M36 118 Q200 100 368 118" fill="none" stroke="#fff" strokeOpacity="0.28" strokeWidth="2" />
      <path d="M32 138 L370 138" stroke="#c9ccd2" strokeWidth="2.5" />
      <path d="M166 66 L258 66 L296 98 L140 100 Z" fill="#6f8494" />
      <rect x="208" y="66" width="3" height="33" fill="#1d1f24" />
      <rect x="360" y="112" width="12" height="8" rx="2" fill="#fff6c2" />
      <rect x="30" y="112" width="8" height="8" rx="2" fill="#d93a3a" />
      {/* Étoile à trois branches (emblème de calandre stylisé) */}
      <g transform="translate(341 123)">
        <circle r="6.5" fill="none" stroke="#e5e7eb" strokeWidth="1.2" />
        <path d="M0 -6 L0 0 M0 0 L5.2 3 M0 0 L-5.2 3" stroke="#e5e7eb" strokeWidth="1.2" strokeLinecap="round" />
      </g>
      <Wheel cx={104} />
      <Wheel cx={304} />
    </Scene>
  );
}
