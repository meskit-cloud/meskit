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
          app: "#0B0F1A",
          surface: "#141926",
        },
        border: "#1E2738",
        accent: {
          DEFAULT: "#3B8BFF",
          hover: "#5DA3FF",
        },
        agent: "#9F67FF",
        text: {
          primary: "#E2E8F0",
          secondary: "#94A3B8",
        },
        success: "#22C55E",
        warning: "#F59E0B",
        error: "#EF4444",
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
