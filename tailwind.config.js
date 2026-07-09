/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      colors: {
        surface: {
          DEFAULT: '#ffffff',
          muted: '#f6f6f6',
          border: '#e8e8e8',
        },
      },
      boxShadow: {
        card: '0 8px 28px rgba(0, 0, 0, 0.08)',
      },
    },
  },
  plugins: [],
};
