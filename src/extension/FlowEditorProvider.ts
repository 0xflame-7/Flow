import * as vscode from "vscode";
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

  public resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken,
  ) {
    Ext.info("Open flow editor", document.uri.fsPath);
    const docUri = document.uri.toString();

    webviewPanel.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this.context.extensionUri, "dist"),
        vscode.Uri.joinPath(this.context.extensionUri, "node_modules"),
      ],
    };

    webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview);

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
    });
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

      if (!parsed.layout || !Array.isArray(parsed.blocks)) {
        throw new Error("Invalid Flow document structure");
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
      <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
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
