/** Defines the disabled placeholder interface for future cloud backups. */
import type { TrackerState } from "./types";
import { STORAGE_KEY } from "./trackerModel";

export type CloudLogEntry = {
  at: string;
  level: "info" | "error";
  message: string;
};

const LOG_LIMIT = 10;
const STASH_ROOT = "/stash/trumpet-practice";

type LocalStorageSnapshot = Record<string, string>;

export type SyncStatus = {
  ok: boolean;
  at: Date;
  message: string;
};

export class CloudSyncService {
  private readonly logs: CloudLogEntry[] = [];

  getLogs(): CloudLogEntry[] {
    return [...this.logs];
  }

  async push(state: TrackerState): Promise<void> {
    const password = state.stash_password?.trim();
    if (!password) {
      return;
    }

    const response = await this.putSnapshot(state, password);
    if (response.ok) {
      this.addLog("info", "Synced to server.");
      return;
    }

    if (response.status === 409) {
      await this.ensureRemoteDirectory(state, password);
      const retryResponse = await this.putSnapshot(state, password);
      if (retryResponse.ok) {
        this.addLog("info", "Synced to server.");
        return;
      }
      throw new Error(await responseMessage(retryResponse));
    }

    throw new Error(await responseMessage(response));
  }

  async restore(state: TrackerState): Promise<LocalStorageSnapshot> {
    const password = state.stash_password?.trim();
    if (!password) {
      throw new Error("Enter the stash password first.");
    }

    const response = await fetch(this.remoteUrl(state), {
      method: "GET",
      headers: this.authHeaders(password),
    });
    if (!response.ok) {
      throw new Error(await responseMessage(response));
    }

    const parsed: unknown = await response.json();
    const snapshot = validateSnapshot(parsed);
    this.addLog("info", "Restored from server.");
    return snapshot;
  }

  applySnapshot(snapshot: LocalStorageSnapshot, stashPassword: string): void {
    const rawState = snapshot[STORAGE_KEY];
    if (!rawState) {
      return;
    }

    const restoredState = JSON.parse(rawState) as TrackerState;
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...restoredState,
        stash_password: stashPassword,
      }),
    );
  }

  private addLog(level: CloudLogEntry["level"], message: string): void {
    this.logs.unshift({ at: new Date().toISOString(), level, message });
    this.logs.splice(LOG_LIMIT);
  }

  private async putSnapshot(
    state: TrackerState,
    password: string,
  ): Promise<Response> {
    return fetch(this.remoteUrl(state), {
      method: "PUT",
      headers: {
        ...this.authHeaders(password),
        "Content-Type": "application/json",
      },
      body: `${JSON.stringify(snapshotLocalStorage(), null, 2)}\n`,
    });
  }

  private remoteUrl(state: TrackerState): string {
    return `${this.remoteDirectoryUrl(state)}/${safeBasename(
      state.user_name,
    )}.json`;
  }

  private remoteDirectoryUrl(state: TrackerState): string {
    return `${STASH_ROOT}/${safeBasename(state.task_id)}`;
  }

  private async ensureRemoteDirectory(
    state: TrackerState,
    password: string,
  ): Promise<void> {
    await this.mkcolIfMissing(STASH_ROOT, password);
    await this.mkcolIfMissing(this.remoteDirectoryUrl(state), password);
  }

  private async mkcolIfMissing(url: string, password: string): Promise<void> {
    const response = await fetch(url, {
      method: "MKCOL",
      headers: this.authHeaders(password),
    });
    if (response.ok || response.status === 405) {
      return;
    }
    throw new Error(await responseMessage(response));
  }

  private authHeaders(password: string): Record<string, string> {
    return {
      Authorization: `Basic ${basicAuth("stash", password)}`,
    };
  }
}

export const cloudSync = new CloudSyncService();

function snapshotLocalStorage(): LocalStorageSnapshot {
  const value = localStorage.getItem(STORAGE_KEY);
  return value === null ? {} : { [STORAGE_KEY]: scrubPlaintextSecrets(value) };
}

function scrubPlaintextSecrets(value: string): string {
  try {
    const parsed = JSON.parse(value) as TrackerState;
    const { stash_password: _stashPassword, ...safeState } = parsed;
    return JSON.stringify(safeState);
  } catch {
    return value;
  }
}

function safeBasename(value: string): string {
  const safe = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return safe || "unnamed";
}

function basicAuth(user: string, password: string): string {
  const bytes = new TextEncoder().encode(`${user}:${password}`);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function validateSnapshot(value: unknown): LocalStorageSnapshot {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Backup did not contain a localStorage object.");
  }

  const snapshot = value as Record<string, unknown>;
  for (const [key, item] of Object.entries(snapshot)) {
    if (typeof item !== "string") {
      throw new Error(`Backup value for ${key} was not a string.`);
    }
  }

  const rawState = snapshot[STORAGE_KEY];
  if (typeof rawState !== "string") {
    throw new Error("Backup did not contain tracker state.");
  }

  let state: unknown;
  try {
    state = JSON.parse(rawState);
  } catch {
    throw new Error("Backup tracker state was not valid JSON.");
  }

  if (!isValidTrackerState(state)) {
    throw new Error("Backup tracker state was not valid for this app.");
  }

  return { [STORAGE_KEY]: rawState };
}

function isValidTrackerState(value: unknown): value is TrackerState {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const state = value as Partial<TrackerState>;
  return (
    typeof state.user_name === "string" &&
    typeof state.task_id === "string" &&
    typeof state.task_name === "string" &&
    typeof state.start_date === "string" &&
    typeof state.records === "object" &&
    state.records !== null &&
    !Array.isArray(state.records) &&
    typeof state.image_version === "string" &&
    typeof state.applause_version === "string"
  );
}

async function responseMessage(response: Response): Promise<string> {
  const body = await response.text().catch(() => "");
  const detail = body.trim();
  return detail
    ? `${response.status} ${response.statusText}: ${detail}`
    : `${response.status} ${response.statusText}`;
}
