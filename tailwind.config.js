import colors from 'tailwindcss/colors';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      colors: {
        brand: {
          DEFAULT: '#003333',
          hover: '#004d4d',
          muted: '#e6f0f0',
        },
        surface: {
          DEFAULT: '#ffffff',
          muted: '#f6f6f6',
          border: '#e8e8e8',
        },
        // Ink = couleur d'action principale (boutons, titres), comme uber.com
        ink: {
          DEFAULT: '#000000',
          soft: '#1f1f1f',
          muted: '#545454',
          subtle: '#757575',
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
        'display-xl': ['4rem', { lineHeight: '1.05', letterSpacing: '-0.03em', fontWeight: '700' }],
        'display-lg': ['3rem', { lineHeight: '1.1', letterSpacing: '-0.025em', fontWeight: '700' }],
        'display-md': ['2.25rem', { lineHeight: '1.15', letterSpacing: '-0.02em', fontWeight: '700' }],
        'heading-lg': ['1.75rem', { lineHeight: '1.25', letterSpacing: '-0.015em', fontWeight: '600' }],
        'heading-md': ['1.375rem', { lineHeight: '1.3', letterSpacing: '-0.01em', fontWeight: '600' }],
        'heading-sm': ['1.125rem', { lineHeight: '1.4', fontWeight: '600' }],
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
