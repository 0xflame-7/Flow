import { useEffect, useState } from "react";
import { Web } from "../utils/logger";
import { FlowDocument } from "../types/MessageProtocol";
import { useDocument } from "./hooks/useDocument";
import { useBlockExecution } from "./hooks/useBlockExecution";
import { useExtensionMessage } from "./hooks/useExtensionMessage";
import { ShellBlock } from "./components/ShellBlock";
import { InputSection } from "./components/InputSection";
import { defaultDoc } from "../utils/constants";
import ColorBlock from "./components/colorBlock";

declare const acquireVsCodeApi: () => { postMessage: (message: any) => void };

const vscode = acquireVsCodeApi();
Web.setVSCode(vscode);

/**
 * Main App Component
 * Orchestrates document state, execution state, and message handling
 */
export default function App() {
  const [doc, setDoc] = useState<FlowDocument>(defaultDoc);
  const [availableShells, setAvailableShells] = useState<
    { label: string; path: string; icon: string }[]
  >([]);

  // Document operations (CRUD on blocks, sync with extension)
  const { updateDoc, runBlock, stopBlock, sendInput, deleteBlock } =
    useDocument(vscode, doc, setDoc);

  // Block execution state management (running, output, completion)
  const {
    handleExecutionStart,
    handleExecutionOutput,
    handleExecutionEnd,
    getBlockState,
    clearBlockOutput,
  } = useBlockExecution(doc, setDoc);

  // Handle incoming messages from extension
  useExtensionMessage(
    vscode,
    (newDoc) => {
      // Update from extension (don't sync back)
      setDoc(newDoc);
    },
    {
      onStart: handleExecutionStart,
      onOutput: handleExecutionOutput,
      onEnd: handleExecutionEnd,
      onShellConfig: (shells) => {
        Web.info(`[App] Received shell config: ${shells.length} shells`);
        setAvailableShells(shells);
      },
    },
  );

  // Notify extension that webview is ready
  useEffect(() => {
    Web.info("App mounted, sending ready message");
    vscode.postMessage({ type: "ready" });
    vscode.postMessage({ type: "requestShellConfig" });
  }, []);

  /**
   * Handle command execution from input section
   */
  const handleInputRun = (cmd: string) => {
    runBlock(null, cmd); // null blockId = create new block
  };

  /**
   * Handle shell change from input section
   */
  const handleShellChange = (shell: string) => {
    const newContext = { ...doc.context!, shell };
    const newDoc = { ...doc, context: newContext };
    updateDoc(newDoc);
  };

  return (
    <div className="bg-vscode-editor-background h-screen flex flex-col font-mono text-sm antialiased overflow-hidden">
      {/* Scrollable Main Area */}
      <main className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Empty State */}
        {doc.blocks.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full opacity-50 text-vscode-descriptionForeground">
            <div className="text-xl mb-2">Welcome to Flow</div>
            <div className="text-sm">Type a command below to start</div>
          </div>
        )}

        {/* Render Shell Blocks */}
        {/* {doc.blocks.map((block) => {
          if (block.type === "shell") {
            return (
              <ShellBlock
                key={block.id}
                block={block}
                onRun={runBlock}
                onStop={stopBlock}
                onInput={sendInput}
                onDelete={deleteBlock}
              />
            );
          }
          // Future: Render other block types (markdown, etc.)
          return null;
        })} */}
        <ColorBlock />
      </main>

      {/* Fixed Input Section */}
      <InputSection
        context={doc.context!}
        onRun={handleInputRun}
        onShellChange={handleShellChange}
        availableShells={availableShells}
      />
    </div>
  );
}
