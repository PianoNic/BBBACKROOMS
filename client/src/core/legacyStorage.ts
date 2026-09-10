export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const LEGACY_LOCAL_KEYS: readonly (readonly [string, string])[] = [
  ["bbb_settings", "nachsitzen_settings"],
  ["bbb_avatar", "nachsitzen_avatar"],
  ["bbb_name", "nachsitzen_name"],
  ["bbb_color", "nachsitzen_color"],
  ["bbb_active_pack", "nachsitzen_active_pack"],
];

export const LEGACY_SESSION_KEYS: readonly (readonly [string, string])[] = [
  ["bbb_lobby_resume", "nachsitzen_lobby_resume"],
  ["bbb-intro-seen", "nachsitzen-intro-seen"],
  ["bbb_menu_back", "nachsitzen_menu_back"],
];

const LEGACY_TEXTURE_PACK_DB_NAME = "bbb_texture_packs";
const TEXTURE_PACK_DB_NAME = "nachsitzen_texture_packs";
const TEXTURE_PACK_STORE_NAME = "packs";
const TEXTURE_PACK_DB_VERSION = 1;

function safeGet(storage: StorageLike, key: string): string | null {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(storage: StorageLike, key: string, value: string): void {
  try {
    storage.setItem(key, value);
  } catch {}
}

function safeRemove(storage: StorageLike, key: string): void {
  try {
    storage.removeItem(key);
  } catch {}
}

export function migrateStorageKeys(
  storage: StorageLike,
  pairs: readonly (readonly [string, string])[],
): void {
  for (const [oldKey, newKey] of pairs) {
    const oldValue = safeGet(storage, oldKey);
    if (oldValue !== null) {
      const newValue = safeGet(storage, newKey);
      if (newValue === null) {
        safeSet(storage, newKey, oldValue);
      }
    }
    safeRemove(storage, oldKey);
  }
}

export function migrateLegacyStorage(): void {
  if (typeof localStorage !== "undefined") {
    migrateStorageKeys(localStorage, LEGACY_LOCAL_KEYS);
  }
  if (typeof sessionStorage !== "undefined") {
    migrateStorageKeys(sessionStorage, LEGACY_SESSION_KEYS);
  }
}

let texturePackMigration: Promise<void> | undefined;

export function migrateLegacyTexturePackDb(factory?: IDBFactory): Promise<void> {
  if (!texturePackMigration) {
    texturePackMigration = runTexturePackMigration(factory).catch(() => undefined);
  }
  return texturePackMigration;
}

async function runTexturePackMigration(factory?: IDBFactory): Promise<void> {
  const idb = factory ?? (typeof indexedDB !== "undefined" ? indexedDB : undefined);
  if (!idb) return;

  const legacyExists = await legacyDatabaseExists(idb);
  if (!legacyExists) return;

  const legacyDb = await openExistingDatabase(idb, LEGACY_TEXTURE_PACK_DB_NAME);
  if (!legacyDb) return;

  if (!legacyDb.objectStoreNames.contains(TEXTURE_PACK_STORE_NAME)) {
    legacyDb.close();
    return;
  }

  const legacyStore = legacyDb
    .transaction(TEXTURE_PACK_STORE_NAME, "readonly")
    .objectStore(TEXTURE_PACK_STORE_NAME);
  const keyPath = legacyStore.keyPath;
  const autoIncrement = legacyStore.autoIncrement;

  const records = await readAllRecords(legacyDb, keyPath);
  legacyDb.close();

  const newDb = await openOrCreateDatabase(idb, keyPath, autoIncrement);
  const isEmpty = await storeIsEmpty(newDb);
  if (isEmpty) {
    await writeRecords(newDb, records);
  }
  newDb.close();

  await deleteDatabase(idb, LEGACY_TEXTURE_PACK_DB_NAME);
}

function legacyDatabaseExists(idb: IDBFactory): Promise<boolean> {
  if (typeof idb.databases === "function") {
    return idb
      .databases()
      .then((dbs) => dbs.some((info) => info.name === LEGACY_TEXTURE_PACK_DB_NAME))
      .catch(() => false);
  }

  return new Promise<boolean>((resolve) => {
    let existed = true;
    let request: IDBOpenDBRequest;
    try {
      request = idb.open(LEGACY_TEXTURE_PACK_DB_NAME);
    } catch {
      resolve(false);
      return;
    }

    request.onupgradeneeded = () => {
      existed = false;
      try {
        request.transaction?.abort();
      } catch {}
    };

    request.onsuccess = () => {
      try {
        request.result.close();
      } catch {}
      resolve(existed);
    };

    request.onerror = () => {
      if (!existed) {
        try {
          idb.deleteDatabase(LEGACY_TEXTURE_PACK_DB_NAME);
        } catch {}
      }
      resolve(false);
    };

    request.onblocked = () => resolve(false);
  });
}

function openExistingDatabase(idb: IDBFactory, name: string): Promise<IDBDatabase | undefined> {
  return new Promise((resolve) => {
    let request: IDBOpenDBRequest;
    try {
      request = idb.open(name);
    } catch {
      resolve(undefined);
      return;
    }

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(undefined);
    request.onblocked = () => resolve(undefined);
  });
}

function readAllRecords(
  db: IDBDatabase,
  keyPath: string | string[] | null,
): Promise<{ key: IDBValidKey | undefined; value: unknown }[]> {
  return new Promise((resolve) => {
    try {
      const store = db
        .transaction(TEXTURE_PACK_STORE_NAME, "readonly")
        .objectStore(TEXTURE_PACK_STORE_NAME);

      if (keyPath === null || keyPath === undefined) {
        const keysRequest = store.getAllKeys();
        const valuesRequest = store.getAll();
        let keys: IDBValidKey[] | undefined;
        let values: unknown[] | undefined;

        const tryResolve = () => {
          if (keys !== undefined && values !== undefined) {
            resolve(values.map((value, index) => ({ key: keys?.[index], value })));
          }
        };

        keysRequest.onsuccess = () => {
          keys = keysRequest.result;
          tryResolve();
        };
        valuesRequest.onsuccess = () => {
          values = valuesRequest.result;
          tryResolve();
        };
        keysRequest.onerror = () => resolve([]);
        valuesRequest.onerror = () => resolve([]);
      } else {
        const valuesRequest = store.getAll();
        valuesRequest.onsuccess = () => {
          resolve(valuesRequest.result.map((value) => ({ key: undefined, value })));
        };
        valuesRequest.onerror = () => resolve([]);
      }
    } catch {
      resolve([]);
    }
  });
}

function openOrCreateDatabase(
  idb: IDBFactory,
  legacyKeyPath: string | string[] | null,
  legacyAutoIncrement: boolean,
): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    let request: IDBOpenDBRequest;
    try {
      request = idb.open(TEXTURE_PACK_DB_NAME, TEXTURE_PACK_DB_VERSION);
    } catch (error) {
      reject(error instanceof Error ? error : new Error(String(error)));
      return;
    }

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(TEXTURE_PACK_STORE_NAME)) {
        db.createObjectStore(TEXTURE_PACK_STORE_NAME, {
          keyPath: legacyKeyPath ?? undefined,
          autoIncrement: legacyAutoIncrement,
        });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("open failed"));
    request.onblocked = () => reject(new Error("blocked"));
  });
}

function storeIsEmpty(db: IDBDatabase): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const store = db
        .transaction(TEXTURE_PACK_STORE_NAME, "readonly")
        .objectStore(TEXTURE_PACK_STORE_NAME);
      const countRequest = store.count();
      countRequest.onsuccess = () => resolve(countRequest.result === 0);
      countRequest.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

function writeRecords(
  db: IDBDatabase,
  records: { key: IDBValidKey | undefined; value: unknown }[],
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (records.length === 0) {
      resolve();
      return;
    }

    try {
      const transaction = db.transaction(TEXTURE_PACK_STORE_NAME, "readwrite");
      const store = transaction.objectStore(TEXTURE_PACK_STORE_NAME);

      for (const record of records) {
        if (record.key !== undefined) {
          store.put(record.value, record.key);
        } else {
          store.put(record.value);
        }
      }

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error("write failed"));
      transaction.onabort = () => reject(transaction.error ?? new Error("write aborted"));
    } catch (error) {
      reject(error instanceof Error ? error : new Error(String(error)));
    }
  });
}

function deleteDatabase(idb: IDBFactory, name: string): Promise<void> {
  return new Promise((resolve) => {
    try {
      const request = idb.deleteDatabase(name);
      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
      request.onblocked = () => resolve();
    } catch {
      resolve();
    }
  });
}
