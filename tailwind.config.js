/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/renderer/**/*.{js,jsx,ts,tsx}",
    "./src/renderer/index.html"
  ],
  theme: {
    extend: {
      colors: {
        // Enhanced color palette with more shades for depth
        navy: {
          DEFAULT: '#0b0a3b',
          50: '#f3f3f8',
          100: '#e7e6f0',
          200: '#c3c1da',
          300: '#9f9cc3',
          400: '#575296',
          500: '#0b0a3b',
          600: '#0a0935',
          700: '#08072b',
          800: '#060520',
          900: '#04031a',
          950: '#020110',
        },
        gold: {
          DEFAULT: '#b48f5a',
          50: '#faf8f5',
          100: '#f5f0e6',
          200: '#e6dcc4',
          300: '#d6c7a1',
          400: '#c5ab7d',
          500: '#b48f5a',
          600: '#9d7a4e',
          700: '#826541',
          800: '#675035',
          900: '#4c3b28',
          950: '#3a2d1f',
        },
        // Neutral colors with more granularity
        neutral: {
          50: '#fafafa',
          100: '#f5f5f5',
          150: '#f0f0f0',
          200: '#e5e5e5',
          250: '#dadada',
          300: '#d4d4d4',
          350: '#b8b8b8',
          400: '#a3a3a3',
          450: '#8e8e8e',
          500: '#737373',
          550: '#5e5e5e',
          600: '#525252',
          650: '#484848',
          700: '#404040',
          750: '#383838',
          800: '#262626',
          850: '#1f1f1f',
          900: '#171717',
          950: '#0a0a0a',
        },
        // Success, warning, error colors with shades
        success: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
        error: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
        },
        brand: {
          navy: '#0b0a3b',
          gold: '#b48f5a',
          white: '#ffffff',
          lightGray: '#f5f5f5',
          gray: '#eeeeee',
        }
      },
      // Sophisticated elevation/shadow system
      boxShadow: {
        'elevation-1': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'elevation-2': '0 2px 4px -1px rgba(0, 0, 0, 0.06), 0 1px 2px -1px rgba(0, 0, 0, 0.04)',
        'elevation-3': '0 4px 6px -2px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.04)',
        'elevation-4': '0 8px 10px -3px rgba(0, 0, 0, 0.04), 0 4px 6px -4px rgba(0, 0, 0, 0.03)',
        'elevation-5': '0 12px 16px -4px rgba(0, 0, 0, 0.08), 0 4px 6px -2px rgba(0, 0, 0, 0.03)',
        'elevation-6': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.04)',
        // Colored shadows for brand elements
        'navy-glow': '0 4px 14px 0 rgba(11, 10, 59, 0.15)',
        'gold-glow': '0 4px 14px 0 rgba(180, 143, 90, 0.15)',
        // Inner shadows for depth
        'inner-1': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)',
        'inner-2': 'inset 0 2px 8px 0 rgba(0, 0, 0, 0.08)',
      },
      // Consistent border radius system
      borderRadius: {
        'none': '0',
        'xs': '0.25rem',   // 4px
        'sm': '0.375rem',  // 6px
        'DEFAULT': '0.5rem', // 8px
        'md': '0.625rem',  // 10px
        'lg': '0.75rem',   // 12px
        'xl': '1rem',      // 16px
        '2xl': '1.25rem',  // 20px
        '3xl': '1.5rem',   // 24px
        'full': '9999px',
      },
      // Enhanced animations
      animation: {
        'slide-in': 'slideIn 0.3s ease-out',
        'fade-in': 'fadeIn 0.2s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'bounce-in': 'bounceIn 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'pulse-soft': 'pulseSoft 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        slideIn: {
          'from': {
            transform: 'translateY(-10px)',
            opacity: '0'
          },
          'to': {
            transform: 'translateY(0)',
            opacity: '1'
          }
        },
        fadeIn: {
          'from': { opacity: '0' },
          'to': { opacity: '1' }
        },
        scaleIn: {
          'from': {
            transform: 'scale(0.95)',
            opacity: '0'
          },
          'to': {
            transform: 'scale(1)',
            opacity: '1'
          }
        },
        slideUp: {
          'from': {
            transform: 'translateY(20px)',
            opacity: '0'
          },
          'to': {
            transform: 'translateY(0)',
            opacity: '1'
          }
        },
        slideDown: {
          'from': {
            transform: 'translateY(-20px)',
            opacity: '0'
          },
          'to': {
            transform: 'translateY(0)',
            opacity: '1'
          }
        },
        bounceIn: {
          'from': {
            opacity: '0',
            transform: 'scale(0.3)'
          },
          '50%': {
            transform: 'scale(1.05)'
          },
          '70%': {
            transform: 'scale(0.9)'
          },
          'to': {
            opacity: '1',
            transform: 'scale(1)'
          }
        },
        pulseSoft: {
          '0%, 100%': {
            opacity: '1'
          },
          '50%': {
            opacity: '0.8'
          }
        },
        shimmer: {
          '0%': {
            backgroundPosition: '-1000px 0'
          },
          '100%': {
            backgroundPosition: '1000px 0'
          }
        }
      },
      // Transition timing functions
      transitionTimingFunction: {
        'bounce-in': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'smooth-out': 'cubic-bezier(0.215, 0.61, 0.355, 1)',
      },
      // Background patterns
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'shimmer': 'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.1) 50%, transparent 100%)',
      }
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
    require('@tailwindcss/forms'),
  ],
}