import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import * as os from "os";
import * as cp from "child_process";
import { Ext } from "../../utils/logger";

export interface ShellConfig {
  label: string;
  path: string;
  icon: string;
}

export class ShellService {
  private isWindows = os.platform() === "win32";

  public getAvailableShells(): ShellConfig[] {
    const platformKey = this.isWindows
      ? "windows"
      : os.platform() === "darwin"
        ? "osx"
        : "linux";
    const config = vscode.workspace.getConfiguration(
      "terminal.integrated.profiles",
    );
    const profiles = config.get<Record<string, any>>(platformKey) || {};

    // console.log(JSON.stringify(config));
    // console.log(JSON.stringify(profiles));
    const shells: ShellConfig[] = [];

    for (const [label, profile] of Object.entries(profiles)) {
      if (!profile) {
        continue;
      }

      // console.log(`[ShellService] Checking profile: "${label}"`);

      let shellPath: string | null = null;

      // 1. Handle "Source" (e.g., "source": "Git Bash")
      if (profile.source) {
        // console.log(`[ShellService]   -> Handling Source: ${profile.source}`);
        if (profile.source === "PowerShell") {
          const pwsh = this.findPwsh();
          if (pwsh) {
            // console.log(`[ShellService]   -> Found pwsh: ${pwsh}`);
            shellPath = pwsh;
          } else {
            // console.log(
            // `[ShellService]   -> pwsh not found, fallback to powershell.exe`,
            // );
            shellPath = this.findOnPath("powershell.exe");
          }
        } else {
          const binaryName = this.mapSourceToBinary(profile.source);
          if (binaryName) {
            // console.log(
            // `[ShellService]   -> Mapped source to binary: ${binaryName}`,
            // );
            shellPath = this.findOnPath(binaryName);
          } else {
            // console.log(
            // `[ShellService]   -> No binary mapping found for source: ${profile.source}`,
            // );
          }
        }
      }

      // 2. Handle Explicit "Path" (e.g., "path": "${env:windir}\\...")
      else if (profile.path) {
        const paths = Array.isArray(profile.path)
          ? profile.path
          : [profile.path];
        // console.log(
        // `[ShellService]   -> Handling Explicit Path(s): ${JSON.stringify(paths)}`,
        // );

        for (const p of paths) {
          const expanded = this.expandVariables(p);
          // console.log(`[ShellService]     -> Checking path: ${expanded}`);

          // Check if it exists directly
          if (this.pathExists(expanded)) {
            shellPath = expanded;
            // console.log(`[ShellService]     -> Found direct path: ${expanded}`);
            break;
          } else {
            // Try finding it in PATH if it's just a binary name
            const basename = path.basename(expanded);
            if (basename === expanded || !path.isAbsolute(expanded)) {
              const found = this.findOnPath(basename);
              if (found) {
                shellPath = found;
                // console.log(`[ShellService]     -> Found via PATH: ${found}`);
                break;
              }
            }
            // console.log(`[ShellService]     -> Not found: ${expanded}`);
          }
        }
      }

      if (shellPath) {
        // console.log(`[ShellService]   => Resolved to: ${shellPath}`);
        shells.push({
          label: label,
          path: shellPath,
          icon: profile.icon || this.inferIcon(label),
        });
      } else {
        // console.log(
        // `[ShellService]   => Failed to resolve shell path for profile: ${label}`,
        // );
      }
    }

    return shells;
  }

  private get exeExt(): string {
    return this.isWindows ? ".exe" : "";
  }

  /**
   * Flow-specific: Try to find pwsh via PowerShell if 'where' fails
   * This handles Windows App Execution Aliases (Microsoft Store installs)
   */
  private findPwsh(): string | null {
    try {
      const binary = `pwsh${this.exeExt}`;
      // 1. Try standard path lookup first
      const onPath = this.findOnPath(binary);
      if (onPath) {
        // console.log(`[findPwsh] Found via findOnPath: ${onPath}`);
        return onPath;
      }
      // console.log(`[findPwsh] '${binary}' not found in PATH via findOnPath`);

      // 2. Fallback: Ask PowerShell where pwsh is (handles WindowsApps)
      if (this.isWindows) {
        // Try to use pwsh if available (faster), otherwise use powershell.exe
        const psExecutable = "powershell.exe"; // Use old PowerShell to find new PowerShell
        const cmd = `${psExecutable} -NoProfile -Command "Get-Command -Name pwsh -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Path"`;
        // console.log(`[findPwsh] Executing fallback command: ${cmd}`);

        const result = cp.execSync(cmd, { encoding: "utf8" }).trim();
        // console.log(`[findPwsh] Command result: ${JSON.stringify(result)}`);

        // Get-Command might return multiple lines
        const firstPath = result.split(/\r?\n/)[0]?.trim();
        // console.log(`[findPwsh] First path candidate: ${firstPath}`);

        if (firstPath && this.pathExists(firstPath)) {
          // console.log(`[findPwsh] Verified path exists: ${firstPath}`);
          return firstPath;
        } else if (firstPath) {
          // console.log(
          // `[findPwsh] Path validation failed for: ${firstPath}, but returning anyway (App Execution Alias)`,
          // );
          return firstPath; // Return even if validation fails (it's an alias)
        }
      }
      return null;
    } catch (e: any) {
      console.error(`[findPwsh] Error: ${e.message}`);
      return null;
    }
  }

  /**
   * Check if a path exists, with special handling for Windows App Execution Aliases
   */
  private pathExists(filePath: string): boolean {
    try {
      // Try lstatSync first (works for reparse points)
      fs.lstatSync(filePath);
      return true;
    } catch {
      // If lstat fails, try accessSync as a fallback
      try {
        fs.accessSync(filePath, fs.constants.F_OK);
        return true;
      } catch {
        return false;
      }
    }
  }

  /**
   * Maps VS Code abstract sources to actual binary names.
   */
  private mapSourceToBinary(source: string): string | null {
    const s = source.toLowerCase();
    if (s === "git bash") {
      return `git-bash${this.exeExt}`;
    }
    return null;
  }

  /**
   * Expands both VS Code ${env:VAR} and Windows %VAR% styles
   */
  private expandVariables(value: string): string {
    // 1. Replace ${env:VAR}
    let result = value.replace(
      /\${env:([^}]+)}/g,
      (_, v) => process.env[v] || "",
    );

    // 2. Replace %VAR% (Windows style)
    if (this.isWindows) {
      result = result.replace(/%([^%]+)%/g, (_, v) => process.env[v] || "");
    }

    return path.normalize(result);
  }

  /**
   * Find executable using OS 'where' (Windows) or 'which' (Unix)
   * FIXED: Now handles Windows App Execution Aliases properly
   */
  private findOnPath(binaryName: string): string | null {
    try {
      const cmd = this.isWindows ? "where" : "which";
      // console.log(`[findOnPath] Searching for: ${binaryName}`);

      // Execute the command
      const result = cp.execSync(`${cmd} "${binaryName}"`, {
        encoding: "utf8",
      });
      // console.log(`[findOnPath] Raw result: ${JSON.stringify(result)}`);

      // Parse results (where/which might return multiple lines)
      const lines = result
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l);

      // console.log(`[findOnPath] Found ${lines.length} candidate(s)`);

      for (const line of lines) {
        // console.log(`[findOnPath]   Checking: ${line}`);

        // For Windows App Execution Aliases, pathExists might fail
        // but the path is still valid, so we trust 'where' output
        if (this.isWindows && line.includes("WindowsApps")) {
          // console.log(
          // `[findOnPath]   Detected WindowsApps alias, accepting without validation`,
          // );
          return line;
        }

        // For normal paths, verify they exist
        if (this.pathExists(line)) {
          // console.log(`[findOnPath]   Verified: ${line}`);
          return line;
        } else {
          // console.log(`[findOnPath]   Path validation failed: ${line}`);
        }
      }

      // If we found results but none validated, return first one anyway
      if (lines.length > 0) {
        // console.log(
        // `[findOnPath] No validated paths, returning first result: ${lines[0]}`,
        // );
        return lines[0];
      }

      return null;
    } catch (e: any) {
      Ext.warn(
        `[ShellService] findOnPath('${binaryName}') failed: ${e.message}`,
      );
      return null;
    }
  }

  private inferIcon(label: string): string {
    const l = label.toLowerCase();
    if (l.includes("git")) {
      return "terminal-git-bash";
    }
    if (l.includes("powershell") || l.includes("pwsh")) {
      return "terminal-powershell";
    }
    if (l.includes("cmd")) {
      return "terminal-cmd";
    }
    if (l.includes("bash")) {
      return "terminal-bash";
    }
    if (l.includes("ubuntu") || l.includes("wsl")) {
      return "terminal-ubuntu";
    }
    return "terminal";
  }
}
