import * as vscode from "vscode";
import { defaultDoc } from "./utils/constants";
import { FlowEditorProvider } from "./extension/providers/FlowEditorProvider";

/**
 * Extension activation entry point
 * Registers the custom editor provider and commands
 */
export function activate(context: vscode.ExtensionContext) {
  console.log("Flow extension activated");

  // Register hello world command for testing
  const helloCommand = vscode.commands.registerCommand(
    "flow.helloWorld",
    () => {
      vscode.window.showInformationMessage("Hello World from Flow!");
    },
  );

  // Register the custom editor provider for .flow files
  const provider = new FlowEditorProvider(context);
  const editorProvider = vscode.window.registerCustomEditorProvider(
    "flow.editor",
    provider,
  );

  // Register command to create new .flow file
  const newFileCommand = vscode.commands.registerCommand(
    "flow.newFile",
    async () => {
      const uri = await vscode.window.showSaveDialog({
        filters: { "Flow Files": ["flow"] },
        defaultUri: vscode.Uri.file("untitled.flow"),
      });

      if (uri) {
        // Write default document structure
        await vscode.workspace.fs.writeFile(
          uri,
          Buffer.from(JSON.stringify(defaultDoc, null, 2)),
        );
        // Open with Flow editor
        await vscode.commands.executeCommand(
          "vscode.openWith",
          uri,
          "flow.editor",
        );
      }
    },
  );

  // Add all disposables to subscriptions
  context.subscriptions.push(helloCommand, editorProvider, newFileCommand);

  // Development: Auto-reload on file changes
  if (process.env.FLOW_DEV_RELOAD === "true") {
    const watcher = vscode.workspace.createFileSystemWatcher("**/dist/**/*.js");
    watcher.onDidChange(() => {
      vscode.commands.executeCommand("workbench.action.reloadWindow");
    });
    context.subscriptions.push(watcher);
  }
}

export function deactivate() {
  // Cleanup handled by disposables
}
