import { describe, it, expect } from "vitest";
import {
  LEGACY_LOCAL_KEYS,
  LEGACY_SESSION_KEYS,
  migrateStorageKeys,
  migrateLegacyTexturePackDb,
  type StorageLike,
} from "./legacyStorage";

class FakeStorage implements StorageLike {
  private readonly map = new Map<string, string>();

  getItem(key: string): string | null {
    return this.map.has(key) ? this.map.get(key)! : null;
  }

  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }

  removeItem(key: string): void {
    this.map.delete(key);
  }

  has(key: string): boolean {
    return this.map.has(key);
  }
}

class ThrowingStorage implements StorageLike {
  getItem(): string | null {
    throw new Error("getItem blocked");
  }

  setItem(): void {
    throw new Error("setItem blocked");
  }

  removeItem(): void {
    throw new Error("removeItem blocked");
  }
}

describe("migrateStorageKeys", () => {
  it("copies an old key to the new name and removes the old key", () => {
    const storage = new FakeStorage();
    storage.setItem("bbb_name", "Piano");

    migrateStorageKeys(storage, [["bbb_name", "nachsitzen_name"]]);

    expect(storage.getItem("nachsitzen_name")).toBe("Piano");
    expect(storage.has("bbb_name")).toBe(false);
  });

  it("does not overwrite an existing new-name value, but still removes the old key", () => {
    const storage = new FakeStorage();
    storage.setItem("bbb_name", "OldValue");
    storage.setItem("nachsitzen_name", "KeepMe");

    migrateStorageKeys(storage, [["bbb_name", "nachsitzen_name"]]);

    expect(storage.getItem("nachsitzen_name")).toBe("KeepMe");
    expect(storage.has("bbb_name")).toBe(false);
  });

  it("is a no-op when the old key is absent", () => {
    const storage = new FakeStorage();

    migrateStorageKeys(storage, [["bbb_name", "nachsitzen_name"]]);

    expect(storage.has("bbb_name")).toBe(false);
    expect(storage.has("nachsitzen_name")).toBe(false);
  });

  it("does not throw when the storage throws on access", () => {
    const storage = new ThrowingStorage();

    expect(() =>
      migrateStorageKeys(storage, [["bbb_name", "nachsitzen_name"]]),
    ).not.toThrow();
  });
});

describe("legacy key lists", () => {
  it("has no duplicate new-side names across the local keys", () => {
    const newNames = LEGACY_LOCAL_KEYS.map(([, newKey]) => newKey);
    expect(new Set(newNames).size).toBe(newNames.length);
  });

  it("has no duplicate new-side names across the session keys", () => {
    const newNames = LEGACY_SESSION_KEYS.map(([, newKey]) => newKey);
    expect(new Set(newNames).size).toBe(newNames.length);
  });

  it("every new name starts with nachsitzen and carries no legacy prefix", () => {
    for (const [oldKey, newKey] of [...LEGACY_LOCAL_KEYS, ...LEGACY_SESSION_KEYS]) {
      expect(newKey.startsWith("nachsitzen")).toBe(true);
      expect(newKey.toLowerCase().includes(oldKey.toLowerCase())).toBe(false);
    }
  });
});

describe("migrateLegacyTexturePackDb", () => {
  it("resolves when no IndexedDB factory is available", async () => {
    await expect(migrateLegacyTexturePackDb(undefined)).resolves.toBeUndefined();
  });
});
