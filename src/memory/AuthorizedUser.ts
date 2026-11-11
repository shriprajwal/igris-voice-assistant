/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Interface representing the stored Authorized User settings schema.
 */
export interface AuthorizedUserConfig {
  authorizedUser: string;
}

const DB_NAME = "igris_user_db";
const STORE_NAME = "settings";
const VERSION = 1;

/**
 * Direct IndexedDB helper to retrieve the authorized user name.
 */
function getAuthorizedUserFromIDB(): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, VERSION);
      request.onerror = () => {
        resolve(null);
      };
      request.onsuccess = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.close();
          resolve(null);
          return;
        }
        try {
          const tx = db.transaction(STORE_NAME, "readonly");
          const store = tx.objectStore(STORE_NAME);
          const getReq = store.get("authorizedUser");
          getReq.onsuccess = () => {
            db.close();
            resolve(getReq.result?.authorizedUser || null);
          };
          getReq.onerror = () => {
            db.close();
            resolve(null);
          };
        } catch {
          db.close();
          resolve(null);
        }
      };
      request.onupgradeneeded = (e: any) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "id" });
        }
      };
    } catch (err) {
      console.error("IndexedDB error:", err);
      resolve(null);
    }
  });
}

/**
 * Direct IndexedDB helper to persist the authorized user object.
 */
function saveAuthorizedUserToIDB(name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const request = indexedDB.open(DB_NAME, VERSION);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        try {
          const tx = db.transaction(STORE_NAME, "readwrite");
          const store = tx.objectStore(STORE_NAME);
          const putReq = store.put({ id: "authorizedUser", authorizedUser: name });
          putReq.onsuccess = () => {
            db.close();
            resolve();
          };
          putReq.onerror = () => {
            db.close();
            reject(putReq.error);
          };
        } catch (err) {
          db.close();
          reject(err);
        }
      };
      request.onupgradeneeded = (e: any) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "id" });
        }
      };
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Retrieve the active authorized user designation.
 * Checks localStorage first, then IndexedDB, with standard fallback to 'Monarch'.
 */
export async function getAuthorizedUser(): Promise<string> {
  // Check localStorage first
  const localVal = localStorage.getItem("authorizedUser");
  if (localVal) {
    try {
      const parsed = JSON.parse(localVal) as AuthorizedUserConfig;
      if (parsed && typeof parsed.authorizedUser === "string") {
        return parsed.authorizedUser;
      }
    } catch {
      // If it's stored as plain string or corrupt, handle gracefully
      if (localVal && localVal !== "undefined" && !localVal.startsWith("{")) {
        // Migration to exact structured storage
        await saveAuthorizedUser(localVal);
        return localVal;
      }
    }
  }

  // Fallback to IndexedDB
  const idbVal = await getAuthorizedUserFromIDB();
  if (idbVal) {
    // Populate localStorage cache
    localStorage.setItem("authorizedUser", JSON.stringify({ authorizedUser: idbVal }));
    return idbVal;
  }

  return "Monarch";
}

/**
 * Persist the authorized user object to both localStorage and IndexedDB.
 */
export async function saveAuthorizedUser(name: string): Promise<void> {
  const config: AuthorizedUserConfig = { authorizedUser: name };
  localStorage.setItem("authorizedUser", JSON.stringify(config));
  try {
    await saveAuthorizedUserToIDB(name);
  } catch (err) {
    console.error("Failed to write authorized user designation to IndexedDB:", err);
  }
}
