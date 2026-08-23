/** Builds Pet Chooser as an independent offline app. */
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import { createAppConfig } from "../../vite.shared.ts";

export default defineConfig(
  createAppConfig({
    appRoot: fileURLToPath(new URL(".", import.meta.url)),
    id: "pet-chooser",
    includeAssets: [
      "pet-creator-icon-180.png",
      "pet-creator-icon-192.png",
      "pet-creator-icon-512.png",
    ],
  }),
);
