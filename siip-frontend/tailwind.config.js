/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Paleta institucional basada en el demo del SIIP
        wine: '#7e1638',
        wine2: '#5d1029',
        wine3: '#9c3153',
        ink: '#253247',
        navy: '#18314f',
      }
    },
  },
  plugins: [],
}