/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./lib/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Light mode colors
        'brand': {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c3d66',
        },
        // Dark mode adjustments
        'dark-bg': {
          primary: '#0f172a',
          secondary: '#1e293b',
          tertiary: '#334155',
          card: '#1e293b',
        },
        'dark-text': {
          primary: '#f1f5f9',
          secondary: '#cbd5e1',
          tertiary: '#94a3b8',
        },
      },
      spacing: {
        'safe-top': 'max(1rem, env(safe-area-inset-top))',
        'safe-bottom': 'max(1rem, env(safe-area-inset-bottom))',
      },
      borderRadius: {
        'xl': '0.75rem',
        '2xl': '1rem',
      },
      boxShadow: {
        'light': '0 1px 3px rgba(0, 0, 0, 0.1)',
        'medium': '0 4px 6px rgba(0, 0, 0, 0.1)',
        'lg': '0 10px 15px rgba(0, 0, 0, 0.1)',
        'dark-light': '0 1px 3px rgba(0, 0, 0, 0.3)',
        'dark-medium': '0 4px 6px rgba(0, 0, 0, 0.3)',
        'dark-lg': '0 10px 15px rgba(0, 0, 0, 0.3)',
      },
    },
  },
  plugins: [],
  corePlugins: {
    preflight: true,
  },
};