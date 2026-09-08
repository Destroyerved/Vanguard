/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        tactical: {
          bg: '#05080c',
          panel: '#090e15',
          'panel-border': 'rgba(30, 58, 82, 0.6)',
          'panel-header': '#0d1520',
          cyan: '#00f0ff',
          'cyan-dim': 'rgba(0, 240, 255, 0.15)',
          amber: '#ffaa00',
          'amber-dim': 'rgba(255, 170, 0, 0.15)',
          green: '#00ff66',
          'green-dim': 'rgba(0, 255, 102, 0.15)',
          red: '#ff2a4b',
          'red-dim': 'rgba(255, 42, 75, 0.2)',
          orange: '#ff6600',
          text: '#c9d8e6',
          muted: '#627d98',
        }
      },
      fontFamily: {
        galaxy: ['"Cinzel Decorative"', '"Syne"', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', '"Share Tech Mono"', '"Fira Code"', 'Consolas', 'monospace'],
        display: ['"Chakra Petch"', '"Orbitron"', 'system-ui', 'sans-serif'],
      },
      animation: {
        'radar-sweep': 'radarSweep 4s linear infinite',
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'scanline': 'scanline 8s linear infinite',
        'glow-cyan': 'glowCyan 2s ease-in-out infinite alternate',
        'glow-red': 'glowRed 1.5s ease-in-out infinite alternate',
        'glitch': 'glitch 0.3s ease-in-out infinite',
      },
      keyframes: {
        radarSweep: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(1000%)' },
        },
        glowCyan: {
          '0%': { filter: 'drop-shadow(0 0 2px rgba(0, 240, 255, 0.4))' },
          '100%': { filter: 'drop-shadow(0 0 10px rgba(0, 240, 255, 0.9))' },
        },
        glowRed: {
          '0%': { filter: 'drop-shadow(0 0 3px rgba(255, 42, 75, 0.5))' },
          '100%': { filter: 'drop-shadow(0 0 14px rgba(255, 42, 75, 1))' },
        }
      },
      boxShadow: {
        'tactical-cyan': '0 0 20px rgba(0, 240, 255, 0.25), inset 0 0 15px rgba(0, 240, 255, 0.1)',
        'tactical-red': '0 0 25px rgba(255, 42, 75, 0.35), inset 0 0 20px rgba(255, 42, 75, 0.15)',
        'tactical-amber': '0 0 20px rgba(255, 170, 0, 0.25), inset 0 0 15px rgba(255, 170, 0, 0.1)',
      }
    },
  },
  plugins: [],
}
