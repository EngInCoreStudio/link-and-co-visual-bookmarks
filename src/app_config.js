// Global read-only app config exposed without inline script
(function(){
  try {
    var cfg = { EXTPAY_ID: 'link--co--visual-bookmarks', USE_EXTPAY: true };
    if(Object.freeze) Object.freeze(cfg);
    window.__APP_CONFIG__ = cfg;
    window.APP_CONFIG = cfg;
    console.log('[CFG] APP_CONFIG ready', cfg);
  } catch (e) { console.warn('[CFG] init failed', e); }
})();
