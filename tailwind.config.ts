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
        paper: '#FAF9F7',
        'paper-2': '#F3ECDD',
        ink: '#2F2A24',
        coffee: '#C2A45D',
        petrol: '#2F6F7E',
        olive: '#3E5F4B',
        terracotta: '#6FBF8A',
        border: '#E5DCCB',
        sidebar: '#3E5F4B',
        'fab-green': '#6FBF8A',
        gold: '#C2A45D',
        moss: '#3E5F4B',
        warm: '#FAF9F7',
      },
      fontFamily: {
        serif: ['Playfair Display', 'serif'],
        body: ['Inter', 'sans-serif'],
        numbers: ['Inter', 'sans-serif'],
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
