import type { Config } from 'tailwindcss';

export default {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        card: 'hsl(var(--card))',
        'card-foreground': 'hsl(var(--card-foreground))',
        popover: 'hsl(var(--popover))',
        'popover-foreground': 'hsl(var(--popover-foreground))',
        primary: 'hsl(var(--primary))',
        'primary-foreground': 'hsl(var(--primary-foreground))',
        secondary: 'hsl(var(--secondary))',
        'secondary-foreground': 'hsl(var(--secondary-foreground))',
        muted: 'hsl(var(--muted))',
        'muted-foreground': 'hsl(var(--muted-foreground))',
        accent: 'hsl(var(--accent))',
        'accent-foreground': 'hsl(var(--accent-foreground))',
        destructive: 'hsl(var(--destructive))',
        'destructive-foreground': 'hsl(var(--destructive-foreground))',
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',

        // RGB-based primary
        primaryRgb: {
          50: 'rgb(var(--tw-color-primary-50) / <alpha-value>)',
          100: 'rgb(var(--tw-color-primary-100) / <alpha-value>)',
          200: 'rgb(var(--tw-color-primary-200) / <alpha-value>)',
          300: 'rgb(var(--tw-color-primary-300) / <alpha-value>)',
          400: 'rgb(var(--tw-color-primary-400) / <alpha-value>)',
          500: 'rgb(var(--tw-color-primary-500) / <alpha-value>)',
          600: 'rgb(var(--tw-color-primary-600) / <alpha-value>)',
          700: 'rgb(var(--tw-color-primary-700) / <alpha-value>)',
          800: 'rgb(var(--tw-color-primary-800) / <alpha-value>)',
          900: 'rgb(var(--tw-color-primary-900) / <alpha-value>)',
          950: 'rgb(var(--tw-color-primary-950) / <alpha-value>)',
        },
        lush: {
          50: 'rgb(var(--tw-color-lush-50) / <alpha-value>)',
          100: 'rgb(var(--tw-color-lush-100) / <alpha-value>)',
          200: 'rgb(var(--tw-color-lush-200) / <alpha-value>)',
          300: 'rgb(var(--tw-color-lush-300) / <alpha-value>)',
          400: 'rgb(var(--tw-color-lush-400) / <alpha-value>)',
          500: 'rgb(var(--tw-color-lush-500) / <alpha-value>)',
          600: 'rgb(var(--tw-color-lush-600) / <alpha-value>)',
          700: 'rgb(var(--tw-color-lush-700) / <alpha-value>)',
          800: 'rgb(var(--tw-color-lush-800) / <alpha-value>)',
          900: 'rgb(var(--tw-color-lush-900) / <alpha-value>)',
          950: 'rgb(var(--tw-color-lush-950) / <alpha-value>)',
        },
        breeze: {
          50: 'rgb(var(--tw-color-breeze-50) / <alpha-value>)',
          100: 'rgb(var(--tw-color-breeze-100) / <alpha-value>)',
          200: 'rgb(var(--tw-color-breeze-200) / <alpha-value>)',
          300: 'rgb(var(--tw-color-breeze-300) / <alpha-value>)',
          400: 'rgb(var(--tw-color-breeze-400) / <alpha-value>)',
          500: 'rgb(var(--tw-color-breeze-500) / <alpha-value>)',
          600: 'rgb(var(--tw-color-breeze-600) / <alpha-value>)',
          700: 'rgb(var(--tw-color-breeze-700) / <alpha-value>)',
          800: 'rgb(var(--tw-color-breeze-800) / <alpha-value>)',
          900: 'rgb(var(--tw-color-breeze-900) / <alpha-value>)',
          950: 'rgb(var(--tw-color-breeze-950) / <alpha-value>)',
        },
        nebula: {
          50: 'rgb(var(--tw-color-nebula-50) / <alpha-value>)',
          100: 'rgb(var(--tw-color-nebula-100) / <alpha-value>)',
          200: 'rgb(var(--tw-color-nebula-200) / <alpha-value>)',
          300: 'rgb(var(--tw-color-nebula-300) / <alpha-value>)',
          400: 'rgb(var(--tw-color-nebula-400) / <alpha-value>)',
          500: 'rgb(var(--tw-color-nebula-500) / <alpha-value>)',
          600: 'rgb(var(--tw-color-nebula-600) / <alpha-value>)',
          700: 'rgb(var(--tw-color-nebula-700) / <alpha-value>)',
          800: 'rgb(var(--tw-color-nebula-800) / <alpha-value>)',
          900: 'rgb(var(--tw-color-nebula-900) / <alpha-value>)',
          950: 'rgb(var(--tw-color-nebula-950) / <alpha-value>)',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
      },
      keyframes: {
        flicker: {
          '0%, 19.999%, 22%, 62.999%, 64%, 64.999%, 70%, 100%': {
            opacity: '0.99',
            filter:
              'drop-shadow(0 0 1px rgba(252, 211, 77)) drop-shadow(0 0 15px rgba(245, 158, 11)) drop-shadow(0 0 1px rgba(252, 211, 77))',
          },
          '20%, 21.999%, 63%, 63.999%, 65%, 69.999%': {
            opacity: '0.4',
            filter: 'none',
          },
        },
        shimmer: {
          '0%': {
            backgroundPosition: '-700px 0',
          },
          '100%': {
            backgroundPosition: '700px 0',
          },
        },
      },
      animation: {
        flicker: 'flicker 3s linear infinite',
        shimmer: 'shimmer 1.3s linear infinite',
      },
    },
  },
  plugins: [],
} satisfies Config;
