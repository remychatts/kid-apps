/** Builds Arial vs Helvetica as an independent offline app. */
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import { createAppConfig } from "../../vite.shared.ts";

export default defineConfig(
  createAppConfig({
    appRoot: fileURLToPath(new URL(".", import.meta.url)),
    id: "arial-vs-helvetica",
    includeAssets: ["icon.svg"],
  }),
);
