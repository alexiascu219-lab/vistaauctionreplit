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
      },
      fontFamily: {
        display: ['"Archivo"', 'sans-serif'],
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'hero-gradient': 'linear-gradient(rgba(15, 22, 35, 0.65), rgba(15, 22, 35, 0.75))',
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
