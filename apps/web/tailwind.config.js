/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './hooks/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
    '../web/app/**/*.{js,ts,jsx,tsx,mdx}',
    '../web/components/**/*.{js,ts,jsx,tsx,mdx}',
    './apps/web/app/**/*.{js,ts,jsx,tsx,mdx}',
    './apps/web/components/**/*.{js,ts,jsx,tsx,mdx}',
    './apps/web/pages/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        primary: {
          DEFAULT: '#6B5488', // Serene dusty lavender / muted amethyst
          50: '#F9F7FB',
          100: '#F2ECF7',
          200: '#E6DBEF',
          300: '#D2BFDF',
          400: '#B69CC9',
          500: '#9B7BB0',
          600: '#7E5E95',
          700: '#674A7C',
          800: '#543D65',
          900: '#463454',
        },
        warm: {
          50: '#FAF8F5',
          100: '#F5F2EB',
          200: '#ECE6DC',
          300: '#DDD4C4',
          400: '#C4B8A2',
          500: '#A6987F',
        }
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'sans-serif'],
        serif: ['var(--font-serif)', 'serif'],
        tamil: ['var(--font-noto-tamil)', 'sans-serif'],
      },
      boxShadow: {
        'soft-sm': '0 2px 8px -2px rgba(90, 70, 110, 0.05)',
        'soft-md': '0 6px 20px -4px rgba(90, 70, 110, 0.07)',
        'soft-lg': '0 12px 32px -6px rgba(90, 70, 110, 0.09)',
        'soft-xl': '0 20px 48px -8px rgba(90, 70, 110, 0.12)',
      },
      keyframes: {
        'pulse-subtle': {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.5 },
        },
        'fade-in': {
          from: { opacity: 0, transform: 'translateY(6px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        }
      },
      animation: {
        'pulse-subtle': 'pulse-subtle 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fade-in 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
}
