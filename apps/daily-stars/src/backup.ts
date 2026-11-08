/** Name-indexed WebDAV backups, matching Practice Stars' stash protocol. */
import { parseState, STORAGE_KEY, type State } from "./model.ts";
const ROOT = "/stash/daily-stars";
/** Encodes the full name without collisions between punctuation or non-Latin names. */
export function backupUrl(name: string) {
  return `${ROOT}/${encodeURIComponent(name.trim().normalize("NFC").toLowerCase())}.json`;
}
/** Builds the same UTF-8 Basic authentication used by Practice Stars. */
function headers(password: string) {
  return {
    Authorization: `Basic ${btoa(Array.from(new TextEncoder().encode(`stash:${password}`), (b) => String.fromCharCode(b)).join(""))}`,
    "Content-Type": "application/json",
  };
}
/** Reports status without displaying server response bodies or credentials. */
function check(response: Response) {
  if (!response.ok)
    throw new Error(
      response.status === 404
        ? "No backup found for this name."
        : response.status === 401 || response.status === 403
          ? "Check the stash password."
          : `Server backup unavailable (${response.status}).`,
    );
}
/** Uploads only this app's state, never the locally held password. */
export async function pushBackup(state: State, password: string) {
  const options = {
    method: "PUT",
    headers: headers(password),
    body: JSON.stringify({ [STORAGE_KEY]: JSON.stringify(state) }),
    signal: AbortSignal.timeout(15000),
  };
  let response = await fetch(backupUrl(state.name), options);
  if (response.status === 409) {
    const directory = await fetch(ROOT, {
      method: "MKCOL",
      headers: headers(password),
      signal: AbortSignal.timeout(15000),
    });
    if (directory.status !== 405) check(directory);
    response = await fetch(backupUrl(state.name), {
      ...options,
      signal: AbortSignal.timeout(15000),
    });
  }
  check(response);
}
/** Downloads and validates a backup without modifying local data. */
export async function restoreBackup(name: string, password: string) {
  const response = await fetch(backupUrl(name), {
    headers: headers(password),
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  check(response);
  const snapshot = await response.json();
  if (typeof snapshot?.[STORAGE_KEY] !== "string")
    throw new Error("This backup is not for Daily Stars.");
  const state = parseState(JSON.parse(snapshot[STORAGE_KEY]));
  if (
    state.name.trim().normalize("NFC").toLowerCase() !==
    name.trim().normalize("NFC").toLowerCase()
  )
    throw new Error("This backup belongs to a different name.");
  return state;
}
