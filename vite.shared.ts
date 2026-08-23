/** Shared Vite and Workbox configuration for every independently served app. */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { PluginOption, UserConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

type RegistryApp = {
  id: string;
  title: string;
  shortName: string;
  description: string;
  themeColour: string;
  backgroundColour: string;
  orientation: "any" | "landscape" | "portrait";
  icons: Array<{
    src: string;
    sizes: string;
    type: string;
    purpose?: string;
  }>;
};

type AppConfigOptions = {
  appRoot: string;
  id: string;
  plugins?: PluginOption[];
  includeAssets?: string[];
  outputAtSiteRoot?: boolean;
};

const repositoryRoot = dirname(fileURLToPath(import.meta.url));
const registry = JSON.parse(
  readFileSync(resolve(repositoryRoot, "app-registry.json"), "utf8"),
) as RegistryApp[];
const catalogue: RegistryApp = {
  id: "catalog",
  title: "Alyx's Apps",
  shortName: "Alyx's Apps",
  description: "A collection of playful, family-friendly web apps.",
  themeColour: "#07182d",
  backgroundColour: "#f3fbff",
  orientation: "any",
  icons: [
    {
      src: "icon.svg",
      sizes: "any",
      type: "image/svg+xml",
      purpose: "any maskable",
    },
  ],
};

/** Builds a relative-path-safe, offline-capable Vite configuration for one app. */
export function createAppConfig({
  appRoot,
  id,
  plugins = [],
  includeAssets = [],
  outputAtSiteRoot = false,
}: AppConfigOptions): UserConfig {
  const app =
    id === catalogue.id
      ? catalogue
      : registry.find((candidate) => candidate.id === id);
  if (!app) throw new Error(`Unknown app in app-registry.json: ${id}`);

  return {
    root: appRoot,
    base: "./",
    plugins: [
      ...plugins,
      VitePWA({
        registerType: "autoUpdate",
        injectRegister: "auto",
        includeAssets,
        manifest: {
          name: app.title,
          short_name: app.shortName,
          description: app.description,
          theme_color: app.themeColour,
          background_color: app.backgroundColour,
          display: "standalone",
          orientation: app.orientation,
          scope: "./",
          start_url: "./",
          icons: app.icons,
        },
        workbox: {
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
          maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
          globPatterns: [
            "**/*.{html,js,css,json,svg,png,jpg,jpeg,webp,woff,woff2,mp3,webmanifest}",
          ],
          navigateFallback: "index.html",
          navigateFallbackDenylist:
            id === "catalog"
              ? [
                  new RegExp(
                    `/(?:${registry.map((candidate) => candidate.id).join("|")})(?:/|$)`,
                  ),
                ]
              : undefined,
        },
      }),
    ],
    build: {
      outDir: outputAtSiteRoot
        ? resolve(repositoryRoot, "dist")
        : resolve(repositoryRoot, "dist", id),
      emptyOutDir: false,
    },
  };
}
