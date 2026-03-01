/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#e8f0fe",
          100: "#c5d8fc",
          500: "#1a73e8",
          600: "#1557b0",
          700: "#104a9c",
        },
        success: "#34a853",
        warn:    "#fbbc04",
        danger:  "#ea4335",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
