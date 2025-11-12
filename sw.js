// sw.js - MV3 service worker (module) for license validation & badge state
// Permissions required: storage, alarms (already declared in manifest)

import { validateAndCacheLicense } from './license.js';
import './src/extpay.js';
import { EXTPAY_ID, USE_EXTPAY } from './src/config.js';

// Explicit background start with consistent ID + logging
if (USE_EXTPAY && globalThis.ExtPay) {
  try {
    const extpay = globalThis.ExtPay(EXTPAY_ID);
    extpay.startBackground();
    console.log('[ExtPay] background started with ID:', EXTPAY_ID);
  } catch (e) {
    console.warn('[ExtPay] bg start failed', e);
  }
}

/**
 * Update extension action badge to reflect PRO status.
 * @param {boolean} isPro
 */
async function updateBadge(isPro) {
  // Badge disabled - no PRO/TRIAL badge on toolbar icon
  return;
  /* Disabled badge code:
  try {
    await chrome.action.setBadgeText({ text: isPro ? 'PRO' : '' });
    await chrome.action.setBadgeBackgroundColor({ color: isPro ? '#0b7' : '#00000000' });
  } catch (e) {
    // Badge may fail if action not available yet; swallow silently.
    console.warn('[sw] badge update failed', e);
  }
  */
}

/** Run a license check and update badge; safe wrapper. */
async function runLicenseCheck() {
  try {
    const ok = await validateAndCacheLicense();
    await updateBadge(ok);
    return ok;
  } catch (e) {
    console.warn('[sw] license check error', e);
    return false;
  }
}

// Startup logic (service worker activation / load)
(async () => {
  await runLicenseCheck();
})();

// Open full-page app when toolbar icon is clicked (replaces former popup)
chrome.action.onClicked.addListener(() => {
  const url = chrome.runtime.getURL('index.html');
  chrome.tabs.create({ url });
});

// Installation / update: schedule periodic license checks.
chrome.runtime.onInstalled.addListener(async () => {
  try {
    // Clear existing alarm (defensive) then create new one every 7 days (10080 minutes)
    await chrome.alarms.clear('licenseCheck');
    chrome.alarms.create('licenseCheck', { periodInMinutes: 10080 });
  } catch (e) {
    console.warn('[sw] failed to create alarm', e);
  }
  await runLicenseCheck();
});

// Alarm listener for scheduled license verification.
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm && alarm.name === 'licenseCheck') {
    await runLicenseCheck();
  }
});

// Message listener for on-demand validation from options/popup.
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    if (msg && msg.type === 'CHECK_LICENSE_NOW') {
      const ok = await runLicenseCheck();
      try { sendResponse && sendResponse({ ok }); } catch { /* ignored */ }
    }
  })();
  return true; // Keep the channel open for async response.
});
