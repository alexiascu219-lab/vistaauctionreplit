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
        // Register: an auction house's operations tool. Vista sells at auction,
        // so the reference is a catalogue and a saleroom — restraint, deep
        // neutrals, precious-metal accents — not a hazard placard. An earlier
        // pass used fluorescent safety colours flooded edge to edge and read
        // cheap; the discipline now is that colour arrives as TYPE on a dark
        // ground, and the two verdict fields are deep and rich rather than
        // saturated. Still clears 7:1 for contrast, still unmistakable across
        // an aisle, but it looks like it belongs to a company that sells things
        // for money.
        floor: {
          ink: "#0A0A0B",        // true neutral near-black
          panel: "#121214",      // sits on the ink
          raised: "#1A1A1D",     // sits on the panel
          hairline: "#27272B",   // 1px rules, never heavier
          brand: "#E2571F",      // Vista orange, deepened out of fluorescence
          brandDark: "#C1440F",
          brandTint: "#2A1206",  // for accent-tinted grounds

          clear: "#6EE7B7",      // luminous jade — reads as TYPE
          clearDeep: "#062B1E",  // deep forest field
          clearMid: "#2F9E6E",   // fills that need a mid tone

          wanted: "#E8C07A",     // antique gold
          wantedDeep: "#241A08",  // deep bronze field
          wantedMid: "#B8892F",

          danger: "#E5484D",
          dangerDeep: "#2A0E0F",
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
        // Fraunces is a high-contrast editorial serif: the register of an
        // auction catalogue rather than a warehouse placard. Reserved strictly
        // for display moments — the verdict word and screen titles — where its
        // contrast is an asset. Replaced Oswald, whose condensed all-caps read
        // like discount signage everywhere it was used.
        'fl-display': ['Fraunces', 'ui-serif', 'Georgia', 'serif'],
        // Everything functional. A neutral grotesk carries labels and buttons
        // without competing with the serif.
        'fl-ui': ['Archivo', 'system-ui', '-apple-system', 'sans-serif'],
        // Tabular figures, unambiguous 0/O and 1/l — non-negotiable for VALPNs.
        'fl-mono': ['"Roboto Mono"', 'ui-monospace', 'monospace'],
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
