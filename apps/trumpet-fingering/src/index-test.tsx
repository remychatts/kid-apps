/** Mounts the Trumpet Fingering component playground. */
import React from "react";
import ReactDOM from "react-dom/client";
import "@fontsource/bravura";
import TestApp from "./TestApp";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <TestApp />
  </React.StrictMode>,
);
