#!/usr/bin/env node
/**
 * Builds the catalogue and every app into one static site.
 * Example: ./scripts/build.mjs
 */
import { rm } from "node:fs/promises";
import { spawn } from "node:child_process";
import { availableParallelism } from "node:os";
import { allBuildIds } from "./apps.mjs";

// Give local builds the same elapsed-time input supplied by GitHub Actions.
process.env.GITHUB_ACTION_STARTED_AT ??= String(Math.floor(Date.now() / 1000));

/** Runs one command and rejects if it does not exit successfully. */
function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} exited with status ${code}`));
    });
  });
}

await rm(new URL("../dist", import.meta.url), { recursive: true, force: true });

const appBuildIds = allBuildIds.filter((id) => id !== "catalog");
const workerCount = Math.min(4, availableParallelism(), appBuildIds.length);
let nextAppIndex = 0;

/** Builds apps from the shared queue until none remain. */
async function buildNextApps() {
  while (nextAppIndex < appBuildIds.length) {
    const id = appBuildIds[nextAppIndex];
    nextAppIndex += 1;
    await run("npx", [
      "vite",
      "build",
      `apps/${id}`,
      "--config",
      `apps/${id}/vite.config.ts`,
    ]);
  }
}

await Promise.all(Array.from({ length: workerCount }, buildNextApps));

// Build the catalogue last so its generation time and root service worker see the completed site.
await run("npx", [
  "vite",
  "build",
  "apps/catalog",
  "--config",
  "apps/catalog/vite.config.ts",
]);
