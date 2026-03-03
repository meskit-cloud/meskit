import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          app: "#F3F7FC",
          surface: "#FFFFFF",
        },
        border: "#D6E0EA",
        accent: {
          DEFAULT: "#0F6FF2",
          hover: "#0A58C7",
        },
        agent: "#7C3AED",
        text: {
          primary: "#0F172A",
          secondary: "#334155",
        },
        success: "#15803D",
        warning: "#B45309",
        error: "#B91C1C",
      },
      fontFamily: {
        ui: ["var(--font-ui)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
