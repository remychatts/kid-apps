#!/usr/bin/env node
/**
 * Checks that every site entry point and its precached bundles were generated.
 * Example: ./scripts/verify-build.mjs
 */
import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { allBuildIds } from "./apps.mjs";

const repositoryRoot = fileURLToPath(new URL("..", import.meta.url));

/** Returns all regular files below a directory as relative paths. */
async function listFiles(directory, prefix = "") {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const path = resolve(directory, entry.name);
      const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
      return entry.isDirectory()
        ? listFiles(path, relativePath)
        : [relativePath];
    }),
  );
  return nested.flat();
}

for (const id of allBuildIds) {
  const output = id === "catalog" ? "dist" : `dist/${id}`;
  const files = await listFiles(resolve(repositoryRoot, output));
  const scopedFiles =
    id === "catalog"
      ? files.filter(
          (file) =>
            !allBuildIds.slice(1).some((appId) => file.startsWith(`${appId}/`)),
        )
      : files;
  const serviceWorker = await readFile(
    resolve(repositoryRoot, output, "sw.js"),
    "utf8",
  );
  const indexHtml = await readFile(
    resolve(repositoryRoot, output, "index.html"),
    "utf8",
  );
  const bundles = scopedFiles.filter((file) =>
    /^assets\/.*\.(?:css|js)$/.test(file),
  );
  if (
    !scopedFiles.includes("index.html") ||
    !scopedFiles.includes("manifest.webmanifest")
  ) {
    throw new Error(`${id}: missing index.html or manifest.webmanifest`);
  }
  if (
    !indexHtml.includes('updateViaCache: "none"') ||
    !indexHtml.includes('addEventListener("controllerchange"')
  ) {
    throw new Error(`${id}: missing immediate service-worker update handling`);
  }
  for (const bundle of bundles) {
    if (!serviceWorker.includes(bundle)) {
      throw new Error(`${id}: ${bundle} is absent from the precache manifest`);
    }
  }
  console.log(
    `Verified ${id}: ${scopedFiles.length} files, ${bundles.length} bundles`,
  );
}
