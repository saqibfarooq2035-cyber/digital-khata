/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#06B6D4',
        secondary: '#0891B2',
        success: '#22C55E',
        warning: '#F59E0B',
        danger: '#EF4444',
        khata: {
          bg: '#ECFEFF',
          card: '#FFFFFF',
          text: '#001820',
          'text-muted': '#0E7490',
          border: '#CFFAFE',
          sidebar: '#004D5C',
          'sidebar-dark': '#003D4A',
          'sidebar-text': '#A5F3FC',
        },
      },
    },
  },
  plugins: [],
};
