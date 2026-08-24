/** Downloads and stores versioned reward and applause assets in IndexedDB. */
import type {
  ApplauseManifest,
  ApplauseManifestItem,
  CachedAsset,
  ImageManifest,
  ImageManifestItem,
} from "./types";

const DB_NAME = "practice-stars-assets";
const DB_VERSION = 1;
const IMAGE_STORE = "images";
const APPLAUSE_STORE = "applause";

type StoreName = typeof IMAGE_STORE | typeof APPLAUSE_STORE;

type StoredAsset = {
  version: string;
  name: string;
  blob: Blob;
};

class AssetStorageError extends Error {
  constructor(storeName: StoreName, itemName: string, cause: unknown) {
    super(storageErrorMessage(storeName, itemName), { cause });
    this.name = "AssetStorageError";
  }
}

let dbPromise: Promise<IDBDatabase> | null = null;

export async function fetchConfig<T>(url: string): Promise<T> {
  const response = await fetch(resolveAppUrl(url));
  if (!response.ok) {
    throw new Error(`Unable to fetch ${url}: ${response.status}`);
  }
  return (await response.json()) as T;
}

export async function syncImageAssets(
  version: string,
  onProgress: (done: number, total: number) => void,
): Promise<ImageManifest> {
  const manifest = await fetchConfig<ImageManifest>(
    `assets/${version}/images.json`,
  );
  await syncManifestItems(
    IMAGE_STORE,
    manifest.version,
    manifest.images,
    onProgress,
  );
  return manifest;
}

export async function syncApplauseAssets(
  version: string,
  onProgress: (done: number, total: number) => void,
): Promise<ApplauseManifest> {
  const manifest = await fetchConfig<ApplauseManifest>(
    `assets/${version}/applause.json`,
  );
  await syncManifestItems(
    APPLAUSE_STORE,
    manifest.version,
    manifest.applause,
    onProgress,
  );
  return manifest;
}

export async function listAssetNames(
  storeName: StoreName,
  version: string,
): Promise<string[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const request = tx
      .objectStore(storeName)
      .getAllKeys(IDBKeyRange.bound(`${version}:`, `${version}:\uffff`));
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      resolve(
        request.result.map((key) => String(key).slice(version.length + 1)),
      );
    };
  });
}

export async function getCachedAsset(
  storeName: StoreName,
  version: string,
  name: string,
): Promise<CachedAsset | null> {
  const db = await openDb();
  const stored = await getAsset(db, storeName, version, name);
  if (!stored) {
    return null;
  }
  return {
    name,
    blob: stored.blob,
    objectUrl: URL.createObjectURL(stored.blob),
  };
}

export async function getCachedAssetUrl(
  storeName: StoreName,
  version: string,
  name: string,
): Promise<string | null> {
  const asset = await getCachedAsset(storeName, version, name);
  return asset?.objectUrl ?? null;
}

export const assetStores = {
  images: IMAGE_STORE,
  applause: APPLAUSE_STORE,
} as const;

async function syncManifestItems(
  storeName: StoreName,
  version: string,
  items: Array<ImageManifestItem | ApplauseManifestItem>,
  onProgress: (done: number, total: number) => void,
): Promise<void> {
  const db = await openDb();
  let done = 0;
  onProgress(done, items.length);

  for (const item of items) {
    const cached = await getAsset(db, storeName, version, item.name);
    if (!cached) {
      const response = await fetch(resolveAppUrl(item.url));
      if (!response.ok) {
        throw new Error(`Unable to fetch ${item.url}: ${response.status}`);
      }
      try {
        await putAsset(db, storeName, {
          version,
          name: item.name,
          blob: await response.blob(),
        });
      } catch (error: unknown) {
        throw new AssetStorageError(storeName, item.name, error);
      }
    }
    done += 1;
    onProgress(done, items.length);
  }
}

async function openDb(): Promise<IDBDatabase> {
  dbPromise ??= new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onupgradeneeded = () => {
      const db = request.result;
      for (const store of [IMAGE_STORE, APPLAUSE_STORE]) {
        if (!db.objectStoreNames.contains(store)) {
          db.createObjectStore(store);
        }
      }
    };
    request.onsuccess = () => resolve(request.result);
  });
  return dbPromise;
}

function resolveAppUrl(path: string): URL {
  return new URL(path.replace(/^\/+/, ""), appBaseUrl());
}

function appBaseUrl(): URL {
  return new URL(import.meta.env.BASE_URL, window.location.href);
}

function assetKey(version: string, name: string): string {
  return `${version}:${name}`;
}

async function getAsset(
  db: IDBDatabase,
  storeName: StoreName,
  version: string,
  name: string,
): Promise<StoredAsset | undefined> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const request = tx.objectStore(storeName).get(assetKey(version, name));
    request.onerror = () => reject(request.error);
    request.onsuccess = () =>
      resolve(request.result as StoredAsset | undefined);
  });
}

async function putAsset(
  db: IDBDatabase,
  storeName: StoreName,
  asset: StoredAsset,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    tx.onerror = () => reject(tx.error);
    tx.oncomplete = () => resolve();
    const request = tx
      .objectStore(storeName)
      .put(asset, assetKey(asset.version, asset.name));
    request.onerror = () => reject(request.error);
  });
}

function storageErrorMessage(storeName: StoreName, itemName: string): string {
  const assetKind = storeName === IMAGE_STORE ? "reward picture" : "applause";
  return `Unable to save ${assetKind} assets to IndexedDB while storing ${itemName}. Private browser mode can block this storage; try again in a normal browser window.`;
}
