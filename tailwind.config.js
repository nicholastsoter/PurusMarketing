/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Inter', '"Segoe UI"', 'Roboto', '"Helvetica Neue"', 'Arial', 'sans-serif'],
      },
      colors: {
        warm: {
          50: '#FBFAF7',
          100: '#F5F2EC',
          200: '#EAE5DB',
        },
        accent: {
          50: '#EEF3FC',
          100: '#DCE7F9',
          400: '#5C8AE6',
          500: '#3D6FD6',
          600: '#2F5BC0',
          700: '#26489A',
        },
      },
      borderRadius: {
        xl: '14px',
        '2xl': '18px',
      },
      boxShadow: {
        soft: '0 1px 2px rgba(20, 20, 25, 0.04), 0 4px 16px rgba(20, 20, 25, 0.04)',
        softHover: '0 2px 6px rgba(20, 20, 25, 0.06), 0 10px 28px rgba(20, 20, 25, 0.07)',
      },
    },
  },
  plugins: [],
}
