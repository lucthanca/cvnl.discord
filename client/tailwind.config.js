/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'theme': {
          'bg': 'var(--bg)',
          'text': 'var(--text)',
          'text-secondary': 'var(--text-secondary)',
          'primary': 'var(--primary)',
          'primary-dark': 'var(--primary-dark)',
          'border': 'var(--border)',
          'nav': 'var(--nav)',
          'input': 'var(--input)',
          'input-field': 'var(--input-field)',
          'message-bg': 'var(--message-bg)',
        }
      },
    },
  },
  plugins: [],
}
