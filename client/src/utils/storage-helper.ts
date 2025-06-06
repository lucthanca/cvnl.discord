type StorageValue = string | number | boolean | object | null;

class StorageHelper {
  private static storageArea = chrome.storage.local; // Change to `chrome.storage.sync` if required.

  static set<T extends StorageValue>(key: string, value: T): Promise<void> {
    return new Promise((resolve, reject) => {
      const data = { [key]: value };
      this.storageArea.set(data, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
  }

  static get<T extends StorageValue>(key: string): Promise<T | undefined> {
    return new Promise((resolve, reject) => {
      this.storageArea.get(key, (result) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(result[key] as T);
        }
      });
    });
  }

  static remove(key: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.storageArea.remove(key, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
  }

  static clear(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.storageArea.clear(() => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
  }
}

export default StorageHelper;