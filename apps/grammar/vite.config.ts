/** Builds Word Detective as an independent, relative-path-safe offline app. */
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { createAppConfig } from "../../vite.shared.ts";

export default defineConfig(
  createAppConfig({
    appRoot: fileURLToPath(new URL(".", import.meta.url)),
    id: "grammar",
    plugins: [react()],
    includeAssets: ["icon.svg", "icon-192.png", "icon-512.png"],
  }),
);
