import type { Config } from 'tailwindcss';

const c = (v: string) => `rgb(var(--${v}) / <alpha-value>)`;
const glow = (v: string) => `0 0 6px rgb(var(--${v}) / 0.9)`;

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        app: c('bg-app'),
        sidebar: c('bg-sidebar'),
        surface: { DEFAULT: c('bg-surface'), 2: c('bg-surface-2'), 3: c('bg-surface-3') },
        inset: c('bg-inset'),
        border: { DEFAULT: c('border-default'), strong: c('border-strong') },
        fg: {
          primary: c('text-primary'),
          secondary: c('text-secondary'),
          muted: c('text-muted'),
          'on-accent': c('text-on-accent'),
        },
        accent: { DEFAULT: c('accent-default'), hover: c('accent-hover'), subtle: c('accent-subtle'), glow: c('accent-glow') },
        success: { DEFAULT: c('success-default'), subtle: c('success-subtle') },
        warning: { DEFAULT: c('warning-default'), subtle: c('warning-subtle') },
        danger: { DEFAULT: c('danger-default'), subtle: c('danger-subtle') },
        neutral: { subtle: c('neutral-subtle') },
      },
      borderColor: { DEFAULT: c('border-default') },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        'display-xl': ['40px', { lineHeight: '44px', letterSpacing: '-1.2px', fontWeight: '800' }],
        h1: ['30px', { lineHeight: '38px', letterSpacing: '-0.8px', fontWeight: '700' }],
        h2: ['20px', { lineHeight: '28px', letterSpacing: '-0.4px', fontWeight: '700' }],
        h3: ['16px', { lineHeight: '22px', letterSpacing: '-0.2px', fontWeight: '600' }],
        body: ['14px', { lineHeight: '20px', fontWeight: '400' }],
        'body-md': ['14px', { lineHeight: '20px', fontWeight: '500' }],
        small: ['13px', { lineHeight: '18px', fontWeight: '400' }],
        label: ['13px', { lineHeight: '16px', fontWeight: '600' }],
        caption: ['12px', { lineHeight: '16px', fontWeight: '500' }],
        overline: ['11px', { lineHeight: '14px', letterSpacing: '1.2px', fontWeight: '500' }],
        key: ['12px', { lineHeight: '16px', fontWeight: '500' }],
        data: ['13px', { lineHeight: '18px', fontWeight: '500' }],
      },
      borderRadius: { card: '16px', ctrl: '8px', 'ctrl-lg': '10px', nav: '6px' },
      boxShadow: {
        'glow-accent': glow('accent-default'),
        'glow-success': glow('success-default'),
        'glow-warning': glow('warning-default'),
        'glow-danger': glow('danger-default'),
      },
    },
  },
  plugins: [],
} satisfies Config;
