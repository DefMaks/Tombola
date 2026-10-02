// lib/storage.js
// Safe storage helper resilient to Safari iOS Private Browsing ("The operation is insecure" SecurityError)

const memoryStore = new Map();

export const safeStorage = {
  getItem(key) {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch (e) {
      // Safari SecurityError: The operation is insecure
    }
    return memoryStore.has(key) ? memoryStore.get(key) : null;
  },

  setItem(key, value) {
    const strVal = String(value);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, strVal);
        return;
      }
    } catch (e) {
      // Safari SecurityError: The operation is insecure
    }
    memoryStore.set(key, strVal);
  },

  removeItem(key) {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch (e) {
      // Safari SecurityError
    }
    memoryStore.delete(key);
  },

  clear() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.clear();
      }
    } catch (e) {}
    memoryStore.clear();
  },
};

export default safeStorage;
