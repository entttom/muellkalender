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
        primary: '#F27F01',
        secondary: '#FFA94D',
        accent: '#D46B08',
        background: '#FFF8F0',
        surface: '#FFFFFF',
        text: '#333333',
        lightText: '#666666',
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem',
      },
      boxShadow: {
        'custom': '0 4px 20px rgba(242, 127, 1, 0.1)',
        'hover': '0 8px 30px rgba(242, 127, 1, 0.2)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
} 