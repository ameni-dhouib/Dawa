import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: "#14243B", soft: "#4A5A70", faint: "#8A97A8" },
        paper: "#F4F6F7",
        line: "#DDE3E8",
        cross: { DEFAULT: "#0B7A55", dark: "#08603F", soft: "#E3F2EA" },
        wait: { DEFAULT: "#9A6310", soft: "#FBF1DC" },
        alert: { DEFAULT: "#B42318", soft: "#FDECEA" },
      },
      fontFamily: {
        sans: ["'Schibsted Grotesk'", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
