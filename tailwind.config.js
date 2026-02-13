/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/webview/**/*.{ts,tsx,js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--vscode-font-family)", "sans-serif"],
        mono: ["var(--vscode-editor-font-family)", "monospace"],
      },
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
          "list-hover": "var(--vscode-list-hoverBackground)",
          "menu-bg": "var(--vscode-menu-background)",
          "menu-border": "var(--vscode-menu-border)",
          "menu-selection-bg": "var(--vscode-menu-selectionBackground)",
          "menu-selection-fg": "var(--vscode-menu-selectionForeground)",
          "terminal-bg":
            "var(--vscode-terminal-background, var(--vscode-editor-background))",
          "terminal-fg": "var(--vscode-terminal-foreground, #cccccc)",
          "ansi-green": "var(--vscode-terminal-ansiGreen, #22c55e)",
          "ansi-red": "var(--vscode-terminal-ansiRed, #ef4444)",
          error: "var(--vscode-errorForeground, #ef4444)",
        },
      },
    },
  },
  plugins: [],
};
