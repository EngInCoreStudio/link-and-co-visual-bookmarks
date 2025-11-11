// src/backup.js - Unified backup utilities using chrome.storage.local

/**
 * Export all chrome.storage.local data relevant to the app into a JSON string.
 * (Currently exports all keys; refine by filtering if needed.)
 */
export async function exportBackupJSON() {
  const all = await chrome.storage.local.get(null);
  return JSON.stringify(all, null, 2);
}
