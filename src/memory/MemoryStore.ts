import { MemoryItem, MemoryCategory } from "./MemoryTypes";

class LocalIndexedDB {
  private dbName = "igris_memory_db";
  private storeName = "memories";
  private version = 1;
  private db: IDBDatabase | null = null;

  init(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const request = indexedDB.open(this.dbName, this.version);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          this.db = request.result;
          resolve();
        };
        request.onupgradeneeded = (e: any) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains(this.storeName)) {
            db.createObjectStore(this.storeName, { keyPath: "id" });
          }
        };
      } catch (err) {
        reject(err);
      }
    });
  }

  private getStore(mode: IDBTransactionMode): IDBObjectStore {
    if (!this.db) throw new Error("Database not initialized");
    const tx = this.db.transaction(this.storeName, mode);
    return tx.objectStore(this.storeName);
  }

  async getAll(): Promise<MemoryItem[]> {
    return new Promise((resolve, reject) => {
      try {
        const store = this.getStore("readonly");
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      } catch (err) {
        reject(err);
      }
    });
  }

  async put(item: MemoryItem): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const store = this.getStore("readwrite");
        const request = store.put(item);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      } catch (err) {
        reject(err);
      }
    });
  }

  async delete(id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const store = this.getStore("readwrite");
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      } catch (err) {
        reject(err);
      }
    });
  }

  async clear(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const store = this.getStore("readwrite");
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      } catch (err) {
        reject(err);
      }
    });
  }
}

export class MemoryStore {
  private localDB = new LocalIndexedDB();

  async init(): Promise<void> {
    // Initialize local IndexedDB (always available)
    await this.localDB.init();
    console.log("IGRIS MemoryStore: Initialized local database successfully (offline mode).");
  }

  async getAll(): Promise<MemoryItem[]> {
    return await this.localDB.getAll();
  }

  async save(item: MemoryItem): Promise<void> {
    // Save to local IndexedDB
    await this.localDB.put(item);
  }

  async delete(id: string): Promise<void> {
    // Delete from local IndexedDB
    await this.localDB.delete(id);
  }

  async clear(): Promise<void> {
    // Clear local IndexedDB
    await this.localDB.clear();
  }
}
