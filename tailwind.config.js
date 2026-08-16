/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './app/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#E85D04',
        secondary: '#F48C06',
        accent: '#DC2F02',
        ink: '#0F172A',
        muted: '#64748B',
        background: '#F1F5F9',
        surface: '#FFFFFF',
        line: '#E2E8F0',
        // Legacy aliases used across components
        text: '#0F172A',
        lightText: '#64748B',
      },
      fontFamily: {
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
        sans: ['var(--font-body)', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.25rem',
      },
      boxShadow: {
        panel: '0 1px 0 rgba(15, 23, 42, 0.04), 0 12px 32px rgba(15, 23, 42, 0.06)',
        soft: '0 8px 24px rgba(15, 23, 42, 0.06)',
      },
      keyframes: {
        rise: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        progress: {
          '0%': { transform: 'scaleX(0)' },
          '100%': { transform: 'scaleX(1)' },
        },
        drift: {
          '0%, 100%': { transform: 'translate3d(0,0,0)' },
          '50%': { transform: 'translate3d(2%, -1%, 0)' },
        },
      },
      animation: {
        rise: 'rise 0.45s ease-out both',
        'rise-delay': 'rise 0.55s ease-out 0.08s both',
        progress: 'progress 0.5s ease-out both',
        drift: 'drift 18s ease-in-out infinite',
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
};
