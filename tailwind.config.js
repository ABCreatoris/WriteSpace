/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        songti: [
          '"Noto Serif SC"',
          '"Source Han Serif SC"',
          '"Songti SC"',
          '"STSong"',
          "Georgia",
          "serif",
        ],
        kaiti: [
          '"LXGW WenKai Lite"',
          '"Kaiti SC"',
          '"STKaiti"',
          "KaiTi",
          "serif",
        ],
        xinwei: [
          '"STXinwei"',
          '"HanziPen SC"',
          '"DFKai-SB"',
          '"LXGW WenKai Lite"',
          '"Kaiti SC"',
          "serif",
        ],
      },
    },
  },
  plugins: [],
};
