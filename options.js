// options.js (MV3 options page logic)
// Responsible for storing the license key and displaying current license/trial status.

const KEY_INPUT = document.getElementById('key');
const SAVE_BTN = document.getElementById('save');
const STATUS_P = document.getElementById('status');
const SAVING_SPAN = document.getElementById('saving');

// Helper to format a UTC timestamp (ms) into a readable date
function fmt(ts) {
  if (!ts) return '—';
  return new Date(ts).toISOString().split('T')[0];
}

async function loadStatus() {
  try {
    const syncData = await chrome.storage.sync.get([
      'licenseKey',
      'licenseValid',
      'licenseType',
      'licenseExpiryUTC',
      'trialStartedUTC',
      'trialEndsUTC',
      'licenseCheckedAtUTC'
    ]);

    if (syncData.licenseKey) {
      KEY_INPUT.value = syncData.licenseKey;
    }

    let lines = [];

    if (syncData.licenseValid) {
      if (syncData.licenseType === 'lifetime') {
        lines.push('License: Lifetime (active)');
      } else if (syncData.licenseType === 'trial') {
        const now = Date.now();
        const daysLeft = syncData.trialEndsUTC ? Math.max(0, Math.ceil((syncData.trialEndsUTC - now) / 86400000)) : '?';
        lines.push(`Trial Active: ${daysLeft} day(s) left (until ${fmt(syncData.trialEndsUTC)})`);
      } else {
        lines.push('License: Valid');
      }
    } else {
      lines.push('License not valid');
    }

    if (syncData.licenseExpiryUTC && syncData.licenseType !== 'lifetime') {
      lines.push(`License expires: ${fmt(syncData.licenseExpiryUTC)}`);
    }

    if (syncData.trialStartedUTC) {
      lines.push(`Trial started: ${fmt(syncData.trialStartedUTC)}`);
    }
    if (syncData.trialEndsUTC) {
      lines.push(`Trial ends: ${fmt(syncData.trialEndsUTC)}`);
    }

    if (syncData.licenseCheckedAtUTC) {
      lines.push(`Last check: ${new Date(syncData.licenseCheckedAtUTC).toLocaleString()}`);
    }

    STATUS_P.textContent = lines.join('\n');
  } catch (e) {
    STATUS_P.textContent = 'Error loading status: ' + e;
  }
}

async function saveLicense() {
  const key = KEY_INPUT.value.trim();
  SAVING_SPAN.style.display = 'inline';
  SAVE_BTN.disabled = true;
  try {
    await chrome.storage.sync.set({
      licenseKey: key || '',
      licenseCheckedAtUTC: 0 // force re-check
    });
    STATUS_P.textContent = 'Saved. Triggering license check…';
    await chrome.runtime.sendMessage({ type: 'CHECK_LICENSE_NOW' });
    // Reload status after slight delay to allow SW to process
    setTimeout(loadStatus, 800);
  } catch (e) {
    STATUS_P.textContent = 'Save failed: ' + e;
  } finally {
    SAVING_SPAN.style.display = 'none';
    SAVE_BTN.disabled = false;
  }
}

SAVE_BTN.addEventListener('click', saveLicense);

console.log('[BOOT] options.js loaded');
// ExtPay upgrade button wiring (global functions)
const optBtn = document.getElementById('optUpgrade');
if(optBtn && !optBtn.__bound){
  optBtn.__bound = true;
  optBtn.addEventListener('click', async () => {
    console.log('[ExtPay] Options Upgrade clicked');
    try { await (window.openExtPayCheckout && window.openExtPayCheckout()); } catch(e){ console.warn('ExtPay checkout failed from options', e); }
  });
  console.log('[BOOT] Options Upgrade handler bound');
}

// Help & Legal links
const optPrivacy = document.getElementById('optPrivacy');
const optTerms = document.getElementById('optTerms');
if (optPrivacy) {
  optPrivacy.addEventListener('click', (e) => {
    e.preventDefault();
    window.open('https://engincore.it/legal/privacy.html', '_blank', 'noopener,noreferrer');
  });
}
if (optTerms) {
  optTerms.addEventListener('click', (e) => {
    e.preventDefault();
    window.open('https://engincore.it/legal/terms.html', '_blank', 'noopener,noreferrer');
  });
}
console.log('[BOOT] Help & Legal handlers bound');

loadStatus();
