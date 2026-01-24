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
        paper: '#F4EFE6',
        'paper-2': '#EFE7DA',
        ink: '#2E2A24',
        coffee: '#5A4633',
        petrol: '#3A5A6A',
        olive: '#7A8F6B',
        terracotta: '#B5654D',
        border: '#D9CFBF',
        sidebar: '#3E5F4B',
        'fab-green': '#6F8B5A',
      },
      fontFamily: {
        serif: ['Playfair Display', 'serif'],
        body: ['Lora', 'serif'],
        numbers: ['Source Serif 4', 'serif'],
      },
      boxShadow: {
        soft: '0 8px 18px rgba(46,42,36,.10)',
        vintage: '0 10px 30px rgba(46,42,36,.12)',
      },
      borderRadius: {
        vintage: '18px',
      },
    },
  },
  plugins: [],
}
export default config
