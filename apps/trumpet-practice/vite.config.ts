/** Builds Practice Stars as an independent React PWA. */
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { createAppConfig } from "../../vite.shared.ts";

export default defineConfig(
  createAppConfig({
    appRoot: fileURLToPath(new URL(".", import.meta.url)),
    id: "trumpet-practice",
    plugins: [react()],
    includeAssets: [
      "app-icon.svg",
      "apple-touch-icon.png",
      "favicon-32.png",
      "icons/*.png",
    ],
  }),
);
