/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brandOrange: "#f97316", // Orange-500
        brandOrangeDark: "#ea580c", // Orange-600
        background: "#F8FAFC",
        surface: "#FFFFFF",
        "text-main": "#0F172A",
        "text-muted": "#64748B",
        brandBlueDark: "#0F1623", // Dark navy
      brandBlue: "#1E293B", // Slate-800
        accent: "#f97316",

        // Missing-items floor app (/missings). Namespaced under `floor` so none
        // of these can collide with the careers palette above. Built for the
        // warehouse rather than for taste: dark surfaces because the overhead
        // light is bad, one saturated accent, and verdict colours that clear
        // WCAG AAA against floor.ink so a result reads at arm's length.
        floor: {
          ink: "#0b111d",        // page
          panel: "#151d2c",      // sits on the page
          raised: "#1f2a3d",     // sits on the panel
          hairline: "#2c3a52",
          brand: "#f97316",
          brandDark: "#ea580c",
          clear: "#22c55e",      // not on the list, move on
          clearDeep: "#052e16",
          wanted: "#f59e0b",     // on the list
          wantedDeep: "#451a03",
          danger: "#ef4444",
          dangerDeep: "#450a0a",
        },
      },
      spacing: {
        // Minimum comfortable target for a gloved thumb, and the bottom nav.
        'fl-touch': '3.5rem',
        'fl-nav': '4.75rem',
      },
      fontFamily: {
        display: ['"Archivo"', 'sans-serif'],
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
        fraunces: ['"Fraunces"', 'ui-serif', 'Georgia', 'serif'],
      },
      backgroundImage: {
        'hero-gradient': 'linear-gradient(rgba(15, 22, 35, 0.65), rgba(15, 22, 35, 0.75))',
      },
      boxShadow: {
        soft: '0 1px 2px rgba(15,23,42,0.04), 0 4px 14px -6px rgba(15,23,42,0.08)',
        lift: '0 2px 4px rgba(15,23,42,0.04), 0 18px 40px -16px rgba(15,23,42,0.16)',
        glow: '0 1px 2px rgba(234,88,12,0.18), 0 12px 30px -10px rgba(234,88,12,0.30)',
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.8s ease-out forwards',
        'fade-in-down': 'fadeInDown 0.5s ease-out forwards',
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeInDown: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        }
      }
    },
  },
  plugins: [],
}
