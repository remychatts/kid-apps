/** Loads the reviewed sentence pool and class introductions without runtime requests. */
import pool from "../sentence-pool.json" with { type: "json" };
import type { Entry, Guide, WordClass } from "./types.ts";

export const entries = pool.categories.flatMap((category) =>
  category.entries.map((entry) => ({ ...entry, category: category.name })),
) as Entry[];
export const guides = pool.wordClassGuides as Record<WordClass, Guide>;
