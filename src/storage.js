// src/storage.js - Promise-based chrome.storage wrapper & JSON helpers (ESM)

export const storage = {
  local: {
    async get(keys) { return chrome.storage.local.get(keys); },
    async set(obj) { return chrome.storage.local.set(obj); },
    async remove(keys) { return chrome.storage.local.remove(keys); },
    async clear() { return chrome.storage.local.clear(); }
  },
  sync: {
    async get(keys) { return chrome.storage.sync.get(keys); },
    async set(obj) { return chrome.storage.sync.set(obj); },
    async remove(keys) { return chrome.storage.sync.remove(keys); },
    async clear() { return chrome.storage.sync.clear(); }
  }
};

export async function getJSON(area, key, fallback) {
  const data = await storage[area].get([key]);
  const raw = data[key];
  if (raw == null) return fallback;
  if (typeof raw === 'object') return raw; // already parsed
  try { return JSON.parse(raw); } catch { return fallback; }
}

export async function setJSON(area, key, value) {
  await storage[area].set({ [key]: value });
}
