/** Builds Frogball Final as an independent React PWA. */
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { createAppConfig } from "../../vite.shared.ts";

export default defineConfig(
  createAppConfig({
    appRoot: fileURLToPath(new URL(".", import.meta.url)),
    id: "frogball-final",
    plugins: [react()],
    includeAssets: ["icon-180.png", "icon-192.png", "icon-512.png"],
  }),
);
