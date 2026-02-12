import * as vscode from "vscode";
import { FlowEditorProvider } from "./extension/FlowEditorProvider";
import { defaultDoc } from "./utils/constants";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  console.log('Congratulations, your extension "flow" is now active!');

  const disposable = vscode.commands.registerCommand("flow.helloWorld", () => {
    vscode.window.showInformationMessage("Hello World from Flow!");
  });

  const provider = new FlowEditorProvider(context);
  context.subscriptions.push(
    vscode.window.registerCustomEditorProvider("flow.editor", provider),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("flow.newFile", async () => {
      const uri = await vscode.window.showSaveDialog({
        filters: { "Flow Files": ["flow"] },
        defaultUri: vscode.Uri.file("untitled.flow"),
      });

      if (uri) {
        await vscode.workspace.fs.writeFile(
          uri,
          Buffer.from(JSON.stringify(defaultDoc, null, 2)),
        );
        await vscode.commands.executeCommand(
          "vscode.openWith",
          uri,
          "flow.editor",
        );
      }
    }),
  );

  context.subscriptions.push(disposable);

  if (process.env.FLOW_DEV_RELOAD === "true") {
    const watcher = vscode.workspace.createFileSystemWatcher("**/dist/**/*.js");

    watcher.onDidChange(() => {
      vscode.commands.executeCommand("workbench.action.reloadWindow");
    });

    context.subscriptions.push(watcher);
  }
}

// This method is called when your extension is deactivated
export function deactivate() {}
