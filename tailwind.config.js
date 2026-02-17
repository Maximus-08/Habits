/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        "primary": "#10b981", // Emerald 500
        "primary-hover": "#059669", // Emerald 600
        "secondary": "#2563eb", // Royal Blue 600
        "secondary-hover": "#1d4ed8", // Royal Blue 700
        "background-light": "#f8fafc",
        "text-main": "#18181b",
        "text-muted": "#71717a",
        "coral": "#f47274",
        "coral-light": "#fef2f2",
      },
      fontFamily: {
        "display": ["Inter", "sans-serif"],
        "sans": ["Inter", "sans-serif"],
      },
      borderRadius: {
        "DEFAULT": "0.375rem",
        "lg": "0.5rem",
        "xl": "0.75rem",
        "2xl": "1rem",
        "full": "9999px"
      },
      boxShadow: {
        "glow": "0 0 15px rgba(16, 185, 129, 0.3)",
        "glow-blue": "0 0 20px rgba(37, 99, 235, 0.2)",
        "card-hover": "0 10px 30px -10px rgba(0, 0, 0, 0.08)",
        "soft": "0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)",
        "soft-blue": "0 8px 30px -4px rgba(37, 99, 235, 0.12)",
      }
    },
  },
  plugins: [],
}
