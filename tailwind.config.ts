import type { Config } from "tailwindcss";

/**
 * Design tokens lifted from the Claude Design prototype (`FBStats Live.dc.html`).
 * Each token is a CSS variable (space-separated RGB channels) so the whole
 * palette can be swapped between dark (default `:root`) and light
 * (`:root[data-theme="light"]`) themes — see app/globals.css. Keep these
 * semantic names authoritative so components never scatter raw hex.
 */
const c = (v: string) => `rgb(var(${v}) / <alpha-value>)`;

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
        ink: c("--c-ink"), // page base
        panel: c("--c-panel"), // primary card
        "panel-2": c("--c-panel-2"), // rails / sidebars
        "panel-3": c("--c-panel-3"), // inset controls
        "panel-4": c("--c-panel-4"), // buttons
        "panel-5": c("--c-panel-5"), // step tiles
        edge: c("--c-edge"), // hairline border
        "edge-2": c("--c-edge-2"), // stronger border
        "edge-3": c("--c-edge-3"), // control border
        // Text
        cloud: c("--c-cloud"),
        mist: c("--c-mist"),
        slate: c("--c-slate"),
        "slate-2": c("--c-slate-2"),
        dim: c("--c-dim"),
        "dim-2": c("--c-dim-2"),
        // Text/icon that sits ON a saturated accent fill (turf/flag/danger).
        // Flips with the theme because the accent shade itself flips.
        onaccent: c("--c-onaccent"),
        // Accent (turf green) — offense / commit / positive
        turf: c("--c-turf"),
        "turf-hi": c("--c-turf-hi"),
        "turf-ink": c("--c-turf-ink"),
        "turf-edge": c("--c-turf-edge"),
        "turf-wash": c("--c-turf-wash"),
        "turf-wash-edge": c("--c-turf-wash-edge"),
        // Warn (flag gold) — penalties / opponent / caution
        flag: c("--c-flag"),
        "flag-ink": c("--c-flag-ink"),
        "flag-edge": c("--c-flag-edge"),
        // Danger — destructive
        danger: c("--c-danger"),
        "danger-ink": c("--c-danger-ink"),
        "danger-edge": c("--c-danger-edge"),
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
