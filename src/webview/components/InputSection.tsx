import React, { useState, useEffect, useRef } from "react";
import {
  GitBranch,
  FolderOpen,
  ChevronDown,
  ArrowRight,
  Terminal,
} from "lucide-react";
import { FlowContext } from "../../types/MessageProtocol";

interface InputSectionProps {
  context: FlowContext;
  onRun: (cmd: string) => void;
  onShellChange: (shell: string) => void;
  isRunning?: boolean;
}

const SHELL_OPTIONS = [
  { label: "bash", value: "bash" },
  { label: "zsh", value: "zsh" },
  { label: "powershell", value: "powershell" },
  { label: "cmd", value: "cmd" },
];

export const InputSection: React.FC<InputSectionProps> = ({
  context,
  onRun,
  onShellChange,
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

  return (
    <div className="bg-vscode-editor-background p-4 border-t border-vscode-panel-border shrink-0 z-40 relative">
      <div className="flex flex-col bg-vscode-input-background border border-vscode-input-border focus-within:border-vscode-focusBorder focus-within:ring-1 focus-within:ring-vscode-focusBorder/30 transition-all duration-100 rounded-sm overflow-hidden">
        {/* Context Bar */}
        <div className="flex items-center gap-x-2 text-xs bg-vscode-sidebar px-3 py-1.5 border-b border-vscode-panel-border select-none">
          <span className="text-vscode-button-background font-bold">
            [local]
          </span>

          <div className="flex items-center gap-1 text-vscode-descriptionForeground">
            <GitBranch size={14} />
            <span>{context.branch || "main"}</span>
          </div>

          <div className="flex items-center gap-1 text-vscode-descriptionForeground ml-2">
            <FolderOpen size={14} />
            <span
              className="text-vscode-foreground truncate max-w-[200px]"
              title={context.cwd}
            >
              {context.cwd || "~"}
            </span>
          </div>

          <span className="text-vscode-button-background font-bold ml-1">
            $
          </span>
        </div>

        {/* Input Area */}
        <div className="flex items-center bg-vscode-input-background">
          <div className="relative" ref={menuRef}>
            <div className="flex items-center border-r border-vscode-panel-border shrink-0">
              <button
                onClick={() => setShowShellMenu(!showShellMenu)}
                className="flex items-center gap-1.5 px-3 py-2 text-vscode-descriptionForeground hover:text-vscode-foreground hover:bg-vscode-list-hoverBackground transition-colors group"
              >
                <span className="text-[11px] font-bold tracking-tight uppercase">
                  {context.shell || "bash"}
                </span>
                <ChevronDown
                  size={14}
                  className="group-hover:text-vscode-foreground"
                />
              </button>
            </div>

            {/* Shell Dropdown */}
            {showShellMenu && (
              <div className="absolute bottom-full left-0 mb-1 w-32 bg-vscode-menu-background border border-vscode-menu-border rounded shadow-xl z-50 py-1">
                {SHELL_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      onShellChange(option.value);
                      setShowShellMenu(false);
                    }}
                    className={`nav-item flex items-center w-full px-3 py-1.5 text-xs text-left hover:bg-vscode-menu-selectionBackground hover:text-vscode-menu-selectionForeground ${
                      context.shell === option.value
                        ? "text-vscode-foreground font-medium"
                        : "text-vscode-descriptionForeground"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex-1 flex items-center px-3 py-2">
            <input
              ref={inputRef}
              autoFocus
              className="flex-1 bg-transparent border-none p-0 text-vscode-foreground focus:ring-0 placeholder-vscode-descriptionForeground font-mono text-sm leading-6 outline-none"
              placeholder="Type a command..."
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button
              onClick={handleRun}
              disabled={!input.trim()}
              className="ml-2 text-vscode-button-background hover:text-vscode-button-hoverBackground hover:bg-vscode-button-secondaryHoverBackground rounded p-1 flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
