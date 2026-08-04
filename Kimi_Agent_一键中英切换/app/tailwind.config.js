/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // shadcn-compatible keys, mapped to the CBB ink palette (design.md §4)
        border: "rgba(237,235,227,0.09)",
        input: "rgba(237,235,227,0.09)",
        ring: "#C9F24B",
        background: "#07090D",
        foreground: "#EDEBE3",
        primary: { DEFAULT: "#C9F24B", foreground: "#07090D" },
        secondary: { DEFAULT: "#151C2B", foreground: "#EDEBE3" },
        destructive: { DEFAULT: "#FF5B45", foreground: "#EDEBE3" },
        muted: { DEFAULT: "#101623", foreground: "#8E97A8" },
        accent: { DEFAULT: "#151C2B", foreground: "#EDEBE3" },
        popover: { DEFAULT: "#0C1017", foreground: "#EDEBE3" },
        card: { DEFAULT: "#151C2B", foreground: "#EDEBE3" },
        // CBB design tokens
        ink: {
          950: "#07090D",
          900: "#0C1017",
          850: "#101623",
          800: "#151C2B",
          700: "#222C40",
        },
        line: {
          DEFAULT: "rgba(237,235,227,0.09)",
          strong: "rgba(237,235,227,0.18)",
        },
        text: "#EDEBE3",
        "text-muted": "#8E97A8",
        faint: "#5A6376",
        volt: {
          DEFAULT: "#C9F24B",
          dim: "rgba(201,242,75,0.12)",
        },
        lithium: "#5ADFC3",
        signal: "#FF5B45",
        amber: "#F0A832",
        paper: {
          DEFAULT: "#F4F0E6",
          2: "#EAE4D5",
          ink: "#16181D",
          muted: "#6B6558",
        },
      },
      fontFamily: {
        display: ['Fraunces', 'Noto Serif SC', 'serif'],
        serif: ['Newsreader', 'Noto Serif SC', 'serif'],
        sans: ['Inter', 'Noto Sans SC', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'Noto Sans SC', 'monospace'],
      },
      borderRadius: {
        xl: "4px",
        lg: "4px",
        md: "3px",
        sm: "2px",
        xs: "2px",
        DEFAULT: "2px",
      },
      maxWidth: {
        container: "1280px",
        reader: "760px",
      },
      transitionTimingFunction: {
        "out-expo": "cubic-bezier(0.16,1,0.3,1)",
        "io": "cubic-bezier(0.65,0,0.35,1)",
      },
      boxShadow: {
        xs: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
        "volt-pop": "4px 4px 0 rgba(201,242,75,0.28)",
        "paper-hard": "12px 12px 0 rgba(0,0,0,0.45)",
        "paper-pop": "4px 4px 0 rgba(22,24,29,0.2)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "caret-blink": {
          "0%,70%,100%": { opacity: "1" },
          "20%,50%": { opacity: "0" },
        },
        marquee: {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(-50%)" },
        },
        "pulse-dot": {
          "0%,100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.35", transform: "scale(0.8)" },
        },
        "scroll-cue": {
          "0%": { transform: "scaleY(0)", transformOrigin: "top" },
          "45%": { transform: "scaleY(1)", transformOrigin: "top" },
          "55%": { transform: "scaleY(1)", transformOrigin: "bottom" },
          "100%": { transform: "scaleY(0)", transformOrigin: "bottom" },
        },
        "breathe": {
          "0%,100%": { opacity: "0.5" },
          "50%": { opacity: "0.8" },
        },
        "node-pulse": {
          "0%": { transform: "scale(1)", opacity: "1" },
          "100%": { transform: "scale(1.6)", opacity: "0.2" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "caret-blink": "caret-blink 1.25s ease-out infinite",
        marquee: "marquee 45s linear infinite",
        "pulse-dot": "pulse-dot 2s ease-in-out infinite",
        "scroll-cue": "scroll-cue 1.8s ease-in-out infinite",
        breathe: "breathe 4s ease-in-out infinite",
        "node-pulse": "node-pulse 2s ease-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
