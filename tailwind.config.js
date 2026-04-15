/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        serif: [
          '"Noto Serif SC"',
          '"Source Han Serif SC"',
          '"Songti SC"',
          "Georgia",
          "serif",
        ],
        handwriting: [
          '"LXGW WenKai Lite"',
          '"Kaiti SC"',
          '"STKaiti"',
          "KaiTi",
          "serif",
        ],
      },
    },
  },
  plugins: [],
};
