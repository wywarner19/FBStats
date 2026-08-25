import type { Config } from "tailwindcss";

/**
 * Design tokens lifted directly from the Claude Design prototype
 * (`FBStats Live.dc.html`). Keep these authoritative so components
 * reference semantic names instead of scattering raw hex.
 */
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Backgrounds / surfaces
        ink: "#0f1216", // page base
        panel: "#171b21", // primary card
        "panel-2": "#131720", // rails / sidebars
        "panel-3": "#1e242c", // inset controls
        "panel-4": "#232932", // buttons
        "panel-5": "#1a1e25", // step tiles
        edge: "#2c333d", // hairline border
        "edge-2": "#3a4552", // stronger border
        "edge-3": "#333c48", // control border
        // Text
        cloud: "#e9ecef",
        mist: "#c9d1da",
        slate: "#b9c2cc",
        "slate-2": "#98a1ae",
        dim: "#8f99a6",
        "dim-2": "#6f7883",
        // Accent (turf green) — offense / commit / positive
        turf: "#55c98a",
        "turf-hi": "#7ddba7",
        "turf-ink": "#1a2a1f",
        "turf-edge": "#3b5c47",
        "turf-wash": "#1a1e17",
        "turf-wash-edge": "#3b4630",
        // Warn (flag gold) — penalties / opponent / caution
        flag: "#d8a24a",
        "flag-ink": "#241f14",
        "flag-edge": "#5c4a24",
        // Danger — destructive
        danger: "#e08a8a",
        "danger-ink": "#2a1c1c",
        "danger-edge": "#5c3030",
      },
      fontFamily: {
        barlow: ["Barlow", "system-ui", "sans-serif"],
        cond: ["'Barlow Condensed'", "sans-serif"],
        semi: ["'Barlow Semi Condensed'", "sans-serif"],
      },
      keyframes: {
        fbFade: {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "none" },
        },
        fbPulse: {
          "0%,100%": { opacity: "0.35" },
          "50%": { opacity: "1" },
        },
      },
      animation: {
        fade: "fbFade .22s ease",
        pulse2: "fbPulse 2s infinite",
      },
    },
  },
  plugins: [],
};

export default config;
