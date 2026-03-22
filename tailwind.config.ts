import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      /* ── Fonts — match globals.css ── */
      fontFamily: {
        sans: ['Syne', 'system-ui', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
        // Keep Geist as an alias so any existing className="font-geist" doesn't break
        geist: ['Syne', 'system-ui', 'sans-serif'],
      },

      /* ── Colors — must match :root in globals.css exactly ── */
      colors: {
        /* Backgrounds */
        bg: '#0B0E1A',
        bg2: '#0F1320',
        bg3: '#141828',

        /* Primary accent: CYAN (was #6366f1 — changed) */
        ac: '#00F5FF',
        ac2: '#7C6EFF',   /* violet  */
        ac3: '#FF4E6A',   /* rose    */
        ac4: '#00F5A0',   /* green   */
        ac5: '#FFB830',   /* amber   */

        /* Text */
        tx: '#F0F4FF',
        tx2: '#A8B4D0',
        tx3: '#6B7A9E',

        /* Semantic aliases */
        green: '#00F5A0',
        red: '#FF4E6A',
        amber: '#FFB830',
      },

      /* ── Screens ── */
      screens: {
        xs: '375px',
      },

      /* ── Backdrop blur (used by glass surfaces) ── */
      backdropBlur: {
        xs: '4px',
        sm: '8px',
        md: '16px',
        lg: '24px',
        xl: '32px',
      },

      /* ── Border radius — match --r tokens ── */
      borderRadius: {
        sm: '8px',
        md: '12px',   /* var(--r)  */
        lg: '18px',   /* var(--r2) */
        xl: '24px',   /* var(--r3) */
      },

      /* ── Box shadows ── */
      boxShadow: {
        sm: '0 2px 8px rgba(0,0,0,0.32)',
        md: '0 8px 32px rgba(0,0,0,0.45)',
        glow: '0 0 22px rgba(0,245,255,0.22)',
      },
    },
  },
  plugins: [],
}

export default config