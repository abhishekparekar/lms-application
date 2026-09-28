module.exports = {
  content: ['./src/**/*.{tsx,ts,js,jsx}'],
  darkMode: 'class', // enable dark mode via class
  theme: {
    extend: {
      colors: {
        indigoDark: '#1E1B4B',
        tealBright: '#4F46E5',
        grayLight: '#F3F4F6',
      },
      fontFamily: {
        inter: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
