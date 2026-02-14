import React, { useState, useEffect, useRef } from "react";
import {
  GitBranch,
  FolderOpen,
  ChevronDown,
  ArrowRight,
  Terminal,
} from "lucide-react";
import { FlowContext } from "../../types/MessageProtocol";
import { Web } from "../../utils/logger";

interface InputSectionProps {
  context: FlowContext;
  onRun: (cmd: string) => void;
  onShellChange: (shell: string) => void;
  availableShells: { label: string; path: string; icon: string }[];
  isRunning?: boolean;
}

export const InputSection: React.FC<InputSectionProps> = ({
  context,
  onRun,
  onShellChange,
  availableShells,
  isRunning = false,
}) => {
  const [input, setInput] = useState("");
  const [showShellMenu, setShowShellMenu] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowShellMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleRun = () => {
    if (input.trim()) {
      onRun(input);
      setInput("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleRun();
    }
  };

  const getShellDisplay = () => {
    if (!context.shell) return "bash";
    const found = availableShells.find((s) => s.path === context.shell);
    if (found) return found.label;
    // Fallback: simpler display than full path
    const parts = context.shell.split(/[\\/]/);
    return parts[parts.length - 1];
  };

  return (
    <div className="bg-(--vscode-editor-background) p-4 border-t border-(--vscode-panel-border) shrink-0 z-40 relative">
      <div className="flex flex-col bg-(--vscode-input-background) border border-(--vscode-panel-border) focus-within:border-(--vscode-focusBorder) focus-within:ring-1 focus-within:ring-(--vscode-focusBorder)/30 transition-all duration-100 rounded-sm overflow-hidden">
        {/* Context Bar */}
        <div className="flex items-center gap-x-2 text-xs bg-(--vscode-editorWidget-background) px-3 py-1.5 border-b border-[#505050] select-none font-mono">
          <span className="text-(--vscode-button-background) font-bold">
            [local]
          </span>

          <div className="flex items-center gap-1 text-(--vscode-descriptionForeground)">
            <GitBranch size={14} />
            <span>{context.branch}</span>
          </div>

          <div className="flex items-center gap-1 text-(--vscode-descriptionForeground)">
            <FolderOpen size={14} />
            <span
              className="text-(--vscode-button-background) truncate max-w-[300px]"
              title={context.cwd}
            >
              {context.cwd}
            </span>
          </div>
        </div>

        {/* Input Area */}
        <div className="flex items-center bg-(--vscode-input-background)">
          <div className="relative" ref={menuRef}>
            <div className="flex items-center border-r border-(--vscode-panel-border) shrink-0">
              <button
                onClick={() => setShowShellMenu(!showShellMenu)}
                className="flex items-center gap-1.5 px-3 py-2 text-(--vscode-input-foreground) hover:text-(--vscode-editor-foreground) hover:bg-(--vscode-editorWidget-background) transition-colors group"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`codicon ${availableShells.find((s) => s.path === context.shell)?.icon || "codicon-terminal"}`}
                  />
                  <span className="text-[11px] font-bold tracking-tight uppercase max-w-[100px] truncate font-mono">
                    {getShellDisplay()}
                  </span>
                </div>
                <ChevronDown
                  size={14}
                  className="text-(--vscode-descriptionForeground) group-hover:text-(--vscode-editor-foreground)"
                />
              </button>
            </div>

            {/* Shell Dropdown */}
            {showShellMenu && (
              <div className="absolute bottom-full left-0 mb-1 w-80 bg-(--vscode-menu-background) border border-(--vscode-menu-border) rounded shadow-xl z-100 py-1 max-h-80 overflow-y-auto">
                {availableShells.map((option) => {
                  Web.info(
                    `[InputSection] Shell: ${option.label} -> ${option.path}`,
                  );
                  return (
                    <button
                      key={option.label}
                      onClick={() => {
                        Web.info(
                          `[InputSection] Selected shell: ${option.label} -> ${option.path}`,
                        );
                        onShellChange(option.path);
                        setShowShellMenu(false);
                      }}
                      className={`nav-item flex items-center w-full px-4 py-2 text-sm text-left hover:bg-(--vscode-menu-selectionBackground) hover:text-(--vscode-menu-selectionForeground) transition-colors ${
                        context.shell === option.path
                          ? "text-(--vscode-editor-foreground) font-medium bg-(--vscode-menu-selectionBackground)/10"
                          : "text-(--vscode-menu-foreground)"
                      }`}
                      title={option.path}
                    >
                      <span className={`codicon ${option.icon} mr-3 text-lg`} />
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <span className="truncate font-medium font-mono">
                          {option.label}
                        </span>
                        <span className="truncate text-[10px] opacity-70">
                          {option.path}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex-1 flex items-center gap-2 px-3 py-2">
            <span className="text-(--vscode-button-background) font-bold">
              $
            </span>
            <input
              ref={inputRef}
              autoFocus
              className="flex-1 border-none p-0 text-(--vscode-input-foreground) caret-(--vscode-editorCursor-foreground) selection:bg-(--vscode-editor-selectionBackground) focus:ring-0 placeholder-(--vscode-input-placeholderForeground) font-mono text-sm leading-6 outline-none"
              placeholder="Type a command..."
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button
              onClick={handleRun}
              disabled={!input.trim()}
              className="ml-2 text-(--vscode-button-background) hover:text-(--vscode-button-foreground) rounded p-1 flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/5"
            >
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
