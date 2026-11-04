import animate from 'tailwindcss-animate';
import defaultTheme from 'tailwindcss/defaultTheme';

/**
 * Tailles, graisses, rayons et police passent par des variables CSS (index.css) :
 * valeurs Tailwind d'origine par défaut, charte NoResa dans `.theme-noresa`.
 * L'espace membre et la borne, hors de cette classe, gardent donc leur rendu.
 */
const size = (key, letterSpacing = false) => [
  `var(--fs-${key})`,
  { lineHeight: `var(--lh-${key})`, ...(letterSpacing ? { letterSpacing: `var(--ls-${key})` } : {}) },
];

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
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    borderRadius: {
      none: '0',
      sm: 'var(--radius-sm)',
      DEFAULT: 'var(--radius)',
      md: 'var(--radius-md)',
      lg: 'var(--radius-lg)',
      xl: 'var(--radius-xl)',
      '2xl': 'var(--radius-2xl)',
      '3xl': 'var(--radius-3xl)',
      full: '9999px',
    },
    fontSize: {
      xs: size('xs'),
      sm: size('sm'),
      base: size('base'),
      md: size('md'),
      lg: size('lg'),
      xl: size('xl'),
      '2xl': size('2xl', true),
      '3xl': size('3xl', true),
      '4xl': size('4xl', true),
      '5xl': size('5xl', true),
      '6xl': size('6xl'),
      '7xl': size('7xl'),
      '8xl': size('8xl'),
      '9xl': size('9xl'),
    },
    fontWeight: {
      thin: 'var(--fw-thin)',
      extralight: 'var(--fw-extralight)',
      light: 'var(--fw-light)',
      normal: 'var(--fw-normal)',
      medium: 'var(--fw-medium)',
      semibold: 'var(--fw-semibold)',
      bold: 'var(--fw-bold)',
      extrabold: 'var(--fw-extrabold)',
      black: 'var(--fw-black)',
    },
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)'],
        mono: defaultTheme.fontFamily.mono,
      },
      colors: {
        // Couleurs de marque (white-label) : suivent les variables CSS posées
        // à l'exécution par BrandContext selon la salle de l'adhérent.
        brand: 'var(--brand, #4f46e5)',
        'brand-dark': 'var(--brand-dark, #4338ca)',
        'brand-soft': 'var(--brand-soft, #eef2ff)',

        // Charte NoResa
        ink: '#201E1D',
        'ink-2': '#444141',
        muted: '#605D5D',
        subtle: '#9B9797',
        line: '#D7D3D3',
        'line-soft': '#EAE7E7',
        ground: '#F3F2F2',
        'ground-2': '#F8F4F4',
        surface: '#FFFFFF',
        primary: { DEFAULT: '#C81E1E', dark: '#9E1616', soft: '#FDEAEA' },
        success: { DEFAULT: '#1F7A4D', text: '#1F5F3D', soft: '#E3F1E9' },
        warning: { DEFAULT: '#A15C07', text: '#7A4504', soft: '#FBF0DC' },
        danger: { DEFAULT: '#C81E1E', text: '#9E1616', soft: '#FDEAEA' },
      },
      width: { sidebar: '220px', search: '360px' },
      maxWidth: { modal: '560px' },
      boxShadow: {
        // Réservées aux surfaces flottantes : menu déroulant et modale.
        float: '0 3px 10px rgba(45,43,43,0.16)',
        modal: '0 12px 32px rgba(45,43,43,0.22)',
      },
      borderWidth: { 3: '3px' },
    },
  },
  plugins: [animate],
};
