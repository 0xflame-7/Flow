import { useEffect, useState, useRef, useCallback } from "react";
import Ansi from "ansi-to-react";
import {
  ExtensionMessage,
  WebviewMessage,
  FlowDocument,
  FlowBlock,
} from "../types/MessageProtocol";
import { Web } from "../utils/logger";

declare const acquireVsCodeApi: () => { postMessage: (message: any) => void };

const vscode = acquireVsCodeApi();
Web.setVSCode(vscode);

// Helper for generating IDs
const generateId = () => Math.random().toString(36).substr(2, 9);

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

  return (
    <div className="border border-vscode-panel-border rounded mb-4 bg-vscode-editor-background overflow-hidden flex flex-col">
      {/* Header / Command Input */}
      <div className="flex items-center p-2 bg-vscode-editor-header-background border-b border-vscode-panel-border">
        <div className="font-bold text-xs mr-2 opacity-50 uppercase tracking-wider">
          SHELL
        </div>
        <input
          className="flex-1 bg-transparent border border-transparent hover:border-vscode-input-border focus:border-vscode-focusBorder rounded px-2 py-1 text-vscode-input-foreground outline-none"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Enter command..."
          disabled={isRunning}
        />
        <div className="flex gap-2 ml-2">
          {isRunning ? (
            <button
              onClick={() => onStop(block.id)}
              className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs uppercase font-medium"
            >
              Stop
            </button>
          ) : (
            <button
              onClick={() => onRun(block.id, input)}
              className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs uppercase font-medium"
            >
              Run
            </button>
          )}
          <button
            onClick={() => onDelete(block.id)}
            className="px-2 py-1 hover:bg-vscode-toolbar-hoverBackground rounded text-vscode-foreground opacity-60 hover:opacity-100"
            title="Delete Block"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Output Area */}
      {(block.output || isRunning) && (
        <div className="p-2 border-t border-vscode-panel-border bg-[#000000] min-h-[100px] max-h-[400px] flex flex-col">
          <div
            ref={outputRef}
            className="flex-1 overflow-auto whitespace-pre-wrap break-all font-mono text-sm p-2"
          >
            <Ansi>{block.output || ""}</Ansi>
            {block.exitCode !== undefined && (
              <div className="mt-2 text-xs opacity-50">
                Process exited with code {block.exitCode}
              </div>
            )}
          </div>

          {/* Stdin Input (One-line at bottom) */}
          {isRunning && (
            <div className="flex items-center border-t border-gray-800 mt-1 pt-1">
              <span className="text-gray-500 mr-2">$</span>
              <input
                type="text"
                value={terminalInput}
                onChange={(e) => setTerminalInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 bg-transparent border-none text-white outline-none font-mono text-sm"
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

  const addShellBlock = () => {
    const newBlock: Extract<FlowBlock, { type: "shell" }> = {
      id: generateId(),
      type: "shell",
      cmd: "",
      pos: { x: 0, y: 0, w: 1, h: 1 },
      status: "idle",
      output: "",
    };
    updateDoc({ ...doc, blocks: [...doc.blocks, newBlock] });
  };

  const deleteBlock = (id: string) => {
    updateDoc({ ...doc, blocks: doc.blocks.filter((b) => b.id !== id) });
  };

  const runBlock = (id: string, cmd: string) => {
    // Optimistic update
    setDoc((prev) => ({
      ...prev,
      blocks: prev.blocks.map((b) =>
        b.id === id && b.type === "shell" ? { ...b, cmd } : b,
      ),
    }));
    // Also save the cmd change to document before running? Yes.
    vscode.postMessage({
      type: "update",
      document: {
        ...doc,
        blocks: doc.blocks.map((b) =>
          b.id === id && b.type === "shell" ? { ...b, cmd } : b,
        ),
      },
    });

    vscode.postMessage({ type: "execute", blockId: id, cmd });
  };

  const stopBlock = (id: string) => {
    vscode.postMessage({ type: "stop", blockId: id });
  };

  const sendInput = (id: string, data: string) => {
    vscode.postMessage({ type: "terminalInput", blockId: id, data });
  };

  return (
    <div className="p-4 bg-vscode-editor-background min-h-screen">
      <div className="mb-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-vscode-foreground">Flow</h1>
        <button
          onClick={addShellBlock}
          className="px-3 py-1 md:py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium text-sm transition-colors"
        >
          + Add Block
        </button>
      </div>

      <div className="space-y-4">
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

        {doc.blocks.length === 0 && (
          <div className="text-center p-8 opacity-50 border border-dashed border-vscode-panel-border rounded">
            No blocks yet. Click "Add Block" to start.
          </div>
        )}
      </div>
    </div>
  );
}
