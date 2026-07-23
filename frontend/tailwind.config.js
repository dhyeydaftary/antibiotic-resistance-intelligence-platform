/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // --- Existing tokens: untouched, still power Landing/About ---
        paper: '#F7F5F0',
        ink: '#12141A',
        'ink-soft': '#3A3D45',
        'ink-muted': '#5E6068',
        'ink-faint': '#8A8D93',
        teal: '#2C7A6B',
        hairline: '#DFDAD0',
        destructive: '#C1502E',
        success: '#2F6B5A',
        muted: '#EDE9DF',
        'muted-foreground': '#5E6068',
        background: '#F7F5F0',
        foreground: '#12141A',
        primary: '#12141A',
        border: '#DFDAD0',
        input: '#DFDAD0',
        accent: '#2C7A6B',
        ring: '#2C7A6B',

        // --- New tokens: app-zone rebrand only (Home, Predict, History, Trends, Explore, auth) ---
        'app-bg': '#FFFFFF',
        'app-surface': '#F8F9FB',
        'app-ink': '#0F172A',
        'app-ink-soft': '#334155',
        'app-ink-muted': '#64748B',
        'app-ink-faint': '#94A3B8',
        'app-accent': '#5B4FE9',
        'app-accent-soft': '#EEECFD',
        'app-accent-hover': '#4C41D1',
        'app-hairline': '#E5E7EB',
        'app-destructive': '#EF4444',
        'app-success': '#16A34A',
        // Semantic prediction-result colors — reserved, R/S/I only
        resistant: '#EF4444',
        susceptible: '#16A34A',
        intermediate: '#F59E0B',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        serif: ['Fraunces', 'ui-serif', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
        display: ['"General Sans"', 'Inter', 'ui-sans-serif', 'sans-serif'],
      },
    },
  },
  plugins: [],
}