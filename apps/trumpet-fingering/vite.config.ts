/** Builds Trumpet Fingering as an independent React PWA. */
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { createAppConfig } from "../../vite.shared.ts";

export default defineConfig(
  createAppConfig({
    appRoot: fileURLToPath(new URL(".", import.meta.url)),
    id: "trumpet-fingering",
    plugins: [react()],
    includeAssets: ["trumpet-icon.png", "sounds/*.mp3"],
  }),
);
