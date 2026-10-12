/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#FAF7F2',
          100: '#F4EDE2',
          200: '#E8DEC8',
          300: '#D4A373',
          400: '#C8751B',
          500: '#E08F35',
          600: '#B35D0E',
          700: '#5E3210',
          800: '#3D2514',
          900: '#21130B',
        }
      },
      fontFamily: {
        serif: ['Cinzel', 'serif', 'Georgia'],
        sans: ['Outfit', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
