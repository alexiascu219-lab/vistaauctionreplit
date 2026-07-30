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
        // of these can collide with the careers palette above.
        //
        // The design brief is an industrial instrument panel, not a website:
        // this is equipment, held in one gloved hand, under bad overhead light,
        // read at arm's length. So: near-black instrument housing, hairline
        // rules, and three saturated signal colours borrowed from actual
        // warehouse safety signage. Verdict colours clear 7:1 against ink.
        floor: {
          ink: "#0A0E14",        // instrument housing
          panel: "#111823",      // sits on the housing
          raised: "#1A2431",     // sits on the panel
          hairline: "#26323F",   // 1px rules
          brand: "#FF6B1A",      // Vista orange, pushed to safety-cone saturation
          brandDark: "#E2540A",
          clear: "#00D67F",      // not on the list — go
          clearDeep: "#04231A",
          wanted: "#FFB000",     // on the list — stop and look
          wantedDeep: "#2A1B00",
          danger: "#FF3B30",
          dangerDeep: "#2B0A08",
        },
      },
      spacing: {
        // Minimum comfortable target for a gloved thumb, and the bottom nav.
        'fl-touch': '3.5rem',
        'fl-nav': '4.75rem',
      },
      backgroundImage: {
        'hero-gradient': 'linear-gradient(rgba(15, 22, 35, 0.65), rgba(15, 22, 35, 0.75))',
      },
      boxShadow: {
        soft: '0 1px 2px rgba(15,23,42,0.04), 0 4px 14px -6px rgba(15,23,42,0.08)',
        lift: '0 2px 4px rgba(15,23,42,0.04), 0 18px 40px -16px rgba(15,23,42,0.16)',
        glow: '0 1px 2px rgba(234,88,12,0.18), 0 12px 30px -10px rgba(234,88,12,0.30)',
      },

      // NOTE: fontFamily / animation / keyframes each appear ONCE. They used to
      // be declared twice in this file, and in a JS object literal the later key
      // silently wins — which meant the floor app's additions were dropped
      // entirely. Keep careers and floor entries merged in these single blocks
      // rather than adding a second declaration.
      fontFamily: {
        // Careers site.
        display: ['"Archivo"', 'sans-serif'],
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
        fraunces: ['"Fraunces"', 'ui-serif', 'Georgia', 'serif'],

        // Floor app. All three are already loaded by src/index.css for the label
        // studio, so this costs zero extra network — which matters when the
        // whole premise is that it works on bad warehouse Wi-Fi.
        //
        // Oswald is a condensed signage gothic: it is what warehouse racking
        // labels and safety signs are actually set in, so it reads as native to
        // the environment rather than imported from a marketing site.
        'fl-display': ['Oswald', '"Arial Narrow"', 'sans-serif'],
        // Tabular figures, unambiguous 0/O and 1/l — non-negotiable for VALPNs.
        'fl-mono': ['"Roboto Mono"', 'ui-monospace', 'monospace'],
        'fl-ui': ['"Roboto Condensed"', 'system-ui', 'sans-serif'],
      },
      animation: {
        // Careers site.
        'fade-in-up': 'fadeInUp 0.8s ease-out forwards',
        'fade-in-down': 'fadeInDown 0.5s ease-out forwards',

        // Floor app.
        'fl-sweep': 'flSweep 2.4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fl-verdict': 'flVerdict 0.42s cubic-bezier(0.16, 1, 0.3, 1) both',
        'fl-rise': 'flRise 0.34s cubic-bezier(0.16, 1, 0.3, 1) both',
        'fl-pulse': 'flPulse 2s ease-in-out infinite',
      },
      keyframes: {
        // Careers site.
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeInDown: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },

        // Floor app.
        // The reticle sweep: the one piece of motion that says "actively looking".
        flSweep: {
          '0%':   { transform: 'translateY(-46%)', opacity: '0' },
          '12%':  { opacity: '1' },
          '88%':  { opacity: '1' },
          '100%': { transform: 'translateY(46%)', opacity: '0' },
        },
        // The verdict lands with weight — it is the entire product.
        flVerdict: {
          '0%':   { opacity: '0', transform: 'scale(0.94)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        flRise: {
          '0%':   { opacity: '0', transform: 'translateY(14px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        flPulse: {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.35' },
        },
      },
    },
  },
  plugins: [],
}
