/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        cream: '#F7F4EF',
        surface: '#FFFFFF',
        'text-primary': '#1A1714',
        'text-muted': '#6B6560',
        terracotta: '#9B3B1F',
        'ai-bubble': '#EDEAE4',
        divider: '#E8E4DE',
        'status-green': '#2D7A4F',
        'status-amber': '#B87B2A',
      },
    },
  },
  plugins: [],
};
