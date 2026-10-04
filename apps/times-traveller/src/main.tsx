/** Mounts the time-travel game with locally bundled offline fonts. */
import React from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/fredoka";
import "@fontsource-variable/nunito";
import App from "./App.tsx";
import "./styles.css";
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
