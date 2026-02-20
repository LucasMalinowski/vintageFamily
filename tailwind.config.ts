import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: '#FAF9F7',
        paper: '#f5f1eb',
        'paper-2': '#f5f1eb',
        ink: '#2F3B33',
        coffee: '#3E5F4B',
        petrol: '#2F6F7E',
        olive: '#6FBF8A',
        terracotta: '#C2A45D',
        border: '#E4D7C2',
        sidebar: 'rgb(var(--sidebar-rgb) / <alpha-value>)',
        gold: '#C2A45D',
        lightGray: '#b4b4b4',
        fabGreen: '#6FBF8A',
      },
      fontFamily: {
        serif: ['Playfair Display', 'serif'],
        body: ['Inter', 'sans-serif'],
        numbers: ['Inter', 'sans-serif'],
        ptSerif: ['PT Serif', 'serif'],
      },
      boxShadow: {
        soft: '0 8px 18px rgba(47,59,51,.08)',
        vintage: '0 14px 32px rgba(47,59,51,.12)',
      },
      borderRadius: {
        vintage: '18px',
      },
    },
  },
  plugins: [],
}
export default config
