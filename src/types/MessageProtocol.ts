// Message send FROM extension TO webview
export type ExtensionMessage =
  | { type: "init"; document: FlowDocument }
  | { type: "update"; document: FlowDocument }
  | { type: "ack"; success: boolean }
  | { type: "terminalOutput"; data: string }; // New type for terminal output

// Message send FROM webview TO extension
export type WebviewMessage =
  | { type: "ready" }
  | { type: "update"; document: FlowDocument }
  | { type: "log"; message: string }
  | { type: "terminalInput"; data: string }; // New type for terminal input

export interface FlowDocument {
  layout: "masonry" | "grid";
  variables: Record<string, string>;
  blocks: FlowBlock[];
}

type ShellBlock = {
  type: "shell";
  cmd: string;
  output?: string;
  exitCode?: number;
};

type MarkdownBlock = {
  type: "markdown";
  content: string;
};

export type FlowBlock = (ShellBlock | MarkdownBlock) & {
  id: string;
  pos: { x: number; y: number; w: number; h: number };
  status?: "idle" | "running" | "success" | "error";
};
