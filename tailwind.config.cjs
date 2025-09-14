module.exports = {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        void: "#071B26",
        ink: "#0C2A3A",
        snow: "#E6F1FF",
        glow: "#47E7D7",
        card: "#0B1F2C",
        mute: "#93A7B2",
      },
      boxShadow: {
        neon: "0 0 24px rgba(71,231,215,0.35)",
        soft: "0 10px 30px rgba(0,0,0,0.35)",
      },
      backdropBlur: { xs: "2px" },
      animation: {
        float: "float 8s ease-in-out infinite",
        glowpulse: "glowpulse 2.2s ease-in-out infinite",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-6px)" },
        },
        glowpulse: {
          "0%,100%": { boxShadow: "0 0 0 rgba(71,231,215,0.0)" },
          "50%": { boxShadow: "0 0 24px rgba(71,231,215,0.4)" },
        },
      },
    },
  },
  plugins: [],
};
