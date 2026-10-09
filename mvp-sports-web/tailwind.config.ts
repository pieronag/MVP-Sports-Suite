import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

const config: Config = {
  // --- ESTA ES LA LÍNEA MÁGICA QUE FALTA O ESTÁ MAL UBICADA ---
  darkMode: "class",
  // -------------------------------------------------------------

  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1200px",
      },
    },
    extend: {
      borderRadius: {
        none: "0px",
        sm: "3px",
        DEFAULT: "5px",
        md: "5px",
        lg: "5px",
        xl: "5px",
        "2xl": "5px",
        "3xl": "5px",
        full: "9999px",
      },
      colors: {
        mvp: {
          dark: "#050b14",
          green: "#00df82",
          volt: "#00df82",
          cyan: "#00e0ff",
          silver: "#e2e8f0",
        },
      },
      fontFamily: {
        heading: ["var(--font-fira-sans)", "sans-serif"],
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-fira-code)", "ui-monospace", "monospace"],
      },
      animation: {
        'spin-slow': 'spin 3s linear infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fadeIn': 'fadeIn 0.2s ease-out',
        'slideInLeft': 'slideInLeft 0.25s ease-out',
        'scan-vertical': 'scanVertical 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideInLeft: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        scanVertical: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(256px)' },
        },
      },
    },
  },
  plugins: [animate],
};
export default config;