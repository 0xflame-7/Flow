import * as vscode from "vscode";
import * as cp from "child_process";
import { FlowContext } from "../../types/MessageProtocol";
import { Ext } from "../../utils/logger";

/**
 * Manages process execution for shell blocks
 * Handles spawning, I/O streaming, and lifecycle management
 */
export class ProcessExecutionService {
  // Map of blockId -> ChildProcess
  private processes = new Map<string, cp.ChildProcessWithoutNullStreams>();

  /**
   * Execute a shell command for a specific block
   * Returns validation promise that resolves with exit code
   */
  public async execute(
    blockId: string,
    cmd: string,
    context: FlowContext,
    panel: vscode.WebviewPanel,
  ): Promise<number> {
    // Kill any existing process for this block
    this.stop(blockId);

    if (!cmd.trim()) {
      Ext.warn("Empty command, skipping execution");
      return 0;
    }

    Ext.info(`Executing block ${blockId}: ${cmd}`);

    // Notify webview that execution is starting
    panel.webview.postMessage({ type: "executionStart", blockId });

    // Determine shell and arguments
    const { shellExe, shellArgs } = this.parseShellCommand(context.shell, cmd);

    return new Promise((resolve) => {
      try {
        // Spawn the process
        const childProcess = cp.spawn(shellExe, shellArgs, {
          cwd: context.cwd,
          env: { ...process.env, FORCE_COLOR: "1" },
          shell: false, // We explicitly invoke the shell
        });

        this.processes.set(blockId, childProcess);

        // Stream stdout to webview
        childProcess.stdout.on("data", (data: Buffer) => {
          panel.webview.postMessage({
            type: "executionOutput",
            blockId,
            data: data.toString(),
          });
        });

        // Stream stderr to webview
        childProcess.stderr.on("data", (data: Buffer) => {
          panel.webview.postMessage({
            type: "executionOutput",
            blockId,
            data: data.toString(),
          });
        });

        // Handle process completion
        childProcess.on("close", (code: number | null) => {
          this.processes.delete(blockId);
          const exitCode = code ?? 0;
          panel.webview.postMessage({
            type: "executionEnd",
            blockId,
            exitCode,
          });
          resolve(exitCode);
        });

        // Handle process errors
        childProcess.on("error", (err: Error) => {
          Ext.error("Process error", err);
          panel.webview.postMessage({
            type: "executionOutput",
            blockId,
            data: `\r\nError: ${err.message}\r\n`,
          });
          panel.webview.postMessage({
            type: "executionEnd",
            blockId,
            exitCode: 1,
          });
          resolve(1);
        });
      } catch (e: any) {
        Ext.error("Failed to spawn process", e);
        panel.webview.postMessage({
          type: "executionEnd",
          blockId,
          exitCode: 1,
        });
        resolve(1);
      }
    });
  }

  /**
   * Stop a running process
   */
  public stop(blockId: string): void {
    const process = this.processes.get(blockId);
    if (process) {
      Ext.info(`Stopping process for block ${blockId}`);
      process.kill();
      this.processes.delete(blockId);
    }
  }

  /**
   * Send input (stdin) to a running process
   */
  public sendInput(blockId: string, data: string): void {
    const process = this.processes.get(blockId);
    if (process && process.stdin) {
      process.stdin.write(data);
    } else {
      Ext.warn(`No running process for block ${blockId}`);
    }
  }

  /**
   * Kill all running processes
   */
  public killAll(): void {
    Ext.info(`Killing ${this.processes.size} processes`);
    this.processes.forEach((process) => process.kill());
    this.processes.clear();
  }

  /**
   * Parse shell type and determine how to invoke it with the command
   */
  private parseShellCommand(
    shellName: string,
    cmd: string,
  ): { shellExe: string; shellArgs: string[] } {
    const lowerName = shellName.toLowerCase();

    // PowerShell
    if (lowerName.includes("powershell") || lowerName.includes("pwsh")) {
      return {
        shellExe: shellName,
        shellArgs: ["-Command", cmd],
      };
    }

    // Windows CMD
    if (lowerName.includes("cmd.exe") || lowerName === "cmd") {
      return {
        shellExe: shellName,
        shellArgs: ["/C", cmd],
      };
    }

    // Unix shells (bash, zsh, sh, fish, etc.)
    if (
      lowerName.includes("bash") ||
      lowerName.includes("zsh") ||
      lowerName.includes("sh") ||
      lowerName.includes("fish")
    ) {
      return {
        shellExe: shellName,
        shellArgs: ["-c", cmd],
      };
    }

    // Default fallback (assume Unix-like)
    return {
      shellExe: shellName,
      shellArgs: ["-c", cmd],
    };
  }
}
