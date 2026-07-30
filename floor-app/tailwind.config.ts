import type { Config } from 'tailwindcss';

/**
 * Warehouse-floor design tokens.
 *
 * Constraints this palette and scale are built around, all of which come from
 * the environment rather than from taste:
 *   - read at arm's length, so the scan verdict uses display-scale type
 *   - operated one-handed in gloves, so nothing interactive is under 56px
 *   - bad overhead light, so contrast is dark-surface + saturated accent
 *   - the two outcomes (clear / wanted) must be distinguishable at a glance
 *     and without relying on hue alone, for anyone colour-blind
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Vista brand, carried over from the root careers app.
        brand: {
          DEFAULT: '#f97316',
          dark: '#ea580c',
          light: '#fdba74',
        },
        // Dark navy surfaces. ink is the page, panel sits on it, raised on that.
        ink: '#0b111d',
        panel: '#151d2c',
        raised: '#1f2a3d',
        hairline: '#2c3a52',

        // Verdict colours. Both hit 7:1+ against ink for WCAG AAA body text.
        clear: {
          DEFAULT: '#22c55e',
          deep: '#052e16',
        },
        wanted: {
          DEFAULT: '#f59e0b',
          deep: '#451a03',
        },
        danger: {
          DEFAULT: '#ef4444',
          deep: '#450a0a',
        },
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        // Tabular for VALPNs and locations so digits do not shift width.
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      fontSize: {
        // Legible across the aisle.
        verdict: ['3.25rem', { lineHeight: '1', letterSpacing: '-0.02em', fontWeight: '800' }],
        valpn: ['2rem', { lineHeight: '1.1', letterSpacing: '0.01em', fontWeight: '700' }],
        field: ['1.375rem', { lineHeight: '1.3', fontWeight: '600' }],
      },
      spacing: {
        // Minimum comfortable glove target, and the bottom nav height.
        touch: '3.5rem',
        nav: '4.75rem',
      },
      borderRadius: {
        xl2: '1.25rem',
      },
    },
  },
  plugins: [],
};

export default config;
