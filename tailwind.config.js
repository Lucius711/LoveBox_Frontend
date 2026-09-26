/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Be Vietnam Pro', 'sans-serif'],
        serif: ['Playfair Display', 'serif'],
      },
      colors: {
        cream: '#faf6f2',
        ink: '#1c1917',
        wine: {
          50: '#fbf3f4',
          100: '#f6e4e7',
          200: '#ecc6cc',
          300: '#dc9aa4',
          400: '#c66677',
          500: '#a8404f',
          600: '#8e2f3e',
          700: '#762533',
          800: '#5f1f2b',
          900: '#4b1a24',
        },
      },
    },
  },
  plugins: [],
};
