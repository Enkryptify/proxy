import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

function NestedPage() {
  return (
    <div style={{ fontFamily: "system-ui, sans-serif", padding: "2rem" }}>
      <h1>Nested Page</h1>
      <p>This is a nested entry point.</p>
    </div>
  );
}

createRoot(document.getElementById("nested-root")!).render(
  <StrictMode>
    <NestedPage />
  </StrictMode>,
);
