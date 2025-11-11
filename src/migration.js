// src/migration.js - localStorage -> chrome.storage.local migration (V1)
import { storage } from './storage.js';

const MIGRATION_FLAG = 'migratedToStorageV1';
const MIGRATION_AT = 'migratedAtUTC';

/**
 * Attempt to parse JSON; return original string if invalid.
 */
function smartParse(value) {
  if (typeof value !== 'string') return value;
  const v = value.trim();
  if (!(v.startsWith('{') || v.startsWith('[') || v === 'null' || v === 'true' || v === 'false')) return value;
  try { return JSON.parse(value); } catch { return value; }
}

export async function migrateLocalStorageToChromeStorageV1() {
  const existing = await storage.local.get([MIGRATION_FLAG]);
  if (existing[MIGRATION_FLAG]) return false; // already migrated

  const payload = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;
    try {
      const value = localStorage.getItem(key);
      payload[key] = smartParse(value);
    } catch { /* ignore */ }
  }
  // Batch write if large
  const entries = Object.entries(payload);
  const batchSize = 100;
  for (let i = 0; i < entries.length; i += batchSize) {
    const slice = Object.fromEntries(entries.slice(i, i + batchSize));
    await storage.local.set(slice);
  }
  await storage.local.set({ [MIGRATION_FLAG]: true, [MIGRATION_AT]: Date.now() });
  return true;
}

export const migrationKeys = { MIGRATION_FLAG, MIGRATION_AT };
