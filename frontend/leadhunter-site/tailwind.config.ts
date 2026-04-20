import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: '#0a0a0a',        // Той самий м'який чорний
        terminal: '#FFFFFF',    // Білий акцент
        'white/10': 'rgba(238, 235, 235, 0.45)',
      },
      keyframes: {
        dash: {
          to: { strokeDashoffset: '1000' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
      },
      animation: {
        dash: 'dash 5s linear infinite',
        fadeIn: 'fadeIn 1s ease-in forwards',
      },
    },
  },
  plugins: [],
};

export default config;