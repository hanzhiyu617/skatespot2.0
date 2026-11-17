/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Noto Sans KR', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      colors: {
        ink: '#171717',
        muted: '#404040',
        accent: '#D4AF37',
        canvas: '#FFFFFF',
      },
      borderRadius: {
        '2xl': '1rem',
      },
      boxShadow: {
        soft: '0 12px 40px rgba(23,23,23,0.08)',
      },
    },
  },
  plugins: [],
}
