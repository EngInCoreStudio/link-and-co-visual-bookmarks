// Global ExtPay client (no ESM). Relies on window.__APP_CONFIG__ for EXTPAY_ID & USE_EXTPAY.
(function(){
  console.log('[ExtPay] client boot');
  function readCfg(){ return (window.__APP_CONFIG__ || window.APP_CONFIG || {}); }
  function ep(){
    const { EXTPAY_ID, USE_EXTPAY } = readCfg();
    const ctor = (globalThis.ExtPay || window.ExtPay);
    return (USE_EXTPAY && ctor) ? ctor(EXTPAY_ID) : null;
  }
  window.isPaidViaExtPay = async function(){
    const e = ep(); if(!e) return false;
    try { const u = await e.getUser(); return !!u?.paid; } catch { return false; }
  };
  window.openExtPayCheckout = async function(planNickname){
  const cfg = readCfg();
    if(!cfg.USE_EXTPAY){ console.warn('[ExtPay] USE_EXTPAY=false'); return false; }
    const e = ep(); if(!e){ console.warn('[ExtPay] ExtPay missing'); return false; }
    try { await e.openPaymentPage(planNickname); return true; }
    catch(err){ console.warn('[ExtPay] openPaymentPage failed', err); return false; }
  };
})();
