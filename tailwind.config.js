/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'Plus Jakarta Sans', 'Saira', 'sans-serif'],
        display: ['"Space Grotesk"', '"Plus Jakarta Sans"', 'sans-serif'],
        heading: ['"Plus Jakarta Sans"', 'Rajdhani', 'sans-serif'],
        condensed: ['"Saira Condensed"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
        vanguard: ['"Chakra Petch"', '"Orbitron"', '"Russo One"', 'sans-serif'],
      },
      colors: {
        surface: {
          0: '#000000',
          1: '#070b10',
          2: '#0a0f15',
          3: '#0e141c',
          4: '#131b26',
          panel: 'rgba(10, 15, 21, 0.88)',
          border: 'rgba(255, 255, 255, 0.08)',
          technical: 'rgba(56, 189, 248, 0.22)',
        },
        tactical: {
          cyan: '#06b6d4',
          sky: '#38bdf8',
          steel: '#64748b',
          dim: '#475569',
          amber: '#f59e0b',
          red: '#ef4444',
          emerald: '#10b981',
          gold: '#eab308',
          olive: '#33401c',
          forest: '#526a27',
          lime: '#a4c639',
        }
      },
      boxShadow: {
        'tactical': '0 4px 20px -2px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.05)',
        'tactical-focus': '0 0 0 1px rgba(56, 189, 248, 0.4), 0 8px 32px rgba(0, 0, 0, 0.8)',
        'hud-glow': '0 0 15px rgba(6, 182, 212, 0.15)',
        'threat-red': '0 0 20px rgba(239, 68, 68, 0.25)',
      },
      animation: {
        'sweep': 'sweep 4s linear infinite',
        'pulse-subtle': 'pulseSubtle 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'reticle-spin': 'spin 12s linear infinite',
      },
      keyframes: {
        sweep: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        }
      }
    },
  },
  plugins: [],
};

