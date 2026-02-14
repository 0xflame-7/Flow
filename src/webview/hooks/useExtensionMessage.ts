import { useEffect } from "react";
import { ExtensionMessage, FlowDocument } from "../../types/MessageProtocol";
import { Web } from "../../utils/logger";

interface ExecutionHandlers {
  onStart: (blockId: string) => void;
  onOutput: (blockId: string, data: string) => void;
  onEnd: (blockId: string, exitCode: number) => void;
  onShellConfig?: (
    shells: { label: string; path: string; icon: string }[],
  ) => void;
}

/**
 * Hook to handle messages from the extension
 * Routes messages to appropriate handlers
 */
export function useExtensionMessage(
  vscode: any,
  onDocumentUpdate: (doc: FlowDocument) => void,
  executionHandlers: ExecutionHandlers,
) {
  useEffect(() => {
    const messageHandler = (event: MessageEvent) => {
      const message: ExtensionMessage = event.data;

      switch (message.type) {
        case "init":
        case "update":
          Web.info(`Received ${message.type} message`);
          onDocumentUpdate(message.document);
          break;

        case "executionStart":
          executionHandlers.onStart(message.blockId);
          break;

        case "executionOutput":
          executionHandlers.onOutput(message.blockId, message.data);
          break;

        case "executionEnd":
          executionHandlers.onEnd(message.blockId, message.exitCode);
          break;

        case "shellConfig":
          if (executionHandlers.onShellConfig) {
            executionHandlers.onShellConfig(message.shells);
          }
          break;

        case "ack":
          Web.info(`Document update acknowledged: ${message.success}`);
          break;
      }
    };

    window.addEventListener("message", messageHandler);
    return () => window.removeEventListener("message", messageHandler);
  }, [onDocumentUpdate, executionHandlers]);
}
