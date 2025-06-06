class IndexedDBHelper<T extends { id?: number | string }> {
  private dbName: string;
  private storeName: string;
  private initialized: boolean;
  private db: IDBDatabase | null = null;

  constructor(dbName: string, storeName: string) {
    this.dbName = dbName;
    this.storeName = storeName;
    this.initialized = false;
  }

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName);

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = request.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: "id", autoIncrement: true });
        }
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.initialized = true;
        resolve();
      };

      request.onerror = (event) => {
        reject((event.target as IDBRequest).error);
      };
    });
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  async add(data: Partial<T>): Promise<number> {
    return new Promise((resolve, reject) => {
      if (!this.db) return reject("Database is not initialized.");

      const transaction = this.db.transaction(this.storeName, "readwrite");
      const store = transaction.objectStore(this.storeName);
      const request = store.add(data);

      request.onsuccess = () => resolve(request.result as number);
      request.onerror = (event) => reject((event.target as IDBRequest).error);
    });
  }

  async get(id: number | string): Promise<T | undefined> {
    return new Promise((resolve, reject) => {
      if (!this.db) return reject("Database is not initialized.");

      const transaction = this.db.transaction(this.storeName, "readonly");
      const store = transaction.objectStore(this.storeName);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result as T | undefined);
      request.onerror = (event) => reject((event.target as IDBRequest).error);
    });
  }

  async getAll(): Promise<T[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) return reject("Database is not initialized.");

      const transaction = this.db.transaction(this.storeName, "readonly");
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result as T[]);
      request.onerror = (event) => reject((event.target as IDBRequest).error);
    });
  }

  async update(data: T): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) return reject("Database is not initialized.");

      const transaction = this.db.transaction(this.storeName, "readwrite");
      const store = transaction.objectStore(this.storeName);
      const request = store.put(data);

      request.onsuccess = () => resolve();
      request.onerror = (event) => reject((event.target as IDBRequest).error);
    });
  }

  async delete(id: number): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) return reject("Database is not initialized.");

      const transaction = this.db.transaction(this.storeName, "readwrite");
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = (event) => reject((event.target as IDBRequest).error);
    });
  }

  async clear(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) return reject("Database is not initialized.");

      const transaction = this.db.transaction(this.storeName, "readwrite");
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = (event) => reject((event.target as IDBRequest).error);
    });
  }

  close(): void {
    this.db?.close();
  }
}

const storage = new IndexedDBHelper<{ id?: number | string, name: string }>("HelloHana", "tasks");
export const configStorage = new IndexedDBHelper<{ id?: number | string, value: string }>("HelloHana", "configs");
export default storage;