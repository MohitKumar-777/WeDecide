import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        ink: '#0b0b0f',
        ink2: '#111118',
        ink3: '#17171f',
        surface: '#1e1e2a',
        surface2: '#252535',
        gold: '#f5d94e',
        gold2: '#e8c520',
        lime: '#aaff47',
        lime2: '#7acc20',
        coral: '#ff6b6b',
        sky: '#5bc8f5',
        sky2: '#2aa8e0',
        purple: '#b66dff',
        pink: '#ff6bdc',
        orange: '#ff8c42',
        teal: '#2dd4bf',
        muted: '#7a7890',
        muted2: '#9996b0',
      },
      fontFamily: {
        display: ['Fraunces', 'serif'],
        body: ['Cabinet Grotesk', 'sans-serif'],
        mono: ['DM Mono', 'monospace'],
      },
      animation: {
        'vote-pulse': 'pulse 0.3s ease-out',
        'score-pop': 'pop 0.5s cubic-bezier(0.34,1.56,0.64,1)',
        'bar-grow': 'grow 0.4s ease-out',
        'fade-in': 'fadeIn 0.35s ease-out forwards',
        'glow-pulse': 'glow-pulse 2s infinite',
      },
      keyframes: {
        pop: {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.15)' },
          '100%': { transform: 'scale(1)' },
        },
        grow: {
          from: { width: '0' },
        },
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'glow-pulse': {
          '0%,100%': { boxShadow: '0 0 0 0 rgba(245,217,78,0.3)' },
          '50%': { boxShadow: '0 0 20px 4px rgba(245,217,78,0.15)' },
        },
      },
    },
  },
  plugins: [],
}

export default config
