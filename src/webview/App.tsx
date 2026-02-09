export default function App() {
  if (!document) {
    return (
      <div className="flex items-center justify-center w-full h-full p-5">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-vscode-background text-vscode p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-vscode">
            Flow Editor - Tailwind CSS + VSCode
          </h1>
          <p className="text-vscode-secondary">
            A modern terminal experience with Tailwind CSS integration
          </p>
        </div>

        {/* Card Demo */}
        <div className="border border-vscode rounded-lg p-6 space-y-4">
          <h2 className="text-xl font-semibold">VSCode Theme Integration</h2>
          <p className="text-vscode-secondary">
            All colors automatically adapt to your VSCode theme (light/dark
            mode)
          </p>

          {/* Button Group */}
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={() => console.log("Primary action clicked!")}
              className="px-4 py-2 bg-vscode-primary hover:bg-vscode-primary-hover text-white rounded transition-colors"
            >
              Primary Action
            </button>
            <button
              onClick={() => console.log("Secondary action clicked!")}
              className="px-4 py-2 border border-vscode-input hover:bg-vscode-sidebar rounded transition-colors"
            >
              Secondary Action
            </button>
            <button
              onClick={() => console.log("Tertiary action clicked!")}
              className="px-4 py-2 border border-vscode rounded hover:border-vscode-focus transition-colors"
            >
              Tertiary Action
            </button>

            <button className="px-4 py-2 bg-red-500 hover:bg-amber-500 text-white rounded transition-colors">
              Primary Action
            </button>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border border-vscode rounded-lg p-4 hover:bg-vscode-sidebar transition-colors">
            <h3 className="font-semibold mb-2">🎨 Theme Aware</h3>
            <p className="text-sm text-vscode-secondary">
              Automatically adapts to VSCode's current theme
            </p>
          </div>

          <div className="border border-vscode rounded-lg p-4 hover:bg-vscode-sidebar transition-colors">
            <h3 className="font-semibold mb-2">⚡ Tailwind CSS</h3>
            <p className="text-sm text-vscode-secondary">
              Utility-first CSS framework for rapid development
            </p>
          </div>

          <div className="border border-vscode rounded-lg p-4 hover:bg-vscode-sidebar transition-colors">
            <h3 className="font-semibold mb-2">🚀 Fast</h3>
            <p className="text-sm text-vscode-secondary">
              Optimized build with esbuild and Tailwind CLI
            </p>
          </div>

          <div className="border border-vscode rounded-lg p-4 hover:bg-vscode-sidebar transition-colors">
            <h3 className="font-semibold mb-2">📦 Minimal</h3>
            <p className="text-sm text-vscode-secondary">
              Only the CSS classes you use are included
            </p>
          </div>
        </div>

        {/* Input Demo */}
        <div className="border border-vscode rounded-lg p-6 space-y-4">
          <h3 className="font-semibold">Input Components</h3>
          <input
            type="text"
            placeholder="Enter a command..."
            className="w-full px-3 py-2 bg-vscode-input-bg border border-vscode-input rounded focus:outline-none focus:border-vscode-focus transition-colors"
          />
          <textarea
            placeholder="Multi-line input..."
            rows={3}
            className="w-full px-3 py-2 bg-vscode-input-bg border border-vscode-input rounded focus:outline-none focus:border-vscode-focus resize-none transition-colors"
          />
        </div>

        {/* Info Box */}
        <div className="border-l-4 border-vscode-focus bg-vscode-sidebar p-4 rounded">
          <p className="font-semibold mb-1">✨ Custom Utilities</p>
          <p className="text-sm text-vscode-secondary">
            Use classes like{" "}
            <code className="px-1 py-0.5 bg-vscode-background rounded text-xs">
              bg-vscode-primary
            </code>
            ,{" "}
            <code className="px-1 py-0.5 bg-vscode-background rounded text-xs">
              text-vscode
            </code>
            ,{" "}
            <code className="px-1 py-0.5 bg-vscode-background rounded text-xs">
              border-vscode
            </code>{" "}
            to keep your UI consistent with VSCode's theme.
          </p>
        </div>
      </div>
    </div>
  );
}
