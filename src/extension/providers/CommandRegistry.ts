/**
 * Command Registry
 *
 * Responsibilities:
 * - Register all Flow extension commands
 * - Handle command execution logic
 * - Provide command palette integration
 * - Manage command state and availability
 *
 * Commands:
 * - flow.newFile: Create new .flow file
 * - flow.runAll: Execute all blocks in current document
 * - flow.stopAll: Stop all running processes
 * - flow.clearOutput: Clear all block outputs
 * - flow.exportAsScript: Export flow as shell script
 * - flow.openSettings: Open Flow settings
 */

import * as vscode from "vscode";
import { defaultDoc } from "../../utils/constants";
import { Ext } from "../../utils/logger";
import { FlowDocument, FlowBlock } from "../../types/MessageProtocol";

export class CommandRegistry {
  constructor(private readonly context: vscode.ExtensionContext) {}

  /**
   * Register all commands with VS Code
   */
  public registerCommands(): void {
    Ext.info("Registering Flow commands...");

    // Core commands
    this.registerCommand("flow.newFile", this.createNewFile.bind(this));
    this.registerCommand("flow.helloWorld", this.helloWorld.bind(this));

    // Editor commands
    this.registerCommand("flow.runAll", this.runAllBlocks.bind(this));
    this.registerCommand("flow.stopAll", this.stopAllBlocks.bind(this));
    this.registerCommand("flow.clearOutput", this.clearAllOutputs.bind(this));

    // Export commands
    this.registerCommand("flow.exportAsScript", this.exportAsScript.bind(this));
    this.registerCommand(
      "flow.exportAsMarkdown",
      this.exportAsMarkdown.bind(this),
    );

    // Utility commands
    this.registerCommand("flow.openSettings", this.openSettings.bind(this));
    this.registerCommand(
      "flow.showDocumentation",
      this.showDocumentation.bind(this),
    );

    Ext.info("All commands registered successfully");
  }

  /**
   * Helper to register a command and add to subscriptions
   */
  private registerCommand(
    command: string,
    callback: (...args: any[]) => any,
  ): void {
    const disposable = vscode.commands.registerCommand(command, callback);
    this.context.subscriptions.push(disposable);
  }

  /**
   * Create a new .flow file
   */
  private async createNewFile(): Promise<void> {
    Ext.info("Creating new Flow file...");

    const uri = await vscode.window.showSaveDialog({
      filters: { "Flow Files": ["flow"] },
      defaultUri: vscode.Uri.file("untitled.flow"),
      saveLabel: "Create Flow File",
    });

    if (!uri) {
      Ext.info("New file creation cancelled");
      return;
    }

    try {
      // Create file with default content
      await vscode.workspace.fs.writeFile(
        uri,
        Buffer.from(JSON.stringify(defaultDoc, null, 2)),
      );

      // Open in Flow editor
      await vscode.commands.executeCommand(
        "vscode.openWith",
        uri,
        "flow.editor",
      );

      Ext.info("New Flow file created:", uri.fsPath);
      vscode.window.showInformationMessage(`Created ${uri.fsPath}`);
    } catch (error) {
      Ext.error("Failed to create Flow file:", error);
      vscode.window.showErrorMessage(`Failed to create Flow file: ${error}`);
    }
  }

  /**
   * Hello World example command
   */
  private helloWorld(): void {
    vscode.window.showInformationMessage("Hello World from Flow! 🚀");
  }

  /**
   * Run all blocks in the active Flow document
   */
  private async runAllBlocks(): Promise<void> {
    const editor = vscode.window.activeTextEditor;

    if (!editor || !editor.document.fileName.endsWith(".flow")) {
      vscode.window.showWarningMessage("No Flow document is active");
      return;
    }

    Ext.info("Running all blocks...");

    try {
      const doc = this.parseFlowDocument(editor.document);

      if (doc.blocks.length === 0) {
        vscode.window.showInformationMessage("No blocks to run");
        return;
      }

      // TODO: Send message to webview to execute all blocks
      // This would require extending the message protocol
      vscode.window.showInformationMessage(
        `Running ${doc.blocks.length} block(s)...`,
      );

      // For now, notify user that this is a future feature
      vscode.window.showInformationMessage(
        "Run All Blocks - Coming Soon! Use the Run button in each block.",
      );
    } catch (error) {
      Ext.error("Failed to run all blocks:", error);
      vscode.window.showErrorMessage("Failed to run all blocks");
    }
  }

  /**
   * Stop all running processes in the active Flow document
   */
  private async stopAllBlocks(): Promise<void> {
    const editor = vscode.window.activeTextEditor;

    if (!editor || !editor.document.fileName.endsWith(".flow")) {
      vscode.window.showWarningMessage("No Flow document is active");
      return;
    }

    Ext.info("Stopping all blocks...");

    // TODO: Send message to webview to stop all processes
    vscode.window.showInformationMessage("Stop All - Coming Soon!");
  }

  /**
   * Clear all block outputs in the active Flow document
   */
  private async clearAllOutputs(): Promise<void> {
    const editor = vscode.window.activeTextEditor;

    if (!editor || !editor.document.fileName.endsWith(".flow")) {
      vscode.window.showWarningMessage("No Flow document is active");
      return;
    }

    Ext.info("Clearing all outputs...");

    try {
      const doc = this.parseFlowDocument(editor.document);

      // Clear all outputs
      doc.blocks = doc.blocks.map((block: FlowBlock) => {
        if (block.type === "shell") {
          return {
            ...block,
            output: "",
            exitCode: undefined,
            status: "idle" as const,
          };
        }
        return block;
      });

      // Update document
      const edit = new vscode.WorkspaceEdit();
      edit.replace(
        editor.document.uri,
        new vscode.Range(0, 0, editor.document.lineCount, 0),
        JSON.stringify(doc, null, 2),
      );

      await vscode.workspace.applyEdit(edit);

      vscode.window.showInformationMessage("All outputs cleared");
      Ext.info("All outputs cleared successfully");
    } catch (error) {
      Ext.error("Failed to clear outputs:", error);
      vscode.window.showErrorMessage("Failed to clear outputs");
    }
  }

  /**
   * Export Flow document as executable shell script
   */
  private async exportAsScript(): Promise<void> {
    const editor = vscode.window.activeTextEditor;

    if (!editor || !editor.document.fileName.endsWith(".flow")) {
      vscode.window.showWarningMessage("No Flow document is active");
      return;
    }

    Ext.info("Exporting as shell script...");

    try {
      const doc = this.parseFlowDocument(editor.document);
      const shellBlocks = doc.blocks.filter(
        (b: FlowBlock) => b.type === "shell",
      );

      if (shellBlocks.length === 0) {
        vscode.window.showWarningMessage("No shell blocks to export");
        return;
      }

      // Generate shell script
      const script = this.generateShellScript(doc);

      // Ask where to save
      const uri = await vscode.window.showSaveDialog({
        filters: {
          "Shell Scripts": ["sh", "bash"],
          "All Files": ["*"],
        },
        defaultUri: vscode.Uri.file(
          editor.document.fileName.replace(".flow", ".sh"),
        ),
        saveLabel: "Export Script",
      });

      if (!uri) {
        return;
      }

      // Write script file
      await vscode.workspace.fs.writeFile(uri, Buffer.from(script));

      vscode.window
        .showInformationMessage(`Exported to ${uri.fsPath}`, "Open File")
        .then((choice) => {
          if (choice === "Open File") {
            vscode.commands.executeCommand("vscode.open", uri);
          }
        });

      Ext.info("Exported as shell script:", uri.fsPath);
    } catch (error) {
      Ext.error("Failed to export as script:", error);
      vscode.window.showErrorMessage("Failed to export as script");
    }
  }

  /**
   * Export Flow document as Markdown documentation
   */
  private async exportAsMarkdown(): Promise<void> {
    const editor = vscode.window.activeTextEditor;

    if (!editor || !editor.document.fileName.endsWith(".flow")) {
      vscode.window.showWarningMessage("No Flow document is active");
      return;
    }

    Ext.info("Exporting as Markdown...");

    try {
      const doc = this.parseFlowDocument(editor.document);

      // Generate markdown
      const markdown = this.generateMarkdown(doc);

      // Ask where to save
      const uri = await vscode.window.showSaveDialog({
        filters: {
          "Markdown Files": ["md"],
          "All Files": ["*"],
        },
        defaultUri: vscode.Uri.file(
          editor.document.fileName.replace(".flow", ".md"),
        ),
        saveLabel: "Export Markdown",
      });

      if (!uri) {
        return;
      }

      // Write markdown file
      await vscode.workspace.fs.writeFile(uri, Buffer.from(markdown));

      vscode.window
        .showInformationMessage(`Exported to ${uri.fsPath}`, "Open File")
        .then((choice) => {
          if (choice === "Open File") {
            vscode.commands.executeCommand("vscode.open", uri);
          }
        });

      Ext.info("Exported as Markdown:", uri.fsPath);
    } catch (error) {
      Ext.error("Failed to export as Markdown:", error);
      vscode.window.showErrorMessage("Failed to export as Markdown");
    }
  }

  /**
   * Open Flow extension settings
   */
  private openSettings(): void {
    vscode.commands.executeCommand("workbench.action.openSettings", "flow");
  }

  /**
   * Show Flow documentation
   */
  private showDocumentation(): void {
    vscode.env.openExternal(
      vscode.Uri.parse("https://github.com/0xflame-7/flow"),
    );
  }

  /**
   * Parse Flow document from text
   */
  private parseFlowDocument(document: vscode.TextDocument): FlowDocument {
    try {
      const text = document.getText();
      if (!text.trim()) {
        return { ...defaultDoc };
      }
      return JSON.parse(text) as FlowDocument;
    } catch (error) {
      Ext.error("Failed to parse Flow document:", error);
      throw new Error("Invalid Flow document format");
    }
  }

  /**
   * Generate shell script from Flow document
   */
  private generateShellScript(doc: FlowDocument): string {
    const shellBlocks = doc.blocks.filter(
      (b: FlowBlock) => b.type === "shell",
    ) as Extract<FlowBlock, { type: "shell" }>[];

    const lines: string[] = [
      "#!/bin/bash",
      "",
      "# Generated from Flow document",
      `# Date: ${new Date().toISOString()}`,
      "",
      "set -e  # Exit on error",
      "",
    ];

    // Add variables
    if (Object.keys(doc.variables).length > 0) {
      lines.push("# Variables");
      for (const [key, value] of Object.entries(doc.variables)) {
        lines.push(`export ${key}="${value}"`);
      }
      lines.push("");
    }

    // Add commands
    for (let i = 0; i < shellBlocks.length; i++) {
      const block = shellBlocks[i];
      lines.push(`# Block ${i + 1}: ${block.id}`);
      lines.push(block.cmd);
      lines.push("");
    }

    return lines.join("\n");
  }

  /**
   * Generate Markdown documentation from Flow document
   */
  private generateMarkdown(doc: FlowDocument): string {
    const lines: string[] = [
      "# Flow Document",
      "",
      `**Generated**: ${new Date().toLocaleString()}`,
      "",
    ];

    // Variables section
    if (Object.keys(doc.variables).length > 0) {
      lines.push("## Variables");
      lines.push("");
      for (const [key, value] of Object.entries(doc.variables)) {
        lines.push(`- \`${key}\` = \`${value}\``);
      }
      lines.push("");
    }

    // Context section
    if (doc.context) {
      lines.push("## Context");
      lines.push("");
      lines.push(`- **Working Directory**: \`${doc.context.cwd}\``);
      lines.push(`- **Git Branch**: \`${doc.context.branch}\``);
      lines.push(`- **Shell**: \`${doc.context.shell}\``);
      lines.push("");
    }

    // Blocks section
    lines.push("## Commands");
    lines.push("");

    for (let i = 0; i < doc.blocks.length; i++) {
      const block = doc.blocks[i];

      if (block.type === "shell") {
        lines.push(`### ${i + 1}. Shell Command`);
        lines.push("");
        lines.push("```bash");
        lines.push(block.cmd);
        lines.push("```");
        lines.push("");

        if (block.output) {
          lines.push("**Output:**");
          lines.push("");
          lines.push("```");
          lines.push(block.output.trim());
          lines.push("```");
          lines.push("");
        }

        if (block.exitCode !== undefined) {
          lines.push(`**Exit Code**: ${block.exitCode}`);
          lines.push("");
        }
      } else if (block.type === "markdown") {
        lines.push(`### ${i + 1}. Documentation`);
        lines.push("");
        lines.push(block.content);
        lines.push("");
      }
    }

    return lines.join("\n");
  }
}
