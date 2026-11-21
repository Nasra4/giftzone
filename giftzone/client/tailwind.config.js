/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: '#E76F8A', light: '#F4A7B9', dark: '#CF5572', soft: '#FDE9EE' },
        cream: '#FFF8F6',
        gold: { DEFAULT: '#E9B872', dark: '#C99650' },
        ink: { DEFAULT: '#333333', soft: '#6B6B6B' },
      },
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 8px 30px rgba(231, 111, 138, 0.12)',
        card: '0 2px 14px rgba(51, 51, 51, 0.06)',
      },
      borderRadius: { '2xl': '1.25rem', '3xl': '1.75rem' },
    },
  },
  plugins: [],
};
