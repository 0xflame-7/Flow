---
description: Implement basic terminal block with xterm.js and node-pty
---

# Workflow: Implement Terminal Block (Phase 1 Completion)

This workflow will guide you through implementing a working terminal block in your Flow extension.

## Prerequisites

- ✅ Extension infrastructure set up
- ✅ React webview working
- ✅ node-pty, xterm.js installed

## Part 1: Extension Host - PTY Manager

### 1. Create PTY Manager Service

Create a new file: `src/extension/PtyManager.ts`

**Responsibilities:**

- Spawn shell processes using node-pty
- Manage terminal sessions (create, destroy)
- Handle stdout/stderr streams
- Send data to webview via message passing

**Key APIs:**

```typescript
import * as pty from "node-pty";

class PtyManager {
  createTerminal(id: string, cwd?: string): void;
  writeToTerminal(id: string, data: string): void;
  destroyTerminal(id: string): void;
  onTerminalData(callback: (id: string, data: string) => void): void;
}
```

### 2. Update FlowEditorProvider

Modify `src/extension/FlowEditorProvider.ts` to:

- Instantiate PtyManager
- Set up message handler for webview messages
- Forward terminal data to webview

**Message Types:**

```typescript
// Webview → Extension
{ type: 'CREATE_TERMINAL', terminalId: string, cwd?: string }
{ type: 'TERMINAL_INPUT', terminalId: string, data: string }
{ type: 'DESTROY_TERMINAL', terminalId: string }

// Extension → Webview
{ type: 'TERMINAL_OUTPUT', terminalId: string, data: string }
{ type: 'TERMINAL_EXIT', terminalId: string, exitCode: number }
```

## Part 2: Webview - Terminal Component

### 3. Create Terminal Component

Create: `src/webview/components/Terminal.tsx`

**Responsibilities:**

- Render xterm.js instance
- Handle resize events (use addon-fit)
- Send user input to extension host
- Display output from extension host

**Dependencies:**

```typescript
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
```

### 4. Set Up Messaging in Webview

In `src/webview/App.tsx`:

- Create VS Code API reference: `const vscode = acquireVsCodeApi()`
- Listen for messages from extension host
- Send messages to extension host

**Example:**

```typescript
// Send to extension
vscode.postMessage({ type: "CREATE_TERMINAL", terminalId: "term-1" });

// Receive from extension
window.addEventListener("message", (event) => {
  const message = event.data;
  if (message.type === "TERMINAL_OUTPUT") {
    terminal.write(message.data);
  }
});
```

## Part 3: Integration & Testing

### 5. Update App.tsx

Modify `src/webview/App.tsx` to:

- Render a single Terminal component
- Create a terminal on mount
- Handle cleanup on unmount

### 6. Test the Implementation

1. Run `pnpm run watch` (to build in watch mode)
2. Press F5 to launch Extension Development Host
3. Create a new `.flow` file (`Flow: New Flow File`)
4. Verify terminal appears and you can type commands
5. Test basic commands: `echo "Hello"`, `ls`, `pwd`

## Part 4: Polish & Improvements

### 7. Add Terminal Controls

Add UI buttons:

- Clear terminal
- Restart terminal
- Copy output

### 8. Handle Edge Cases

- Terminal doesn't fit webview → Use FitAddon
- Terminal survives file close → Clean up on panel dispose
- Multiple terminals → Use Map<terminalId, Terminal>

## Expected Outcome

After completing this workflow, you should be able to:

- ✅ Open a `.flow` file
- ✅ See a working terminal in the webview
- ✅ Type commands and see output
- ✅ Terminal state persists while file is open

## Next Workflow

Once this is complete, proceed to:

- `implement-block-system.md` - Add multiple blocks and masonry layout
