import { useCallback } from "react";
import { FlowDocument, FlowBlock } from "../../types/MessageProtocol";
import { Web } from "../../utils/logger";
import { generateId } from "../../utils/helper";

/**
 * Hook to manage Flow document operations
 * Handles CRUD operations on blocks and syncing with extension
 */
export function useDocument(
  vscode: any,
  doc: FlowDocument,
  setDoc: (doc: FlowDocument) => void,
) {
  /**
   * Update document and sync to extension
   */
  const updateDoc = useCallback(
    (newDoc: FlowDocument) => {
      setDoc(newDoc);
      Web.info("Syncing document to extension");
      vscode.postMessage({ type: "update", document: newDoc });
    },
    [vscode, setDoc],
  );

  /**
   * Run a command block
   * If blockId is null, creates a new block
   * If blockId exists, re-runs existing block
   */
  const runBlock = useCallback(
    (blockId: string | null, cmd: string) => {
      if (blockId === null) {
        // Create new block
        const newBlock: Extract<FlowBlock, { type: "shell" }> = {
          id: generateId(),
          type: "shell",
          cmd,
          pos: { x: 0, y: 0, w: 1, h: 1 },
          status: "idle",
          output: "",
          context: { ...doc.context! }, // Snapshot current context
        };

        const newDoc = { ...doc, blocks: [...doc.blocks, newBlock] };
        updateDoc(newDoc);

        // Trigger execution
        vscode.postMessage({ type: "execute", blockId: newBlock.id, cmd });
      } else {
        // Re-run existing block
        const newDoc = {
          ...doc,
          blocks: doc.blocks.map((b) =>
            b.id === blockId && b.type === "shell"
              ? {
                  ...b,
                  cmd,
                  status: "idle" as const,
                  output: "",
                  exitCode: undefined,
                }
              : b,
          ),
        };
        updateDoc(newDoc);

        // Trigger execution
        vscode.postMessage({ type: "execute", blockId, cmd });
      }
    },
    [doc, updateDoc, vscode],
  );

  /**
   * Stop a running block
   */
  const stopBlock = useCallback(
    (blockId: string) => {
      Web.info(`Stopping block: ${blockId}`);
      vscode.postMessage({ type: "stop", blockId });
    },
    [vscode],
  );

  /**
   * Send input to a running block's stdin
   */
  const sendInput = useCallback(
    (blockId: string, data: string) => {
      vscode.postMessage({ type: "terminalInput", blockId, data });
    },
    [vscode],
  );

  /**
   * Delete a block from the document
   */
  const deleteBlock = useCallback(
    (blockId: string) => {
      Web.info(`Deleting block: ${blockId}`);
      const newDoc = {
        ...doc,
        blocks: doc.blocks.filter((b) => b.id !== blockId),
      };
      updateDoc(newDoc);
    },
    [doc, updateDoc],
  );

  return {
    updateDoc,
    runBlock,
    stopBlock,
    sendInput,
    deleteBlock,
  };
}
