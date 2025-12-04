/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        'display': ['Playfair Display', 'Georgia', 'serif'],
        'sans': ['DM Sans', 'system-ui', 'sans-serif'],
        'mono': ['JetBrains Mono', 'monospace'],
      },
      colors: {
        cream: {
          50: '#FEFDFB',
          100: '#FDF9F3',
          200: '#FAF3E6',
          300: '#F5E9D4',
          400: '#EDD9B8',
          500: '#E2C89C',
        },
        sage: {
          50: '#F4F7F4',
          100: '#E8EFE8',
          200: '#D1DFD1',
          300: '#A8C4A8',
          400: '#7FA87F',
          500: '#5C8A5C',
          600: '#4A7A4A',
          700: '#3D633D',
          800: '#2E4A2E',
          900: '#1F321F',
        },
        terracotta: {
          50: '#FEF6F3',
          100: '#FCE8E1',
          200: '#F9D1C3',
          300: '#F4AD93',
          400: '#EC8562',
          500: '#E06840',
          600: '#CC5030',
          700: '#AB4028',
          800: '#8B3624',
          900: '#6E2D1E',
        },
        charcoal: {
          50: '#F7F7F7',
          100: '#E3E3E3',
          200: '#C8C8C8',
          300: '#A4A4A4',
          400: '#818181',
          500: '#666666',
          600: '#515151',
          700: '#434343',
          800: '#383838',
          900: '#1A1A1A',
          950: '#0D0D0D',
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
        'bounce-soft': 'bounceSoft 1s ease-in-out infinite',
        'gradient': 'gradient 8s linear infinite',
      },
      keyframes: {
        gradient: {
          '0%, 100%': {
            'background-size': '200% 200%',
            'background-position': 'left center'
          },
          '50%': {
            'background-size': '200% 200%',
            'background-position': 'right center'
          },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        bounceSoft: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
      },
    },
  },
  plugins: [],
}

