/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // 取自设计稿的 oklch 色板，转换为等价的 hex/sRGB 以便 Tailwind 使用
        canvas: '#F7F8FB',
        surface: '#FFFFFF',
        ink: {
          DEFAULT: '#1E2A4A',
          muted: '#5B6880',
          faint: '#8A94A8',
        },
        line: {
          DEFAULT: '#E2E6EF',
          strong: '#CBD2E0',
        },
        brand: {
          50: '#EEF1FE',
          100: '#DCE2FD',
          200: '#BAC6FA',
          300: '#93A6F4',
          400: '#6B85EE',
          500: '#3F5FE0',
          600: '#2F4CCB',
          700: '#273CA8',
          800: '#22337F',
          900: '#1D2B63',
        },
        ok: { soft: '#E3F4EC', ink: '#1B7A52' },
        warn: { soft: '#FBF0DC', ink: '#8A5D12' },
        danger: { soft: '#FBE8E6', ink: '#A32E22' },
        info: { soft: '#E5EEFB', ink: '#1F5BA8' },
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'Inter',
          'Segoe UI',
          'system-ui',
          'Microsoft YaHei',
          'sans-serif',
        ],
        mono: ['JetBrains Mono', 'IBM Plex Mono', 'ui-monospace', 'Menlo', 'Consolas', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '9px',
        lg: '13px',
        xl: '16px',
      },
      fontSize: {
        '2xs': ['11px', '1.4'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(30, 42, 74, 0.04)',
        lift: '0 6px 18px rgba(30, 42, 74, 0.08)',
      },
      keyframes: {
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.3' },
        },
        riseIn: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'pulse-soft': 'pulseSoft 1.4s ease-in-out infinite',
        'rise-in': 'riseIn 0.25s ease-out',
      },
    },
  },
  plugins: [],
}
