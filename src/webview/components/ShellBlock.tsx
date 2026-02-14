import { useState, useEffect, useRef } from "react";
import Ansi from "ansi-to-react";
import { GitBranch, FolderOpen, StopCircle } from "lucide-react";
import { FlowBlock } from "../../types/MessageProtocol";
import { defaultContext } from "../../utils/constants";

interface ShellBlockProps {
  block: Extract<FlowBlock, { type: "shell" }>;
  onRun: (id: string, cmd: string) => void;
  onStop: (id: string) => void;
  onInput: (id: string, data: string) => void;
  onDelete: (id: string) => void;
}

/**
 * Shell Block Component
 * Displays command execution context, output, and interactive controls
 */
export function ShellBlock({
  block,
  onRun,
  onStop,
  onInput,
  onDelete,
}: ShellBlockProps) {
  const [terminalInput, setTerminalInput] = useState("");
  const outputRef = useRef<HTMLDivElement>(null);

  // Auto-scroll output to bottom
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [block.output]);

  /**
   * Handle Enter key in stdin input
   */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      onInput(block.id, terminalInput + "\r");
      setTerminalInput("");
    }
  };

  const isRunning = block.status === "running";
  const context = block.context || defaultContext;

  return (
    <div className="border border-vscode-panel-border rounded mb-4 bg-vscode-editor-background overflow-hidden flex flex-col group relative hover:bg-vscode-list-hoverBackground transition-colors duration-200">
      {/* Block Header with Context Info */}
      <div className="flex items-center justify-between p-2 text-xs select-none">
        <div className="flex items-center gap-2 text-vscode-descriptionForeground">
          {/* Block ID */}
          <span className="font-bold opacity-70">#{block.id.substr(0, 4)}</span>

          {/* Status Indicator */}
          {block.status === "success" && (
            <span className="text-vscode-ansi-green">✓</span>
          )}
          {block.status === "error" && (
            <span className="text-vscode-error">✗</span>
          )}

          {/* Remote/Local */}
          <span className="text-vscode-button-background font-bold ml-2">
            [local]
          </span>

          {/* Git Branch */}
          <div className="flex items-center gap-1">
            <GitBranch size={12} />
            <span>{context.branch}</span>
          </div>

          {/* Current Directory */}
          <div className="flex items-center gap-1">
            <FolderOpen size={12} />
            <span className="truncate max-w-[150px]" title={context.cwd}>
              {context.cwd}
            </span>
          </div>

          {/* Prompt */}
          <span className="text-vscode-button-background font-bold">$</span>

          {/* Command */}
          <span className="text-vscode-foreground font-medium">
            {block.cmd}
          </span>
        </div>

        {/* Action Buttons (visible on hover) */}
        <div className="opacity-0 group-hover:opacity-100 transition-all duration-200 z-10 flex items-center gap-1 bg-vscode-editor-background rounded p-0.5 border border-vscode-input-border">
          {isRunning ? (
            <button
              onClick={() => onStop(block.id)}
              className="p-1 text-vscode-descriptionForeground hover:text-red-400 rounded"
              title="Stop"
            >
              <StopCircle size={18} />
            </button>
          ) : (
            <button
              onClick={() => onRun(block.id, block.cmd)}
              className="p-1 text-vscode-descriptionForeground hover:text-vscode-foreground rounded"
              title="Re-run"
            >
              <span className="material-symbols-outlined text-lg leading-none">
                refresh
              </span>
            </button>
          )}

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

      {/* Output Area */}
      {(block.output || isRunning) && (
        <div className="p-2 border-t border-vscode-panel-border bg-vscode-terminal-bg min-h-[100px] max-h-[400px] flex flex-col">
          {/* ANSI Output */}
          <div
            ref={outputRef}
            className="flex-1 overflow-auto whitespace-pre-wrap break-all font-mono text-sm p-2 text-vscode-terminal-fg"
          >
            <Ansi>{block.output || ""}</Ansi>

            {/* Exit Code */}
            {block.exitCode !== undefined && (
              <div className="mt-2 text-xs opacity-50 text-gray-400">
                Process exited with code {block.exitCode}
              </div>
            )}
          </div>

          {/* Interactive Stdin Input (only when running) */}
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
}
