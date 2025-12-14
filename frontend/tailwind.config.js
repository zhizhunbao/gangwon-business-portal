/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    // 响应式断点配置（Tailwind 默认值，明确列出便于参考）
    screens: {
      'sm': '640px',   // 小屏设备（手机横屏、小平板）
      'md': '768px',   // 中等屏幕（平板竖屏）
      'lg': '1024px',  // 大屏设备（平板横屏、小桌面）
      'xl': '1280px',  // 超大屏（桌面）
      '2xl': '1536px'  // 超超大屏（大桌面）
    },
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
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
        gray: {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
          950: '#030712'
        }
      },
      fontFamily: {
        sans: [
          'Noto Sans KR',
          'Noto Sans SC',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Arial',
          'sans-serif'
        ]
      },
      spacing: {
        '128': '32rem',
        '144': '36rem'
      },
      borderRadius: {
        '4xl': '2rem'
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        'card-hover': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'fade-in-up': 'fadeInUp 0.6s ease-out',
        'fade-in-up-delayed': 'fadeInUp 0.6s ease-out 0.2s both'
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        fadeInUp: {
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

