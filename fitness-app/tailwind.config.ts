import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // TD Fitness Brand Colors (AAA Compliant)
        'td-blue-display': '#0EA5E9',
        'td-blue-text': '#0369A1',
        'td-blue-dark': '#0B1220',
        'td-text-primary': '#0F172A',
        'td-text-secondary': '#475569',
        'td-bg-white': '#FFFFFF',
        'td-bg-secondary': '#F8FAFC',
        'td-cta-orange': '#C2410C',
        'td-success-green': '#15803D',
        'td-error-red': '#B91C1C',
      },
      fontFamily: {
        'headings': ['Oswald', 'Impact', 'Arial Black', 'sans-serif'],
        'body': ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic": "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
    },
  },
  plugins: [],
};

export default config;
