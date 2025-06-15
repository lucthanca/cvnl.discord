import { openDB } from 'idb';

const DB_NAME = 'thinhthom_tenor-cache';
const STORE_NAME = 'thinhthom_cache';
const TTL_MS = 24 * 60 * 60 * 1000; // 1 ngày

type CacheEntry<T = any> = {
  value: T;
  timestamp: number;
};

const dbPromise = openDB(DB_NAME, 1, {
  upgrade(db) {
    db.createObjectStore(STORE_NAME);
  },
});

export async function setCache<T>(key: string, value: T): Promise<void> {
  const db = await dbPromise;
  const entry: CacheEntry<T> = {
    value,
    timestamp: Date.now(),
  };
  await db.put(STORE_NAME, entry, key);
}

export async function getCache<T>(key: string): Promise<T | null> {
  const db = await dbPromise;
  const entry = (await db.get(STORE_NAME, key)) as CacheEntry<T> | undefined;

  if (!entry) return null;

  if (Date.now() - entry.timestamp > TTL_MS) {
    await db.delete(STORE_NAME, key); // hết hạn, xoá luôn
    return null;
  }

  return entry.value;
}

export async function clearCache(): Promise<void> {
  const db = await dbPromise;
  await db.clear(STORE_NAME);
}
