/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    screens: {
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px'
    },
    extend: {
      colors: {
        primary: {
          50: '#e5eff9',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#0052a4',
          600: '#0052a4',
          700: '#003777',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554'
        },
        secondary: {
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
          950: '#052e16'
        },
        accent: '#d32f2f',
        surface: '#ffffff',
        background: '#f5f6f7'
      },
      fontFamily: {
        sans: [
          'Pretendard',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Noto Sans KR',
          'Apple SD Gothic Neo',
          'Malgun Gothic',
          'sans-serif'
        ]
      },
      spacing: {
        '18': '4.5rem',
        '128': '32rem',
        '144': '36rem'
      },
      borderRadius: {
        '4xl': '2rem'
      },
      boxShadow: {
        'card': '0 1px 2px rgba(15, 23, 42, 0.05)',
        'card-hover': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
      },
      maxWidth: {
        'page': '80rem'
      },
      zIndex: {
        'header': '40',
        'dropdown': '50'
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'fade-in-up': 'fadeInUp 0.6s ease-out',
        'fade-in-up-delayed': 'fadeInUp 0.6s ease-out 0.2s both',
        'slide-down': 'slideDown 0.2s ease-out',
        'slide-up': 'slideUp 0.3s ease-out'
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        }
      },
      typography: {
        DEFAULT: {
          css: {
            maxWidth: 'none',
            color: '#374151',
            lineHeight: '1.8',
            h2: {
              fontSize: '1.75rem',
              fontWeight: '700',
              color: '#111827',
              marginTop: '2rem',
              marginBottom: '1rem',
              paddingBottom: '0.5rem',
              borderBottom: '2px solid #e5e7eb'
            },
            'h2:first-child': {
              marginTop: '0'
            },
            h3: {
              fontSize: '1.5rem',
              fontWeight: '600',
              color: '#111827',
              marginTop: '1.5rem',
              marginBottom: '1rem'
            },
            p: {
              fontSize: '1rem',
              color: '#374151',
              lineHeight: '1.8',
              marginTop: '0',
              marginBottom: '1rem'
            },
            'ul, ol': {
              marginTop: '1rem',
              marginBottom: '1rem',
              paddingLeft: '2rem'
            },
            li: {
              fontSize: '1rem',
              color: '#374151',
              lineHeight: '1.8',
              marginTop: '0.5rem',
              marginBottom: '0.5rem'
            },
            strong: {
              fontWeight: '600',
              color: '#111827'
            }
          }
        }
      }
    }
  },
  plugins: [
    require('@tailwindcss/typography')
  ]
}

