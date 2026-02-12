type VSCodeAPI = {
  postMessage: (message: any) => void;
};

class Logger {
  private prefix: string;
  private vscode: VSCodeAPI | null = null;
  private isWebview: boolean;

  constructor(prefix: string) {
    this.prefix = prefix;
    this.isWebview = typeof window !== "undefined";
  }

  setVSCode(vscode: VSCodeAPI) {
    this.vscode = vscode;
  }

  private format(level: string, message: string): string {
    const time = new Date().toISOString().split("T")[1].slice(0, -5);
    return `[${time}] ${this.prefix}:${level} ${message}`;
  }

  private log(
    level: string,
    method: "log" | "warn" | "error",
    message: string,
    ...args: any[]
  ) {
    const formatted = this.format(level, message);
    console[method](formatted, ...args);

    // Send webview logs to extension
    if (this.isWebview && this.vscode) {
      const argsStr = args.length > 0 ? " " + JSON.stringify(args) : "";
      this.vscode.postMessage({
        type: "log",
        message: `${formatted}${argsStr}`,
      });
    }
  }

  info(message: string, ...args: any[]) {
    this.log("INFO", "log", message, ...args);
  }

  warn(message: string, ...args: any[]) {
    this.log("WARN", "warn", message, ...args);
  }

  error(message: string, ...args: any[]) {
    this.log("ERROR", "error", message, ...args);
  }
}

// Extension logger
export const Ext = new Logger("EXT");

// Webview logger
export const Web = new Logger("WEB");
