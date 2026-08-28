/** Boots the Penguin Peak React game. */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/fredoka";
import "./styles.css";
import { App } from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
