import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import * as os from "os";
import {
  WebviewMessage,
  FlowDocument,
  FlowContext,
} from "../../types/MessageProtocol";
import { ProcessExecutionService } from "./ProcessExecutionManagementService";
import { Ext } from "../../utils/logger";
import { defaultDoc } from "../../utils/constants";
import { ContextService } from "./ContextService";
import { ShellService } from "./ShellService";

/**
 * Manages the session for a single open .flow document
 * Handles message passing, process execution, and state synchronization
 */
export class FlowDocumentSession {
  private processService: ProcessExecutionService;
  private disposables: vscode.Disposable[] = [];
  private isDisposed = false;
  private contextService: ContextService;
  private shellService: ShellService;
  private updatingDocument = false;

  constructor(
    private readonly document: vscode.TextDocument,
    private readonly panel: vscode.WebviewPanel,
    private readonly context: vscode.ExtensionContext,
  ) {
    this.processService = new ProcessExecutionService();
    this.contextService = new ContextService();
    this.shellService = new ShellService();

    this.setupWebview();
    this.setupDocumentSync();

    // Initialize context
    this.initialize();
  }

  /**
   * Initialize session
   */
  private async initialize() {
    // Refresh context service (gets workspace default)
    await this.contextService.refresh();

    // Load document and merge context
    let doc = this.parseDocument();

    // If doc has no context, use default from environment
    if (!doc.context) {
      doc.context = this.contextService.getContext();
      await this.updateTextDocument(doc);
    } else {
      // Ensure CWD is expanded if it uses ~
      const expandedCwd = this.expandPath(doc.context.cwd);
      if (expandedCwd !== doc.context.cwd) {
        doc.context.cwd = expandedCwd;
        await this.updateTextDocument(doc);
      }
    }

    this.sendDocument(doc, true);
  }

  private expandPath(p: string): string {
    if (p.startsWith("~")) {
      return p.replace("~", os.homedir());
    }
    return p;
  }

  /**
   * Setup message listeners
   */
  private setupWebview() {
    this.panel.webview.onDidReceiveMessage(
      async (message: WebviewMessage) => {
        if (this.isDisposed) {
          return;
        }

        switch (message.type) {
          case "ready":
            Ext.info("Webview ready (session)");
            const doc = this.parseDocument();
            this.sendDocument(doc, false);
            break;

          case "update":
            this.updatingDocument = true;
            await this.updateTextDocument(message.document);
            this.updatingDocument = false;
            this.panel.webview.postMessage({ type: "ack", success: true });
            break;

          case "execute":
            await this.handleExecution(message.blockId, message.cmd);
            break;

          case "stop":
            this.processService.stop(message.blockId);
            break;

          case "terminalInput":
            this.processService.sendInput(message.blockId, message.data);
            break;

          case "requestShellConfig":
            const shells = this.shellService.getAvailableShells();
            Ext.info(`Sending shell config with ${shells.length} shells`);
            Ext.warn("Shells: ", JSON.stringify(shells));
            this.panel.webview.postMessage({
              type: "shellConfig",
              shells,
            });
            break;

          case "log":
            Ext.info(`[WEB] ${message.message}`);
            break;
        }
      },
      null,
      this.disposables,
    );

    // Handle panel close
    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
  }

  /**
   * Handle command execution, including CD interception
   */
  public async executeBlock(blockId: string, cmd: string) {
    await this.handleExecution(blockId, cmd);
  }

  /**
   * Run all blocks in the document sequentially
   */
  public async runAll() {
    const doc = this.parseDocument();
    for (const block of doc.blocks) {
      if (block.type === "shell") {
        await this.handleExecution(block.id, block.cmd);
      }
    }
  }

  /**
   * Stop all running processes in this session
   */
  public stopAll() {
    this.processService.killAll();
  }

  /**
   * Clear all outputs in the document
   */
  public async clearOutput() {
    const doc = this.parseDocument();
    doc.blocks = doc.blocks.map((b) =>
      b.type === "shell"
        ? { ...b, output: "", exitCode: undefined, status: "idle" }
        : b,
    );
    await this.updateTextDocument(doc);
    this.sendDocument(doc, false);
  }

  /**
   * Handle command execution, including CD interception
   */
  private async handleExecution(blockId: string, cmd: string) {
    let doc = this.parseDocument();

    // Ensure context exists
    if (!doc.context) {
      doc.context = this.contextService.getContext();
    }
    const context = doc.context!;

    // Execute command with current context
    const exitCode = await this.processService.execute(
      blockId,
      cmd,
      context,
      this.panel,
    );

    // If command was CD and succeeded, update persistent context
    if (
      exitCode === 0 &&
      cmd.trim().startsWith("cd ") &&
      doc.blocks.find((b) => b.id === blockId)?.type === "shell"
    ) {
      await this.handleCdSuccess(cmd, context, doc);
    }
  }

  /**
   * Update context after successful CD command
   */
  private async handleCdSuccess(
    cmd: string,
    context: FlowContext,
    doc: FlowDocument,
  ) {
    let targetPath = cmd.trim().substring(3).trim();
    if (!targetPath) {
      return;
    }

    // Strip quotes
    targetPath = targetPath.replace(/^"|"$/g, "").replace(/^'|'$/g, "");

    try {
      const expandedPath = this.expandPath(targetPath);
      const currentCwd = this.expandPath(context.cwd);

      const newCwd = path.resolve(currentCwd, expandedPath);

      if (fs.existsSync(newCwd)) {
        try {
          if (fs.statSync(newCwd).isDirectory()) {
            // Update context
            const newContext = { ...context, cwd: newCwd };

            // Update document
            const newDoc = { ...doc, context: newContext };
            await this.updateTextDocument(newDoc);
            Ext.info(`Updated CWD to ${newCwd}`);
          }
        } catch (e) {
          Ext.warn(`Failed to access directory ${newCwd}: ${e}`);
        }
      }
    } catch (e) {
      Ext.warn(`Failed to resolve path for CD: ${e}`);
    }
  }

  /**
   * Sync from file system changes
   */
  private setupDocumentSync() {
    vscode.workspace.onDidChangeTextDocument(
      (e) => {
        if (this.isDisposed || this.updatingDocument) {
          return;
        }

        if (e.document.uri.toString() === this.document.uri.toString()) {
          const doc = this.parseDocument();
          this.sendDocument(doc, false);
        }
      },
      null,
      this.disposables,
    );
  }

  private sendDocument(doc: FlowDocument, isInitial: boolean) {
    if (this.isDisposed) {
      return;
    }
    this.panel.webview.postMessage({
      type: isInitial ? "init" : "update",
      document: doc,
    });
  }

  private parseDocument(): FlowDocument {
    try {
      const text = this.document.getText();
      if (!text.trim()) {
        return { ...defaultDoc };
      }
      return JSON.parse(text) as FlowDocument;
    } catch {
      return { ...defaultDoc };
    }
  }

  private async updateTextDocument(doc: FlowDocument) {
    const edit = new vscode.WorkspaceEdit();
    const json = JSON.stringify(doc, null, 2);

    const fullRange = new vscode.Range(
      this.document.positionAt(0),
      this.document.positionAt(this.document.getText().length),
    );

    edit.replace(this.document.uri, fullRange, json);
    await vscode.workspace.applyEdit(edit);
  }

  public dispose() {
    if (this.isDisposed) {
      return;
    }
    this.isDisposed = true;

    this.processService.killAll();

    this.disposables.forEach((d) => d.dispose());
    this.disposables = [];
  }
}
