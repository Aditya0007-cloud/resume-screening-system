import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#17202A",
        panel: "#F7F8FA",
        line: "#D9DEE7",
        accent: "#2563EB",
        mint: "#0F766E",
        warning: "#B45309",
        danger: "#B91C1C"
      }
    },
  },
  plugins: [],
};

export default config;
