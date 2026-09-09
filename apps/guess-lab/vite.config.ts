/** Builds Guess Lab as an independent React PWA. */
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { createAppConfig } from "../../vite.shared.ts";

export default defineConfig(
  createAppConfig({
    appRoot: fileURLToPath(new URL(".", import.meta.url)),
    id: "guess-lab",
    plugins: [react()],
    includeAssets: ["icon.svg"],
  }),
);
