import animate from 'tailwindcss-animate';

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './index.tsx',
    './App.tsx',
    './constants.tsx',
    './pages/**/*.{ts,tsx}',
    './layouts/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
    './utils/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      // Couleurs de marque (white-label) : suivent les variables CSS posées
      // à l'exécution par BrandContext selon la salle de l'adhérent.
      colors: {
        brand: 'var(--brand, #4f46e5)',
        'brand-dark': 'var(--brand-dark, #4338ca)',
        'brand-soft': 'var(--brand-soft, #eef2ff)',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [animate],
};
