#!/usr/bin/env node
/**
 * Starts one app's Vite development server; catalogue is the default.
 * Examples: ./scripts/dev.mjs, ./scripts/dev.mjs drawing
 */
import { spawn } from "node:child_process";
import { allBuildIds } from "./apps.mjs";

const id = process.argv[2] ?? "catalog";
if (!allBuildIds.includes(id)) {
  console.error(`Unknown app: ${id}. Choose one of: ${allBuildIds.join(", ")}`);
  process.exit(1);
}

const child = spawn(
  "npx",
  ["vite", `apps/${id}`, "--config", `apps/${id}/vite.config.ts`],
  { stdio: "inherit" },
);
child.on("exit", (code) => process.exit(code ?? 1));
