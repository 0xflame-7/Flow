import * as vscode from "vscode";
import * as os from "os";
import * as cp from "child_process";
import { FlowContext } from "../../types/MessageProtocol";
import { Ext } from "../../utils/logger";

/**
 * Manages the execution context (cwd, git branch, shell)
 * Provides a centralized place for context state
 */
export class ContextService {
  private context: FlowContext;

  constructor() {
    this.context = {
      cwd: os.homedir(),
      branch: "main",
      shell: this.detectShell(),
    };
  }

  /**
   * Get current context
   */
  public getContext(): FlowContext {
    return { ...this.context };
  }

  /**
   * Update current working directory
   * Also attempts to update git branch for the new directory
   */
  public async setCwd(cwd: string): Promise<void> {
    this.context.cwd = cwd;

    // Try to get git branch for new directory
    const branch = await this.getGitBranch(cwd);
    if (branch) {
      this.context.branch = branch;
    }
  }

  /**
   * Update shell
   */
  public setShell(shell: string): void {
    this.context.shell = shell;
  }

  /**
   * Refresh context from workspace
   * Called on initialization and when workspace changes
   */
  public async refresh(): Promise<void> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];

    if (workspaceFolder) {
      this.context.cwd = workspaceFolder.uri.fsPath;

      try {
        const branch = await this.getGitBranch(this.context.cwd);
        if (branch) {
          this.context.branch = branch;
        }
      } catch (e) {
        Ext.error("Failed to get git branch", e);
      }
    }

    // Update shell from VS Code settings
    const detectedShell = this.detectShell();
    if (detectedShell) {
      this.context.shell = detectedShell;
    }
  }

  /**
   * Detect the default shell from VS Code environment or system
   */
  private detectShell(): string {
    // Try VS Code's detected shell first
    if (vscode.env.shell) {
      return vscode.env.shell;
    }

    // Fall back to platform defaults
    return os.platform() === "win32" ? "powershell.exe" : "bash";
  }

  /**
   * Get the current git branch for a directory
   */
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
}
