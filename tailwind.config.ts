import type { Config } from "tailwindcss";

function rgb(varName: string) {
  return `rgb(var(--${varName}) / <alpha-value>)`;
}

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          app: rgb("bg-app"),
          surface: rgb("bg-surface"),
        },
        border: rgb("border"),
        accent: {
          DEFAULT: rgb("accent"),
          hover: rgb("accent-hover"),
        },
        agent: rgb("agent"),
        text: {
          primary: rgb("text-primary"),
          secondary: rgb("text-secondary"),
        },
        success: rgb("success"),
        warning: rgb("warning"),
        error: rgb("error"),
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
