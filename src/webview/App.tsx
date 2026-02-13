import { useEffect, useState, useRef } from "react";
import Ansi from "ansi-to-react";
import { ExtensionMessage, WebviewMessage } from "../types/MessageProtocol";
import { Web } from "../utils/logger";

declare const acquireVsCodeApi: () => { postMessage: (message: any) => void };

const vscode = acquireVsCodeApi();
Web.setVSCode(vscode);

export default function App() {
  const [output, setOutput] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Web.info("App mounted, sending ready message");

    // Send ready message to extension
    const readyMessage: WebviewMessage = { type: "ready" };
    vscode.postMessage(readyMessage);

    const messageHandler = (event: MessageEvent) => {
      const message: ExtensionMessage = event.data;

      switch (message.type) {
        case "terminalOutput":
          setOutput((prev) => prev + message.data);
          break;
        case "init":
        case "update":
        case "ack":
          // Ignore document updates for now as we are focusing on terminal
          break;
        default:
          Web.warn("Unknown message type received");
          break;
      }
    };

    window.addEventListener("message", messageHandler);

    return () => {
      Web.info("App unmounting, removing message listener");
      window.removeEventListener("message", messageHandler);
    };
  }, []);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "auto" });
    }
  }, [output]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputRef.current) {
      const cmd = inputRef.current.value;
      const message: WebviewMessage = {
        type: "terminalInput",
        data: cmd + "\r",
      };
      vscode.postMessage(message);
      inputRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-col h-screen bg-vscode-editor-background text-vscode-editor-foreground p-4 font-mono">
      Hello
      <div className="flex-1 overflow-auto whitespace-pre-wrap break-all pr-2">
        {output ? (
          <Ansi>{output}</Ansi>
        ) : (
          <div className="opacity-50 italic">
            Terminal Ready. Type a command...
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div className="mt-2 shrink-0">
        <div className="flex items-center border border-vscode-input-border rounded bg-vscode-input-background">
          <span className="pl-2 text-vscode-foreground opacity-50">{">"}</span>
          <input
            ref={inputRef}
            type="text"
            onKeyDown={handleKeyDown}
            className="w-full bg-transparent border-none p-2 text-vscode-input-foreground focus:outline-none"
            autoFocus
          />
        </div>
      </div>
    </div>
  );
}
