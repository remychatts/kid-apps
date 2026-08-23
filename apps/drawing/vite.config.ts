/** Builds the Drawing Prompt Machine as an independent offline app. */
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import { createAppConfig } from "../../vite.shared.ts";

export default defineConfig(
  createAppConfig({
    appRoot: fileURLToPath(new URL(".", import.meta.url)),
    id: "drawing",
    includeAssets: ["icon.svg"],
  }),
);
