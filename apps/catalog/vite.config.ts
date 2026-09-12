/** Builds the app catalogue at the root of the assembled static site. */
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import { createAppConfig } from "../../vite.shared.ts";

const actionStartedAt = Number.parseInt(
  process.env.GITHUB_ACTION_STARTED_AT ?? "",
  10,
);
const generationTimeSeconds = Number.isFinite(actionStartedAt)
  ? Math.max(0, Math.floor(Date.now() / 1000) - actionStartedAt)
  : 0;

export default defineConfig({
  ...createAppConfig({
    appRoot: fileURLToPath(new URL(".", import.meta.url)),
    id: "catalog",
    includeAssets: ["icon.svg"],
    outputAtSiteRoot: true,
  }),
  define: {
    __CATALOGUE_GENERATION_TIME_SECONDS__: JSON.stringify(
      generationTimeSeconds,
    ),
  },
});
