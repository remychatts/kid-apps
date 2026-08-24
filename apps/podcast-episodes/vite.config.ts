/** Builds Podcast Episodes as an independent offline application shell. */
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import { createAppConfig } from "../../vite.shared.ts";

export default defineConfig(
  createAppConfig({
    appRoot: fileURLToPath(new URL(".", import.meta.url)),
    id: "podcast-episodes",
    includeAssets: ["icon.svg", "episode-bundle.js"],
  }),
);
