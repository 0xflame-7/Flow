/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/webview/**/*.{ts,tsx,js,jsx}"],
  theme: {
    extend: {
      colors: {
        vscode: {
          primary: "var(--vscode-button-background)",
          "primary-hover": "var(--vscode-button-hoverBackground)",
          text: "var(--vscode-foreground)",
          secondary: "var(--vscode-descriptionForeground)",
          background: "var(--vscode-editor-background)",
          sidebar: "var(--vscode-sideBar-background)",
          "input-bg": "var(--vscode-input-background)",
          "input-border": "var(--vscode-input-border)",
          focus: "var(--vscode-focusBorder)",
          border: "var(--vscode-panel-border)",
        },
      },
    },
  },
  plugins: [],
};
