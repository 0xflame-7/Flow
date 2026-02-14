import { useCallback } from "react";
import { FlowDocument, FlowBlock } from "../../types/MessageProtocol";
import { Web } from "../../utils/logger";

/**
 * Hook to manage block execution state
 * Handles execution lifecycle: start, output streaming, completion
 */
export function useBlockExecution(
  doc: FlowDocument,
  setDoc: (doc: FlowDocument) => void,
) {
  /**
   * Mark a block as started (running state)
   */
  const handleExecutionStart = useCallback(
    (blockId: string) => {
      Web.info(`Block execution started: ${blockId}`);

      setDoc({
        ...doc,
        blocks: doc.blocks.map((block) =>
          block.id === blockId && block.type === "shell"
            ? {
                ...block,
                status: "running",
                output: "",
                exitCode: undefined,
              }
            : block,
        ),
      });
    },
    [doc, setDoc],
  );

  /**
   * Append output data to a running block
   * Uses string concatenation to build up the full output stream
   */
  const handleExecutionOutput = useCallback(
    (blockId: string, data: string) => {
      setDoc({
        ...doc,
        blocks: doc.blocks.map((block) =>
          block.id === blockId && block.type === "shell"
            ? {
                ...block,
                output: (block.output || "") + data,
              }
            : block,
        ),
      });
    },
    [doc, setDoc],
  );

  /**
   * Mark a block as completed with exit code
   * Sets status to success (code 0) or error (non-zero)
   */
  const handleExecutionEnd = useCallback(
    (blockId: string, exitCode: number) => {
      Web.info(`Block execution ended: ${blockId} (code: ${exitCode})`);

      setDoc({
        ...doc,
        blocks: doc.blocks.map((block) =>
          block.id === blockId && block.type === "shell"
            ? {
                ...block,
                status: exitCode === 0 ? "success" : "error",
                exitCode,
              }
            : block,
        ),
      });
    },
    [doc, setDoc],
  );

  /**
   * Get the current execution state of a specific block
   */
  const getBlockState = useCallback(
    (blockId: string) => {
      const block = doc.blocks.find((b) => b.id === blockId);
      if (!block || block.type !== "shell") {
        return null;
      }

      return {
        isRunning: block.status === "running",
        hasOutput: !!block.output,
        exitCode: block.exitCode,
        status: block.status,
      };
    },
    [doc],
  );

  /**
   * Clear output from a block (useful for re-running)
   */
  const clearBlockOutput = useCallback(
    (blockId: string) => {
      setDoc({
        ...doc,
        blocks: doc.blocks.map((block) =>
          block.id === blockId && block.type === "shell"
            ? {
                ...block,
                output: "",
                exitCode: undefined,
                status: "idle",
              }
            : block,
        ),
      });
    },
    [doc, setDoc],
  );

  return {
    handleExecutionStart,
    handleExecutionOutput,
    handleExecutionEnd,
    getBlockState,
    clearBlockOutput,
  };
}
