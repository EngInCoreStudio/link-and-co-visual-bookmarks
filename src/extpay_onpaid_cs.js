// ExtPay onPaid content script: listens for purchase completion and notifies extension.
// Injected on https://extensionpay.com/* via manifest.
// Keep EXTPAY_ID_CS in sync with EXTPAY_ID in src/config.*.js (preflight enforces match).
const EXTPAY_ID_CS = 'link--co--visual-bookmarks'; // sync with config
import './extpay.js'; // normalized lowercase path

(async () => {
  try {
    const ctor = globalThis.ExtPay || window.ExtPay;
    if (!ctor) { return; }
    const ep = ctor(EXTPAY_ID_CS);
    if (!ep?.onPaid?.addListener) { return; }
    ep.onPaid.addListener(() => {
      try {
        console.log('[ExtPay] onPaid received in CS → notifying extension');
        chrome.runtime.sendMessage({ type: 'EXTPAY_PAID' });
      } catch (e) { console.warn('[ExtPay] message send failed', e); }
    });
  } catch (e) { console.warn('[ExtPay] CS init failed', e); }
})();
