import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false, error: null };
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Error caught by ErrorBoundary:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: "20px", color: "red" }}>
          <h2>Something went wrong</h2>
          {process.env.NODE_ENV === "development" && (
            <pre>{this.state.error?.toString()}</pre>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}

const root = createRoot(document.getElementById("root")!);
root.render(
  <ErrorBoundary>
    <App />,
  </ErrorBoundary>,
);
