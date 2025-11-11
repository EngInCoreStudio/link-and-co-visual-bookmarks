// src/init.js - bootstraps storage migration and exposes readiness promise
import { migrateLocalStorageToChromeStorageV1 } from './migration.js';

const readyPromise = (async () => {
  try { await migrateLocalStorageToChromeStorageV1(); } catch (e) { console.warn('[init] migration failed', e); }
})();

// Expose for other scripts that might want to await
window.__storageReady = readyPromise;
