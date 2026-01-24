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
        // 日系設計系統色彩
        'mist-blue': '#7B9FA6',
        'warm-wood': '#D4A574',
        'soft-pink': '#F5E6E8',
        'soft-green': '#E8F3E8',
        'soft-yellow': '#FFF8E7',
        background: '#FAFAF8',
        foreground: '#3A3A3A',
        'muted-foreground': '#6B6B6B',
        card: '#ffffff',
        destructive: '#d4183d',
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.25rem',
        '3xl': '1.5rem',
      },
    },
  },
  plugins: [],
};

export default config;
