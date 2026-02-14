import * as vscode from "vscode";
import { FlowDocumentSession } from "../services/FlowDocumentSession";
import { Ext } from "../../utils/logger";
import { getNonce } from "../../utils/helper";

/**
 * Custom Editor Provider for .flow files
 * Orchestrates the webview, document synchronization, and services
 */
export class FlowEditorProvider implements vscode.CustomTextEditorProvider {
  // Map of document URI -> Session
  private sessions = new Map<string, FlowDocumentSession>();

  constructor(private readonly context: vscode.ExtensionContext) {}

  /**
   * Get the session for a specific document URI
   */
  public getSession(uri: string): FlowDocumentSession | undefined {
    return this.sessions.get(uri);
  }

  /**
   * Called when a .flow file is opened
   * Sets up the webview and establishes two-way communication
   */
  public resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken,
  ) {
    const docUri = document.uri.toString();
    Ext.info("Opening flow editor", document.uri.fsPath);

    // Setup Webview HTML
    this.setupWebview(webviewPanel);

    // Create Session
    const session = new FlowDocumentSession(
      document,
      webviewPanel,
      this.context,
    );
    this.sessions.set(docUri, session);

    // Cleanup on panel disposal
    webviewPanel.onDidDispose(() => {
      Ext.info("Disposing session", docUri);
      session.dispose();
      this.sessions.delete(docUri);
    });
  }

  /**
   * Configure webview options and load HTML
   */
  private setupWebview(panel: vscode.WebviewPanel) {
    panel.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this.context.extensionUri, "dist"),
        vscode.Uri.joinPath(this.context.extensionUri, "node_modules"),
      ],
    };
    panel.webview.html = this.getHtmlForWebview(panel.webview);
  }

  /**
   * Generate HTML for the webview
   */
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
