/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#0b0f17',
        foreground: '#e5e7eb',
        primary: {
          DEFAULT: '#6366f1',
          foreground: '#ffffff'
        }
      }
    },
  },
  plugins: [],
}
