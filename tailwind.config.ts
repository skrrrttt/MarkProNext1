import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Brand colors
        brand: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b', // Primary yellow
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
        // Dark theme
        dark: {
          bg: '#0f0f1a',
          card: '#1a1a2e',
          'card-hover': '#252540',
          border: '#2d2d44',
        },
        // Status colors
        status: {
          pending: '#f59e0b',
          progress: '#8b5cf6',
          completed: '#22c55e',
          lead: '#94a3b8',
        },
      },
      fontFamily: {
        sans: ['var(--font-dm-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-space-mono)', 'monospace'],
      },
      // Field-friendly touch targets
      spacing: {
        'touch': '44px', // Minimum touch target
        'touch-lg': '56px',
      },
      borderRadius: {
        'card': '12px',
      },
      // Disable text selection for field mode
      userSelect: {
        'field': 'none',
      },
    },
  },
  plugins: [],
};

export default config;
