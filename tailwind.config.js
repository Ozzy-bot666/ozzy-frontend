/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Apple-like grays with metallic feel
        'ozzy-black': '#0a0a0a',
        'ozzy-dark': '#1a1a1a',
        'ozzy-gray': '#2a2a2a',
        'ozzy-silver': '#8a8a8a',
        // Hardrock accents
        'ozzy-red': '#dc2626',
        'ozzy-orange': '#ea580c',
        'ozzy-purple': '#7c3aed',
        // Status colors
        'ozzy-green': '#22c55e',
        'ozzy-blue': '#3b82f6',
      },
      fontFamily: {
        'display': ['SF Pro Display', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        'metal': ['Impact', 'Haettenschweiler', 'Arial Narrow Bold', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'wave': 'wave 1.5s ease-in-out infinite',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 20px rgba(220, 38, 38, 0.3)' },
          '100%': { boxShadow: '0 0 40px rgba(220, 38, 38, 0.6)' },
        },
        wave: {
          '0%, 100%': { transform: 'scaleY(1)' },
          '50%': { transform: 'scaleY(1.5)' },
        },
      },
    },
  },
  plugins: [],
}
