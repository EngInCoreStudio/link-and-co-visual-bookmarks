// Dev config: local backend + optional dev overrides
export const LICENSE_ENDPOINT = 'http://localhost:3000/api/license/verify';
export const DEV_FORCE_PRO = false;            // set true locally (do NOT commit true) to force PRO
export const DEV_MAGIC_KEY = 'DEV-LOCAL-OK';   // entering this key always validates locally
export const DEV_FAR_FUTURE_MS = Date.UTC(3000, 0, 1); // effectively lifetime placeholder
export const EXTPAY_ID = 'link--co--visual-bookmarks';
export const USE_EXTPAY = true;
