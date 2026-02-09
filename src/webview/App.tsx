import React from "react";

export default function App() {
  if (!document) {
    return (
      <div
        style={{
          padding: 20,
          width: "100%",
          height: "100%",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        Loading...
      </div>
    );
  }
  return (
    <div>
      App <div style={{ color: "white", fontSize: "20px" }}>Hello World</div>
    </div>
  );
}
