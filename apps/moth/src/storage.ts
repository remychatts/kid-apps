/** Atomic IndexedDB session storage; failures leave the lesson usable in memory. */
import { validSession, upgradeSession, type Session } from "./session.ts";
let database: Promise<IDBDatabase> | null = null;

/** Opens the private app database lazily and rejects blocked or unavailable storage. */
function open(): Promise<IDBDatabase> {
  if (!database)
    database = new Promise((resolve, reject) => {
      const request = indexedDB.open("moth-lesson", 1);
      request.onupgradeneeded = () =>
        request.result.createObjectStore("session");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      request.onblocked = () =>
        reject(new Error("Storage is busy in another window."));
    });
  return database;
}

/** Loads a versioned session without accepting malformed or incompatible history. */
export async function loadSession(): Promise<Session | null> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("session", "readonly");
    const request = transaction.objectStore("session").get("current");
    request.onsuccess = () => {
      const saved = upgradeSession(request.result);
      if (saved === undefined) resolve(null);
      else if (validSession(saved)) resolve(saved);
      else
        reject(
          new Error(
            "The saved lesson could not be read. A fresh lesson is ready.",
          ),
        );
    };
    request.onerror = () => reject(request.error);
  });
}

/** Resolves only after the entire session has committed successfully. */
export async function saveSession(session: Session): Promise<void> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("session", "readwrite");
    transaction.objectStore("session").put(session, "current");
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () =>
      reject(transaction.error ?? new Error("Save interrupted"));
  });
}
