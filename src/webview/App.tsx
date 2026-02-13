import { useEffect, useState, useRef, useCallback } from "react";
import Ansi from "ansi-to-react";
import { GitBranch, FolderOpen } from "lucide-react";
import {
  ExtensionMessage,
  WebviewMessage,
  FlowDocument,
  FlowBlock,
  FlowContext,
} from "../types/MessageProtocol";
import { Web } from "../utils/logger";
import { InputSection } from "./components/InputSection";

declare const acquireVsCodeApi: () => { postMessage: (message: any) => void };

const vscode = acquireVsCodeApi();
Web.setVSCode(vscode);

// Helper for generating IDs
const generateId = () => Math.random().toString(36).substr(2, 9);

// Mock initial context if none provided (could be replaced by init message)
const DEFAULT_CONTEXT: FlowContext = {
  cwd: "~/work/project",
  branch: "main",
  shell: "bash",
};

const ShellBlockComponent = ({
  block,
  onRun,
  onStop,
  onInput,
  onDelete,
}: {
  block: Extract<FlowBlock, { type: "shell" }>;
  onRun: (id: string, cmd: string) => void;
  onStop: (id: string) => void;
  onInput: (id: string, data: string) => void;
  onDelete: (id: string) => void;
}) => {
  const [input, setInput] = useState(block.cmd || "");
  const [terminalInput, setTerminalInput] = useState("");
  const outputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [block.output]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      onInput(block.id, terminalInput + "\r");
      setTerminalInput("");
    }
  };

  const isRunning = block.status === "running";
  const context = block.context || DEFAULT_CONTEXT;

  return (
    <div className="border border-vscode-panel-border rounded mb-4 bg-vscode-editor-background overflow-hidden flex flex-col group relative hover:bg-vscode-list-hoverBackground transition-colors duration-200">
      {/* Block Header / Context Info */}
      <div className="flex items-center justify-between p-2 text-xs select-none">
        <div className="flex items-center gap-2 text-vscode-descriptionForeground">
          <span className="font-bold opacity-70">#{block.id.substr(0, 4)}</span>
          {block.status === "success" && (
            <span className="text-vscode-ansi-green">✓</span>
          )}
          {block.status === "error" && (
            <span className="text-vscode-error">✗</span>
          )}

          <span className="text-vscode-button-background font-bold ml-2">
            [local]
          </span>
          <div className="flex items-center gap-1">
            <GitBranch size={12} />
            <span>{context.branch}</span>
          </div>
          <div className="flex items-center gap-1">
            <FolderOpen size={12} />
            <span className="truncate max-w-[150px]" title={context.cwd}>
              {context.cwd}
            </span>
          </div>
          <span className="text-vscode-button-background font-bold">$</span>
          <span className="text-vscode-foreground font-medium">
            {block.cmd}
          </span>
        </div>

        {/* Actions */}
        <div className="opacity-0 group-hover:opacity-100 transition-all duration-200 z-10 flex items-center gap-1 bg-vscode-editor-background rounded p-0.5 border border-vscode-input-border">
          <button
            onClick={() => onRun(block.id, input)}
            className="p-1 text-vscode-descriptionForeground hover:text-vscode-foreground rounded"
            title="Re-run"
          >
            <span className="material-symbols-outlined text-lg leading-none">
              refresh
            </span>
          </button>
          <button
            onClick={() => onDelete(block.id)}
            className="p-1 text-vscode-descriptionForeground hover:text-red-400 rounded"
            title="Delete"
          >
            <span className="material-symbols-outlined text-lg leading-none">
              delete
            </span>
          </button>
        </div>
      </div>

      {block.status === "idle" &&
        // Use a simple display for idle blocks if we want to show anything,
        // or rely on the header. But the header shows the command.
        // We can show nothing here or the output if it exists from previous run (re-hydration).
        null}

      {/* Output Area */}
      {(block.output || isRunning) && (
        <div className="p-2 border-t border-vscode-panel-border bg-vscode-terminal-bg min-h-[100px] max-h-[400px] flex flex-col">
          <div
            ref={outputRef}
            className="flex-1 overflow-auto whitespace-pre-wrap break-all font-mono text-sm p-2 text-vscode-terminal-fg"
          >
            <Ansi>{block.output || ""}</Ansi>
            {block.exitCode !== undefined && (
              <div className="mt-2 text-xs opacity-50 text-gray-400">
                Process exited with code {block.exitCode}
              </div>
            )}
          </div>

          {/* Stdin Input */}
          {isRunning && (
            <div className="flex items-center border-t border-gray-800 mt-1 pt-1">
              <span className="text-gray-500 mr-2">$</span>
              <input
                type="text"
                value={terminalInput}
                onChange={(e) => setTerminalInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 bg-transparent border-none text-vscode-terminal-fg outline-none font-mono text-sm focus:ring-0"
                placeholder="Type input..."
                autoFocus
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default function App() {
  const [doc, setDoc] = useState<FlowDocument>({
    layout: "grid",
    variables: {},
    blocks: [],
    context: DEFAULT_CONTEXT,
  });

  const updateDoc = useCallback((newDoc: FlowDocument) => {
    setDoc(newDoc);
    vscode.postMessage({ type: "update", document: newDoc });
  }, []);

  useEffect(() => {
    Web.info("App mounted");
    vscode.postMessage({ type: "ready" });

    const messageHandler = (event: MessageEvent) => {
      const message: ExtensionMessage = event.data;
      switch (message.type) {
        case "init":
        case "update":
          setDoc(message.document);
          break;
        case "executionStart": {
          setDoc((prev) => ({
            ...prev,
            blocks: prev.blocks.map((b) =>
              b.id === message.blockId
                ? { ...b, status: "running", output: "", exitCode: undefined }
                : b,
            ),
          }));
          break;
        }
        case "executionOutput": {
          setDoc((prev) => ({
            ...prev,
            blocks: prev.blocks.map((b) =>
              b.id === message.blockId
                ? {
                    ...b,
                    output:
                      b.type === "shell" ? (b.output || "") + message.data : "",
                  }
                : b,
            ),
          }));
          break;
        }
        case "executionEnd": {
          setDoc((prev) => ({
            ...prev,
            blocks: prev.blocks.map((b) =>
              b.id === message.blockId
                ? {
                    ...b,
                    status: message.exitCode === 0 ? "success" : "error",
                    exitCode: message.exitCode,
                  }
                : b,
            ),
          }));
          break;
        }
      }
    };

    window.addEventListener("message", messageHandler);
    return () => window.removeEventListener("message", messageHandler);
  }, []);

  const deleteBlock = (id: string) => {
    updateDoc({ ...doc, blocks: doc.blocks.filter((b) => b.id !== id) });
  };

  const runBlock = (id: string, cmd: string) => {
    // Re-run existing block
    setDoc((prev) => ({
      ...prev,
      blocks: prev.blocks.map((b) =>
        b.id === id && b.type === "shell"
          ? { ...b, cmd, status: "running", output: "" }
          : b,
      ),
    }));

    vscode.postMessage({ type: "execute", blockId: id, cmd });
  };

  const stopBlock = (id: string) => {
    vscode.postMessage({ type: "stop", blockId: id });
  };

  const sendInput = (id: string, data: string) => {
    vscode.postMessage({ type: "terminalInput", blockId: id, data });
  };

  // Main Action: Run command from Input Section
  const handleInputRun = (cmd: string) => {
    const newBlock: Extract<FlowBlock, { type: "shell" }> = {
      id: generateId(),
      type: "shell",
      cmd: cmd,
      pos: { x: 0, y: 0, w: 1, h: 1 },
      status: "running",
      output: "",
      // Use a COPY of the current global context
      context: { ...doc.context! },
    };

    // Add new block to the end
    const newBlocks = [...doc.blocks, newBlock];
    const newDoc = { ...doc, blocks: newBlocks };

    setDoc(newDoc);
    vscode.postMessage({ type: "update", document: newDoc });
    vscode.postMessage({ type: "execute", blockId: newBlock.id, cmd });
  };

  const handleShellChange = (shell: string) => {
    const newContext = { ...doc.context!, shell };
    const newDoc = { ...doc, context: newContext };
    setDoc(newDoc);
    vscode.postMessage({ type: "update", document: newDoc });
  };

  return (
    <div className="bg-vscode-editor-background h-screen flex flex-col font-mono text-sm antialiased overflow-hidden">
      {/* Scrollable Main Area */}
      <main className="flex-1 overflow-y-auto p-4 space-y-4">
        {doc.blocks.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full opacity-50 text-vscode-descriptionForeground">
            <div className="text-xl mb-2">Welcome to Flow</div>
            <div className="text-sm">Type a command below to start</div>
          </div>
        )}

        {doc.blocks.map((block) => {
          if (block.type === "shell") {
            return (
              <ShellBlockComponent
                key={block.id}
                block={block}
                onRun={runBlock}
                onStop={stopBlock}
                onInput={sendInput}
                onDelete={deleteBlock}
              />
            );
          }
          return null;
        })}
      </main>

      {/* Fixed Input Section */}
      <InputSection
        context={doc.context || DEFAULT_CONTEXT}
        onRun={handleInputRun}
        onShellChange={handleShellChange}
      />
    </div>
  );
}
