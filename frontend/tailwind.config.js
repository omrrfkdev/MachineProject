/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        space: {
          dark: '#0B0E17',
          panel: '#151A28',
          card: '#1C2333',
          border: '#2A344B',
          cyan: '#00F0FF',
          blue: '#1E69FF',
          green: '#00FF88',
          red: '#FF3366',
          amber: '#FFB800',
          muted: '#8A99AD'
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'monospace'],
        sans: ['Inter', 'sans-serif']
      },
      boxShadow: {
        'cyan-glow': '0 0 20px rgba(0, 240, 255, 0.25)',
        'red-glow': '0 0 20px rgba(255, 51, 102, 0.35)',
        'green-glow': '0 0 20px rgba(0, 255, 136, 0.25)',
      },
      backgroundImage: {
        'radial-gradient': 'radial-gradient(circle at 50% 0%, rgba(0, 240, 255, 0.08) 0%, transparent 70%)',
      }
    },
  },
  plugins: [],
}
