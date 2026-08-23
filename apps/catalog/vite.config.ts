/** Builds the app catalogue at the root of the assembled static site. */
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import { createAppConfig } from "../../vite.shared.ts";

export default defineConfig(
  createAppConfig({
    appRoot: fileURLToPath(new URL(".", import.meta.url)),
    id: "catalog",
    includeAssets: ["icon.svg"],
    outputAtSiteRoot: true,
  }),
);
