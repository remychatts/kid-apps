/** Loads the app registry used by development, build, and verification scripts. */
import { readFile } from "node:fs/promises";

const registryUrl = new URL("../app-registry.json", import.meta.url);

export const apps = JSON.parse(await readFile(registryUrl, "utf8"));
export const allBuildIds = ["catalog", ...apps.map((app) => app.id)];
