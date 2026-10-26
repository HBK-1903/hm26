/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Tema tokenları: CSS var üzerinden — yön A "Spor Gazetesi" varsayılan (m26-light), m26-dark korunur
        base: 'var(--c-base)',
        surface: 'var(--c-surface)',
        elevated: 'var(--c-elevated)',
        line: 'var(--c-line)',
        primary: 'var(--c-primary)',
        secondary: 'var(--c-secondary)',
        muted: 'var(--c-muted)',
        amber: 'var(--c-accent)',
        ok: 'var(--c-ok)',
        warn: 'var(--c-warn)',
        danger: 'var(--c-danger)',
        info: 'var(--c-info)',
        special: 'var(--c-special)',
      },
      fontFamily: {
        display: ['Georgia', 'Times New Roman', 'serif'],
        body: ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        data: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      borderRadius: { card: '16px' },
      minHeight: { touch: '44px' },
      minWidth: { touch: '44px' },
    },
  },
  plugins: [],
};
