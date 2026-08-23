#!/usr/bin/env node
/**
 * Builds the catalogue and every app into one static site.
 * Example: ./scripts/build.mjs
 */
import { rm } from "node:fs/promises";
import { spawn } from "node:child_process";
import { allBuildIds } from "./apps.mjs";

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

for (const id of allBuildIds) {
  await run("npx", [
    "vite",
    "build",
    `apps/${id}`,
    "--config",
    `apps/${id}/vite.config.ts`,
  ]);
}
