#!/usr/bin/env node
/**
 * Runs independent quality checks concurrently, then builds and verifies the site.
 * Example: ./scripts/ci.mjs
 */
import { spawn } from "node:child_process";

/** Runs one npm script and rejects if it does not exit successfully. */
function runScript(name) {
  return new Promise((resolve, reject) => {
    const child = spawn("npm", ["run", name], { stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`npm run ${name} exited with status ${code}`));
    });
  });
}

await Promise.all(["format:check", "lint", "typecheck", "test"].map(runScript));
await runScript("build");
await runScript("verify");
