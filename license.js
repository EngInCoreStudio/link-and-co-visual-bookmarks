/**
 * license.js (ES Module)
 *
 * Implements a 6-calendar-month trial and lifetime / time-bound license validation
 * for an MV3 extension. Designed to be imported in a service worker, popup, or
 * options page. No DOM access; pure logic + chrome.storage.sync usage.
 *
 * chrome.storage.sync keys (all UTC epoch millis unless otherwise stated):
 *  - installAtUTC: First detected install timestamp.
 *  - trialEndsAtUTC: Calculated as installAtUTC + 6 calendar months (month-end safe).
 *  - licenseKey: Current user-entered license key (string, may be '').
 *  - licenseCheckedAtUTC: Last time (ms) we successfully attempted server verification.
 *  - licenseValidUntilUTC: If key validated: expiry timestamp; lifetime -> Number.MAX_SAFE_INTEGER; invalid -> 0.
 *
 * Exported API:
 *  getLicenseKey(): Promise<string>
 *  validateAndCacheLicense(): Promise<boolean>
 *  isPro(): Promise<boolean>  (true if active trial OR current time < licenseValidUntilUTC)
 *  getTrialInfo(): Promise<{ installAtUTC:number, trialEndsAtUTC:number, daysLeft:number }>
 *
 * Remote verification endpoint (only host used): https://lic.example.com/api/license/verify
 * POST JSON body: { key: string, device: string }
 * Expected response JSON: { valid: boolean, expiresAt: number|null }
 *   - If valid && expiresAt == null => lifetime license (cache as Number.MAX_SAFE_INTEGER)
 * Debounce: Do not call remote endpoint more than once every 5 minutes per key.
 */

const SYNC_KEYS = [
  'installAtUTC',
  'trialEndsAtUTC',
  'licenseKey',
  'licenseCheckedAtUTC',
  'licenseValidUntilUTC'
];

import { LICENSE_ENDPOINT, USE_LEGACY_LICENSE, DEV_FORCE_PRO, DEV_MAGIC_KEY, DEV_FAR_FUTURE_MS } from './src/config.js';
const FIVE_MIN_MS = 5 * 60 * 1000;

/**
 * Safely add months to a UTC timestamp (calendar months, not fixed day counts).
 * Handles month-end: Jan 31 + 1 month -> Feb 29 (leap) or Feb 28.
 * @param {number} ts UTC epoch millis
 * @param {number} months number of calendar months to add (can be positive integer)
 * @returns {number} resulting UTC epoch millis
 */
function addMonthsUTC(ts, months) {
  const d = new Date(ts);
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth();
  const day = d.getUTCDate();
  const targetIndex = month + months;
  const targetYear = year + Math.floor(targetIndex / 12);
  const targetMonth = ((targetIndex % 12) + 12) % 12;
  const daysInTargetMonth = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  const safeDay = Math.min(day, daysInTargetMonth);
  return Date.UTC(
    targetYear,
    targetMonth,
    safeDay,
    d.getUTCHours(),
    d.getUTCMinutes(),
    d.getUTCSeconds(),
    d.getUTCMilliseconds()
  );
}

async function readSync(keys) {
  return chrome.storage.sync.get(keys);
}
async function writeSync(obj) {
  return chrome.storage.sync.set(obj);
}

/** Ensure trial initialization is performed once. */
async function ensureTrialInitialized() {
  const data = await readSync(SYNC_KEYS);
  if (!data.installAtUTC) {
    const installAtUTC = Date.now();
    const trialEndsAtUTC = addMonthsUTC(installAtUTC, 6);
    await writeSync({ installAtUTC, trialEndsAtUTC });
    return { installAtUTC, trialEndsAtUTC, ...data };
  }
  return data;
}

/**
 * Get the stored license key.
 * @returns {Promise<string>}
 */
export async function getLicenseKey() {
  const { licenseKey = '' } = await readSync(['licenseKey']);
  return licenseKey || '';
}

/**
 * Determine whether the user currently has "pro" access (trial or license).
 * @returns {Promise<boolean>}
 */
export async function isPro() {
  const data = await ensureTrialInitialized();
  const now = Date.now();
  const trialActive = data.trialEndsAtUTC ? now < data.trialEndsAtUTC : false;
  const licValid = data.licenseValidUntilUTC ? now < data.licenseValidUntilUTC : false;
  return trialActive || licValid;
}

/**
 * Get trial information.
 * @returns {Promise<{installAtUTC:number, trialEndsAtUTC:number, daysLeft:number}>}
 */
export async function getTrialInfo() {
  const data = await ensureTrialInitialized();
  const now = Date.now();
  const { installAtUTC = 0, trialEndsAtUTC = 0 } = data;
  let daysLeft = 0;
  if (trialEndsAtUTC > now) {
    daysLeft = Math.max(0, Math.ceil((trialEndsAtUTC - now) / 86400000));
  }
  return { installAtUTC, trialEndsAtUTC, daysLeft };
}

/**
 * Validate license with remote (if needed) and cache results.
 * Debounce to avoid hitting the server more than once every 5 minutes.
 * @returns {Promise<boolean>} true if license now considered valid (independent of trial).
 */
export async function validateAndCacheLicense() {
  const data = await ensureTrialInitialized();
  const now = Date.now();
  const licenseKey = data.licenseKey || '';

  // If legacy license backend disabled, skip validation
  if (!USE_LEGACY_LICENSE || !LICENSE_ENDPOINT) {
    return true; // Trial-only mode, no backend validation
  }

  // Dev override: force PRO regardless of entered key.
  if (DEV_FORCE_PRO === true) {
    await writeSync({ licenseValidUntilUTC: DEV_FAR_FUTURE_MS, licenseCheckedAtUTC: now });
    return true;
  }

  // Dev magic key bypass (no network calls)
  if (licenseKey && DEV_MAGIC_KEY && licenseKey === DEV_MAGIC_KEY) {
    await writeSync({ licenseValidUntilUTC: DEV_FAR_FUTURE_MS, licenseCheckedAtUTC: now });
    return true;
  }

  // If no key, nothing to validate; ensure invalid cache if previously set.
  if (!licenseKey) {
    // Do not overwrite existing trial or license timestamps beyond marking invalid license.
    if (data.licenseValidUntilUTC && data.licenseValidUntilUTC !== 0) {
      await writeSync({ licenseValidUntilUTC: 0 });
    }
    return false;
  }

  const lastCheck = data.licenseCheckedAtUTC || 0;
  const notExpired = data.licenseValidUntilUTC && now < data.licenseValidUntilUTC;
  const recentlyChecked = now - lastCheck < FIVE_MIN_MS;
  if (notExpired && recentlyChecked) {
    return true; // Cached valid & fresh enough.
  }

  try {
    const res = await fetch(LICENSE_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: licenseKey, device: chrome.runtime.id })
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const payload = await res.json();
    const valid = !!payload.valid;
    let licenseValidUntilUTC = 0;
    if (valid) {
      if (payload.expiresAt == null) {
        licenseValidUntilUTC = Number.MAX_SAFE_INTEGER; // lifetime
      } else if (typeof payload.expiresAt === 'number') {
        licenseValidUntilUTC = payload.expiresAt;
      }
    }
    await writeSync({
      licenseValidUntilUTC,
      licenseCheckedAtUTC: now
    });
    return valid;
  } catch (err) {
    // Network / server error: fall back to cached validity.
    return !!(data.licenseValidUntilUTC && now < data.licenseValidUntilUTC);
  }
}

// No side effects on import; callers explicitly invoke functions.

// Export internal for testing (optional – can be removed before production if desired)
export const __internal = { addMonthsUTC };
