import React from "react";

const colors = [
  {
    name: "Primary",
    variable: "--color-vscode-primary",
    vscodeVar: "--vscode-button-background",
  },
  {
    name: "Primary Hover",
    variable: "--color-vscode-primary-hover",
    vscodeVar: "--vscode-button-hoverBackground",
  },
  {
    name: "Text",
    variable: "--color-vscode-text",
    vscodeVar: "--vscode-foreground",
  },
  {
    name: "Secondary Text",
    variable: "--color-vscode-secondary",
    vscodeVar: "--vscode-descriptionForeground",
  },
  {
    name: "Background",
    variable: "--color-vscode-background",
    vscodeVar: "--vscode-editor-background",
  },
  {
    name: "Sidebar",
    variable: "--color-vscode-sidebar",
    vscodeVar: "--vscode-sideBar-background",
  },
  {
    name: "Input Background",
    variable: "--color-vscode-input-bg",
    vscodeVar: "--vscode-input-background",
  },
  {
    name: "Input Border",
    variable: "--color-vscode-input",
    vscodeVar: "--vscode-input-border",
  },
  {
    name: "Focus Border",
    variable: "--color-vscode-focus",
    vscodeVar: "--vscode-focusBorder",
  },
  {
    name: "Border",
    variable: "--color-vscode",
    vscodeVar: "--vscode-panel-border",
  },
  {
    name: "Error",
    variable: "--color-vscode-error",
    vscodeVar: "--vscode-errorForeground",
  },
  {
    name: "List Active",
    variable: "--color-vscode-list-active",
    vscodeVar: "--vscode-list-activeSelectionBackground",
  },
  {
    name: "List Hover",
    variable: "--color-vscode-list-hover",
    vscodeVar: "--vscode-list-hoverBackground",
  },
  {
    name: "Activity Bar",
    variable: "--color-vscode-activity-bar",
    vscodeVar: "--vscode-activityBar-background",
  },
  {
    name: "Status Bar",
    variable: "--color-vscode-status-bar",
    vscodeVar: "--vscode-statusBar-background",
  },
  {
    name: "Widget Bg",
    variable: "--color-vscode-widget-bg",
    vscodeVar: "--vscode-editorWidget-background",
  },
  {
    name: "Selection",
    variable: "--color-vscode-selection",
    vscodeVar: "--vscode-editor-selectionBackground",
  },
  {
    name: "Status Bar Debug",
    variable: "--color-vscode-status-bar-debug",
    vscodeVar: "--vscode-statusBar-debuggingBackground",
  },
  {
    name: "Status Bar No Folder",
    variable: "--color-vscode-status-bar-no-folder",
    vscodeVar: "--vscode-statusBar-noFolderBackground",
  },
];

export const ColorBlock: React.FC = () => {
  return (
    <div className="p-4 w-full bg-vscode-background text-vscode font-mono">
      <h2 className="text-lg font-bold mb-4 border-b border-vscode pb-2">
        Theme Colors
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {colors.map((color) => (
          <div
            key={color.variable}
            className="flex flex-col border border-vscode rounded-md overflow-hidden bg-vscode-sidebar"
          >
            {/* Color Preview */}
            <div
              className="h-24 w-full transition-colors"
              style={{ backgroundColor: `var(${color.variable})` }}
            />

            {/* Details */}
            <div className="p-3 text-xs space-y-2">
              <div className="font-bold text-sm">{color.name}</div>

              <div>
                <div className="text-vscode-secondary text-[10px] uppercase tracking-wider mb-0.5">
                  Variable
                </div>
                <code
                  className="bg-vscode-input-bg px-1.5 py-0.5 rounded select-all block truncate"
                  title={color.variable}
                >
                  {color.variable}
                </code>
              </div>

              <div>
                <div className="text-vscode-secondary text-[10px] uppercase tracking-wider mb-0.5">
                  VS Code Map
                </div>
                <code
                  className="bg-vscode-input-bg px-1.5 py-0.5 rounded select-all block truncate text-vscode-secondary"
                  title={color.vscodeVar}
                >
                  var({color.vscodeVar})
                </code>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ColorBlock;
