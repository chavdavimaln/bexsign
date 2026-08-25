/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#E71414",
        bexPrimary: "#E71414",
        bexText: "#000000",
      },
    },
  },
  plugins: [],
};
