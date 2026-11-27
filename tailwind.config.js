import colors from 'tailwindcss/colors';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Instrument Sans"', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      colors: {
        brand: {
          DEFAULT: '#003333',
          hover: '#004d4d',
          muted: '#e6f0f0',
        },
        // Neutres teintés sable (très faible saturation) : lumière méditerranéenne, murs chaux.
        gray: {
          50: '#faf8f5',
          100: '#f4f1ec',
          200: '#e9e5de',
          300: '#d6d1c8',
          400: '#a8a298',
          500: '#7b7468',
          600: '#5e574c',
          700: '#4a443a',
          800: '#2f2b25',
          900: '#1c1a16',
          950: '#12110e',
        },
        surface: {
          DEFAULT: '#ffffff',
          page: '#faf8f4',
          // Bande de section plus sombre, en alternance avec le fond de page.
          band: '#eee8dd',
          muted: '#f3efe8',
          border: '#e7e2d9',
        },
        // Ink = texte principal : trois rôles (principal, secondaire, discret).
        ink: {
          DEFAULT: '#1c1a16',
          soft: '#2f2b25',
          muted: '#5e574c',
          subtle: '#7b7468',
        },
        // Couleurs sémantiques : à utiliser pour les statuts plutôt que green/red/orange en dur.
        // Échelles complètes (50-950) alignées sur Tailwind pour que le renommage soit sans effet visuel.
        success: colors.green,
        danger: colors.red,
        warning: colors.orange,
        info: colors.blue,
      },
      fontSize: {
        // [taille, { hauteur de ligne, espacement des lettres, graisse }]
        'display-xl': ['4.25rem', { lineHeight: '1.02', letterSpacing: '-0.025em', fontWeight: '400' }],
        'display-lg': ['3.25rem', { lineHeight: '1.05', letterSpacing: '-0.02em', fontWeight: '400' }],
        'display-md': ['2.5rem', { lineHeight: '1.1', letterSpacing: '-0.015em', fontWeight: '400' }],
        'heading-lg': ['1.75rem', { lineHeight: '1.25', letterSpacing: '0', fontWeight: '500' }],
        'heading-md': ['1.375rem', { lineHeight: '1.3', letterSpacing: '0', fontWeight: '500' }],
        'heading-sm': ['1.125rem', { lineHeight: '1.4', fontWeight: '500' }],
        'body-lg': ['1.125rem', { lineHeight: '1.6' }],
        'body-md': ['1rem', { lineHeight: '1.6' }],
        'body-sm': ['0.875rem', { lineHeight: '1.5' }],
        caption: ['0.75rem', { lineHeight: '1.4' }],
      },
      borderRadius: {
        control: '0.75rem', // champs, selects
        card: '1rem', // cartes
        sheet: '1.5rem', // modales, panneaux
      },
      boxShadow: {
        card: '0 8px 28px rgba(0, 0, 0, 0.08)',
        raised: '0 2px 8px rgba(0, 0, 0, 0.08)',
        overlay: '0 24px 64px rgba(0, 0, 0, 0.24)',
      },
      transitionTimingFunction: {
        'out-expo': 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      keyframes: {
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(1rem)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.4s infinite',
        'fade-in': 'fade-in 0.2s ease-out both',
        'slide-up': 'slide-up 0.3s cubic-bezier(0.22, 1, 0.36, 1) both',
      },
    },
  },
  plugins: [],
};
