import * as vscode from "vscode";
import * as os from "os";
import * as cp from "child_process";
import * as path from "path";
import * as fs from "fs";
import { Ext } from "../utils/logger";
import {
  ExtensionMessage,
  FlowDocument,
  FlowContext,
  WebviewMessage,
} from "../types/MessageProtocol";
import { defaultDoc } from "../utils/constants";

export class FlowEditorProvider implements vscode.CustomTextEditorProvider {
  constructor(private readonly context: vscode.ExtensionContext) {}

  private updatingDocuments = new Map<string, boolean>();
  // Map of blockId -> ChildProcess
  private blockProcesses = new Map<string, cp.ChildProcessWithoutNullStreams>();
  private globalContext: FlowContext = {
    cwd: os.homedir(),
    branch: "main",
    shell:
      vscode.env.shell ||
      (os.platform() === "win32" ? "powershell.exe" : "bash"),
  };

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
              // Update doc with latest global context
              doc.context = { ...this.globalContext };
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
      // TODO: Track blocks per document to kill only relevant ones.
    });

    // Initial Context Load
    this.refreshContext().then(() => {
      // If webview is ready, push update?
      // We handle this in 'ready' message usually, but if context finishes loading AFTER ready:
      if (webviewReady) {
        const doc = this.parseDocument(document);
        doc.context = { ...this.globalContext };
        this.sendDocument(webviewPanel, doc, false);
      }
    });
  }

  private async refreshContext() {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (workspaceFolder) {
      this.globalContext.cwd = workspaceFolder.uri.fsPath;
      try {
        const branch = await this.getGitBranch(this.globalContext.cwd);
        if (branch) {
          this.globalContext.branch = branch;
        }
      } catch (e) {
        Ext.error("Failed to get git branch", e);
      }
    }
    // Update shell from env in case it changed
    if (vscode.env.shell) {
      this.globalContext.shell = vscode.env.shell;
    }
  }

  private getGitBranch(cwd: string): Promise<string> {
    return new Promise((resolve) => {
      cp.exec("git rev-parse --abbrev-ref HEAD", { cwd }, (err, stdout) => {
        if (err) {
          resolve("");
        } else {
          resolve(stdout.trim());
        }
      });
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

    // Determine Shell from Block Context or Global Context
    let shellName = block.context?.shell || this.globalContext.shell;

    // Fallback if global context shell is missing (unlikely with vscode.env.shell)
    if (!shellName) {
      // Try to get from vscode settings specifically as a fallback
      const settings = vscode.workspace.getConfiguration("terminal.integrated");
      const platform =
        os.platform() === "win32"
          ? "windows"
          : os.platform() === "darwin"
            ? "osx"
            : "linux";
      // This is legacy but still useful fallback
      shellName =
        settings.get(`shell.${platform}`) ||
        (os.platform() === "win32" ? "powershell.exe" : "bash");
    }

    let shellExe = shellName;
    let shellArgs: string[] = [];
    const lowerName = shellName.toLowerCase();

    // Heuristic to determine args based on shell executable name (full path or short name)
    if (lowerName.includes("powershell") || lowerName.includes("pwsh")) {
      // PowerShell needs -Command
      shellArgs = ["-Command", cmd];
    } else if (lowerName.includes("cmd.exe") || lowerName === "cmd") {
      // CMD needs /C
      shellArgs = ["/C", cmd];
    } else if (
      lowerName.includes("bash") ||
      lowerName.includes("zsh") ||
      lowerName.includes("sh") ||
      lowerName.includes("fish")
    ) {
      // Unix shells mostly support -c
      shellArgs = ["-c", cmd];
    } else {
      // Fallback for unknown shells, assume -c
      shellArgs = ["-c", cmd];
    }

    const initialCwd = this.globalContext.cwd;

    // SIMPLE CWD HANDLING: If command is 'cd <path>', try to resolve it for the NEXT command.
    if (cmd.trim().startsWith("cd ") && block.type === "shell") {
      const targetPath = cmd.trim().substring(3).trim();
      try {
        const newCwd = path.resolve(initialCwd, targetPath);
        if (fs.existsSync(newCwd)) {
          this.globalContext.cwd = newCwd;

          // Attempt to update branch for the new CWD
          this.getGitBranch(newCwd).then((branch) => {
            if (branch) {
              this.globalContext.branch = branch;
            }
            // Trigger context update to frontend
            webviewPanel.webview.postMessage({
              type: "update",
              document: { ...doc, context: this.globalContext },
            });
          });
        }
      } catch (e) {}
    }

    try {
      const childProcess = cp.spawn(shellExe, shellArgs, {
        cwd: initialCwd, // Run in the CWD *before* the cd took effect
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
