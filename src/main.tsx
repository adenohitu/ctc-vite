import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import FlowApp from "./components/Flow/App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <FlowApp />
  </StrictMode>
);
