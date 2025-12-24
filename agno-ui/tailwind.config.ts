import type { Config } from 'tailwindcss'
import tailwindcssAnimate from 'tailwindcss-animate'

export default {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}'
  ],
  theme: {
    extend: {
      colors: {
        primary: 'var(--primary, #FAFAFA)',
        primaryAccent: '#18181B',
        brand: '#FF4017',
        background: {
          DEFAULT: 'var(--background, #111113)',
          secondary: 'var(--background-secondary, #27272A)'
        },
        secondary: '#f5f5f5',
        border: 'rgba(var(--color-border-default))',
        accent: 'var(--accent, #27272A)',
        muted: 'var(--muted, #A1A1AA)',
        foreground: 'var(--foreground, #FAFAFA)',
        destructive: '#E53935',
        positive: '#22C55E'
      },
      fontFamily: {
        geist: 'var(--font-geist-sans)',
        dmmono: 'var(--font-dm-mono)'
      },
      borderRadius: {
        xl: '10px'
      }
    }
  },
  plugins: [tailwindcssAnimate]
} satisfies Config
