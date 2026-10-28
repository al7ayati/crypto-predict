/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          950: "#081632",
          900: "#0b1b3b",
          800: "#102451",
        },
        signal: {
          green: "#0ba77b",
          red: "#df5365",
        },
      },
    },
  },
  plugins: [],
};
