/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#F5F6F1',
        ink: '#1A2421',
        muted: '#5F6B66',
        line: '#E1E2D9',
        moss: { 50: '#EEF4F0', 100: '#DCE8DF', 200: '#B9D2C2', 500: '#3F7A63', 600: '#2E5E4E', 700: '#244A3D', 800: '#1B382E' },
        sun: { 100: '#FCF1D2', 400: '#F2C14E', 600: '#B88A16' },
        brick: { 50: '#F8ECE8', 500: '#B4533A', 600: '#97432E' },
        sky: { 50: '#EAF1F8', 600: '#2F5D8A' }
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', 'system-ui', 'sans-serif'],
        sans: ['"Public Sans"', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif']
      },
      boxShadow: { lift: '0 1px 0 #E1E2D9, 0 8px 24px -12px rgba(26,36,33,.18)' }
    }
  },
  plugins: []
};
