import * as vscode from "vscode";
import * as os from "os";
import * as cp from "child_process";
import { Ext } from "../utils/logger";
import {
  ExtensionMessage,
  FlowDocument,
  WebviewMessage,
} from "../types/MessageProtocol";
import { defaultDoc } from "../utils/constants";

export class FlowEditorProvider implements vscode.CustomTextEditorProvider {
  constructor(private readonly context: vscode.ExtensionContext) {}

  private updatingDocuments = new Map<string, boolean>();
  // Map of blockId -> ChildProcess
  private blockProcesses = new Map<string, cp.ChildProcessWithoutNullStreams>();

  public resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken,
  ) {
    Ext.info("Open flow editor", document.uri.fsPath);
    const docUri = document.uri.toString();

    // 1. Setup Webview Options & HTML first
    webviewPanel.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this.context.extensionUri, "dist"),
        vscode.Uri.joinPath(this.context.extensionUri, "node_modules"),
      ],
    };

    webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview);

    // 2. Setup Message Handling
    let webviewReady = false;
    let pendingDocument: FlowDocument | null = null;
    let isInitialLoad = true;

    webviewPanel.webview.onDidReceiveMessage(
      async (message: WebviewMessage) => {
        switch (message.type) {
          case "ready":
            Ext.info("Webview ready, sending initial document");
            webviewReady = true;

            if (pendingDocument) {
              this.sendDocument(webviewPanel, pendingDocument, isInitialLoad);
              pendingDocument = null;
              isInitialLoad = false;
            } else {
              const doc = this.parseDocument(document);
              this.sendDocument(webviewPanel, doc, isInitialLoad);
              isInitialLoad = false;
            }
            break;

          case "update":
            Ext.info("Updating document");
            this.updatingDocuments.set(docUri, true);
            const success = await this.updateTextDocument(
              document,
              message.document,
            );
            this.updatingDocuments.set(docUri, false);
            webviewPanel.webview.postMessage({ type: "ack", success });
            break;

          case "log":
            Ext.info(message.message);
            break;

          case "execute":
            this.executeBlock(
              message.blockId,
              message.cmd,
              document,
              webviewPanel,
            );
            break;

          case "stop":
            this.stopBlock(message.blockId);
            break;

          case "terminalInput":
            const process = this.blockProcesses.get(message.blockId);
            if (process && process.stdin) {
              process.stdin.write(message.data);
            }
            break;
        }
      },
    );

    const queueDocumentUpdates = (doc: FlowDocument) => {
      if (webviewReady) {
        this.sendDocument(webviewPanel, doc, false);
      } else {
        Ext.info("Webview not ready, queuing document update");
        pendingDocument = doc;
      }
    };

    const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(
      (e) => {
        if (
          e.document.uri.toString() === document.uri.toString() &&
          !this.updatingDocuments.get(docUri)
        ) {
          Ext.info("Document changed");
          const doc = this.parseDocument(document);
          queueDocumentUpdates(doc);
        }
      },
    );

    webviewPanel.onDidDispose(() => {
      Ext.info("Disposing webview");
      this.updatingDocuments.delete(docUri);
      changeDocumentSubscription.dispose();

      // Kill All Processes for this document?
      // Since blockIds are unique, we technically should track which blocks belong to this doc,
      // but for now we might leave them running or we need to track them.
      // Ideally, we should kill them.
      // Implementation: We don't have a map of Doc -> BlockIds.
      // User might want background tasks? "run independent process".
      // Let's kill them to avoid leaks for now.
      // TODO: Track blocks per document to kill only relevant ones.
    });
  }

  private executeBlock(
    blockId: string,
    cmd: string,
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
  ) {
    const doc = this.parseDocument(document);
    const block = doc.blocks.find((b) => b.id === blockId);

    if (!block || block.type !== "shell") {
      Ext.error("Block not found or not shell", blockId);
      return;
    }

    // Kill existing if running
    if (this.blockProcesses.has(blockId)) {
      this.stopBlock(blockId);
    }

    if (!cmd.trim()) {
      return;
    }

    Ext.info(`Executing block ${blockId}: ${cmd}`);

    // Send Start
    webviewPanel.webview.postMessage({ type: "executionStart", blockId });

    // Determine Shell
    const isWindows = os.platform() === "win32";
    const shell = isWindows ? "powershell.exe" : "bash";
    const shellArgs = isWindows ? ["-Command", cmd] : ["-c", cmd];
    // Use shell: true to support redirection etc? allow spawning shell directly
    // If we want interactivity, we usually spawn the shell and feed the command?
    // User wants "input block" -> "output block".
    // Simple spawn: cp.spawn(shell, args)
    // NOTE: Interactive input (stdin) might differ if we use -c.
    // If we use -c, the shell exits after command.
    // If we want an interactive session, we should spawn shell and pipe command.
    // But "independent process" suggests one-off command.
    // Let's stick to spawning the command via shell.

    // PROBLEM: stdin with "-c" might not work as expected for interactive apps.
    // However, if the command IS an interactive app (e.g. "node"), it works.

    const cwd =
      vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || os.homedir();

    try {
      const childProcess = cp.spawn(shell, shellArgs, {
        cwd,
        env: { ...process.env, ...doc.variables, FORCE_COLOR: "1" },
        shell: false, // We are invoking shell explicitly
      });

      this.blockProcesses.set(blockId, childProcess);

      childProcess.stdout.on("data", (data: Buffer) => {
        webviewPanel.webview.postMessage({
          type: "executionOutput",
          blockId,
          data: data.toString(),
        });
      });

      childProcess.stderr.on("data", (data: Buffer) => {
        webviewPanel.webview.postMessage({
          type: "executionOutput",
          blockId,
          data: data.toString(),
        });
      });

      childProcess.on("close", (code: number | null) => {
        this.blockProcesses.delete(blockId);
        webviewPanel.webview.postMessage({
          type: "executionEnd",
          blockId,
          exitCode: code ?? 0,
        });
      });

      childProcess.on("error", (err: Error) => {
        webviewPanel.webview.postMessage({
          type: "executionOutput",
          blockId,
          data: `\r\nError: ${err.message}\r\n`,
        });
        webviewPanel.webview.postMessage({
          type: "executionEnd",
          blockId,
          exitCode: 1,
        });
      });
    } catch (e: any) {
      Ext.error("Failed to spawn", e);
      webviewPanel.webview.postMessage({
        type: "executionEnd",
        blockId,
        exitCode: 1,
      });
    }
  }

  private stopBlock(blockId: string) {
    const process = this.blockProcesses.get(blockId);
    if (process) {
      process.kill();
      this.blockProcesses.delete(blockId);
    }
  }

  private sendDocument(
    panel: vscode.WebviewPanel,
    document: FlowDocument,
    isInitialLoad: boolean,
  ) {
    const messageType = isInitialLoad ? "init" : "update";
    Ext.info(`Sending ${messageType} to webview`, {
      blocks: document.blocks.length,
    });

    const message: ExtensionMessage = {
      type: messageType,
      document,
    };
    panel.webview.postMessage(message);
  }

  private parseDocument(document: vscode.TextDocument): FlowDocument {
    try {
      const text = document.getText();
      if (!text.trim()) {
        return defaultDoc;
      }

      const parsed = JSON.parse(text);

      if (!Array.isArray(parsed.blocks)) {
        // Migration or error
        return defaultDoc;
      }

      return parsed as FlowDocument;
    } catch (error) {
      Ext.error("Failed to parse document", error);
      return defaultDoc;
    }
  }

  private async updateTextDocument(
    document: vscode.TextDocument,
    content: FlowDocument,
  ): Promise<boolean> {
    const edit = new vscode.WorkspaceEdit();
    const json = JSON.stringify(content, null, 2);

    edit.replace(
      document.uri,
      new vscode.Range(0, 0, document.lineCount, 0),
      json,
    );

    const success = await vscode.workspace.applyEdit(edit);

    if (success) {
      Ext.info("Document updated successfully");
    } else {
      Ext.error("Failed to update document");
    }
    return success;
  }

  private getHtmlForWebview(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, "dist", "webview.js"),
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, "dist", "webview.css"),
    );

    const nonce = getNonce();

    return `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}' ${webview.cspSource};">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Flow Editor</title>
      <link href="${styleUri}" rel="stylesheet">
      <style>
        body {
          margin: 0;
          padding: 0;
          overflow: auto;
          background-color: var(--vscode-editor-background);
          color: var(--vscode-editor-foreground);
          font-family: var(--vscode-font-family);
        }
        #root {
          width: 100%;
          min-height: 100vh;
          overflow-y: auto;
        }
      </style>
    </head>
    <body>
      <div id="root"></div>
      <script nonce="${nonce}" src="${scriptUri}"></script>
    </body>
    </html>`;
  }
}

function getNonce() {
  let text = "";
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
