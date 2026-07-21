/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#F7F5F0',
        ink: '#12141A',
        teal: '#2C7A6B',
        hairline: '#DFDAD0',
        destructive: '#C1502E',
        muted: '#EDE9DF',
        'muted-foreground': '#5E6068',
        background: '#F7F5F0',
        foreground: '#12141A',
        primary: '#12141A',
        border: '#DFDAD0',
        input: '#DFDAD0',
        accent: '#2C7A6B',
        ring: '#2C7A6B',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        serif: ['Fraunces', 'ui-serif', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
    },
  },
  plugins: [],
}
