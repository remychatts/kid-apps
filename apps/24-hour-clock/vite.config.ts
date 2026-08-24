/** Builds 24-Hour Clock as an independent offline app. */
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import { createAppConfig } from "../../vite.shared.ts";

export default defineConfig(
  createAppConfig({
    appRoot: fileURLToPath(new URL(".", import.meta.url)),
    id: "24-hour-clock",
    includeAssets: [
      "icon-512.png",
      "time-152.png",
      "time-167.png",
      "time-180.png",
    ],
  }),
);
