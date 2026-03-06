/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        deal: {
          yes: '#22c55e',
          nope: '#ef4444',
          maybe: '#f59e0b',
        },
      },
    },
  },
  plugins: [],
};
