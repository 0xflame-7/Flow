/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/webview/**/*.{ts,tsx,js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--vscode-font-family)", "sans-serif"],
        mono: ["var(--vscode-editor-font-family)", "monospace"],
      },
      colors: {},
      boxShadow: {
        "vscode-widget": "0 4px 12px rgba(0,0,0,0.5)",
        "vscode-menu": "0 4px 8px rgba(0,0,0,0.4)",
      },
    },
  },
  plugins: [],
};
