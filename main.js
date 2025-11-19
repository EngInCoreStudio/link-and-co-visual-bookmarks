// main.js
import { isPro, getTrialInfo } from './license.js';
import { USE_LEGACY_LICENSE } from './src/config.js';
const USE_EXTPAY = (window.__APP_CONFIG__ && window.__APP_CONFIG__.USE_EXTPAY);
console.log('[BOOT] main.js loaded (module mode)');
if (!USE_LEGACY_LICENSE) {
  console.log('[LIC] Legacy license backend disabled (ExtPay-only)');
}

// PRO gating helpers (merge license/trial + ExtPay)
async function isProLocal() {
  try { return await isPro(); } catch { return false; }
}
async function isPaidExtPay() {
  try { return await (window.isPaidViaExtPay ? window.isPaidViaExtPay() : false); } catch { return false; }
}
async function computeIsPro() {
  let a = false, b = false;
  try { a = await isProLocal(); } catch {}
  try { b = await isPaidExtPay(); } catch {}
  const result = !!(a || b);
  console.log('[GATING] computeIsPro: local=', a, 'extpay=', b, '→ pro=', result);
  return result;
}
async function applyLicenseState(forceLog) {
  const pro = await computeIsPro();
  const extPayPaid = await isPaidExtPay();
  
  document.body.classList.toggle('pro', !!pro);
  
  // Only hide Upgrade button if actually paid via ExtPay (not during trial)
  const upg = document.getElementById('btnUpgrade');
  const menuUpg = document.getElementById('menuUpgrade');
  if (extPayPaid) {
    upg && (upg.style.display = 'none');
    menuUpg && (menuUpg.style.display = 'none');
  } else {
    upg && (upg.style.display = '');
    menuUpg && (menuUpg.style.display = '');
  }
  
  // Badge shows PRO if user has any PRO access (trial or paid)
  const badge = document.getElementById('proIndicator');
  if (badge) {
    if (extPayPaid) {
      badge.textContent = 'PRO';
      badge.title = 'Paid subscription';
    } else if (pro) {
      const info = await getTrialInfo();
      badge.textContent = 'TRIAL';
      badge.title = `Trial: ${info.daysLeft} days left`;
    } else {
      badge.textContent = '';
      badge.title = '';
    }
  }
  
  if (forceLog) console.log('[GATING] pro=', pro, 'extPayPaid=', extPayPaid);
}

console.log('[BOOT] gating init');

// Immediate gating (if DOM already parsed)
try { if (document.readyState !== 'loading') { applyLicenseState(true); } } catch {}

document.addEventListener('DOMContentLoaded', async () => {
  console.log('[BOOT] DOMContentLoaded fired');
  
  // First pass gating
  await applyLicenseState(true);
  
  // Poll for 30s to catch late async ExtPay load
  const t0 = Date.now();
  const timer = setInterval(async () => {
    await applyLicenseState(false);
    if (Date.now() - t0 > 30000) clearInterval(timer);
  }, 2000);
  
  // Bind Upgrade + Menu + Hamburger early
  try {
    const upg = document.getElementById('btnUpgrade');
    if (upg) {
      upg.addEventListener('click', async () => {
        console.log('[ExtPay] Upgrade clicked');
        const fn = window.openExtPayCheckout;
        const ok = fn ? await fn() : false;
        if (!ok) console.warn('[ExtPay] Checkout not opened (missing ExtPay or network)');
      });
      console.log('[BOOT] Upgrade handler bound');
    }
    
    const menuUpg = document.getElementById('menuUpgrade');
    if (menuUpg) {
      menuUpg.addEventListener('click', () => {
        const upgBtn = document.getElementById('btnUpgrade');
        if (upgBtn) upgBtn.click();
      });
      console.log('[BOOT] Menu Upgrade handler bound');
    }
    
    const menuBtn = document.getElementById('menu-btn');
    const dropdownMenu = document.getElementById('dropdown-menu');
    if (menuBtn && dropdownMenu) {
      menuBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropdownMenu.style.display = (dropdownMenu.style.display === 'block' ? 'none' : 'block');
        console.log('[BOOT] Hamburger toggled →', dropdownMenu.style.display);
      });
      document.addEventListener('click', (e) => {
        if (!dropdownMenu.contains(e.target) && e.target !== menuBtn) {
          dropdownMenu.style.display = 'none';
        }
      });
      console.log('[BOOT] Hamburger handler bound');
    }
    
    // Refresh status control
    const refreshEl = document.getElementById('refreshStatus');
    if (refreshEl && !refreshEl.__bound) {
      refreshEl.__bound = true;
      refreshEl.addEventListener('click', async () => {
        console.log('[REFRESH] License re-check requested by user');
        try {
          await chrome.runtime.sendMessage({ type: 'CHECK_LICENSE_NOW' });
        } catch (e) {
          console.warn('[REFRESH] Failed to send CHECK_LICENSE_NOW', e);
        }
        await applyLicenseState(true);
      });
      console.log('[BOOT] Refresh status handler bound');
    }
    
    // Help & Legal menu links
    const menuHelp = document.getElementById('menuHelp');
    const menuPrivacy = document.getElementById('menuPrivacy');
    const menuTerms = document.getElementById('menuTerms');
    if (menuHelp) {
      menuHelp.addEventListener('click', (e) => {
        e.preventDefault();
        chrome.tabs.create({ url: chrome.runtime.getURL('help.html') });
      });
    }
    if (menuPrivacy) {
      menuPrivacy.addEventListener('click', (e) => {
        e.preventDefault();
        window.open('https://engincore.it/legal/privacy.html', '_blank', 'noopener,noreferrer');
      });
    }
    if (menuTerms) {
      menuTerms.addEventListener('click', (e) => {
        e.preventDefault();
        window.open('https://engincore.it/legal/terms.html', '_blank', 'noopener,noreferrer');
      });
    }
    console.log('[BOOT] Help & Legal handlers bound');
  } catch(e){ console.warn('[BOOT] UI binding failed', e); }

  // Gestione cambio colori e persistenza con Local Storage (archiviazione locale)
  const selGeneralBg   = document.getElementById('general-bg-select');
  const selContainerBg = document.getElementById('container-bg-select');

  // Legge i valori di default dalle variabili CSS
  const cssRoot            = getComputedStyle(document.documentElement);
  const defaultPageBg      = cssRoot.getPropertyValue('--page-bg').trim();
  const defaultContainerBg = cssRoot.getPropertyValue('--container-bg').trim();

  // Carica da Local Storage o usa i default
  const colorSettings = await chrome.storage.local.get(['pageBg','containerBg']);
  const savedPageBg      = colorSettings.pageBg      || defaultPageBg;
  const savedContainerBg = colorSettings.containerBg || defaultContainerBg;

  // Sincronizza i <select> e applica le variabili CSS
  selGeneralBg.value   = savedPageBg;
  selContainerBg.value = savedContainerBg;
  document.documentElement.style.setProperty('--page-bg',      savedPageBg);
  document.documentElement.style.setProperty('--container-bg',  savedContainerBg);

  // Al cambiamento di “Sfondo generale”
  selGeneralBg.addEventListener('change', e => {
    const colore = e.target.value;
    document.documentElement.style.setProperty('--page-bg', colore);
    chrome.storage.local.set({ pageBg: colore });
  });

  // Al cambiamento di “Sfondo contenitori”
  selContainerBg.addEventListener('change', e => {
    const colore = e.target.value;
    document.documentElement.style.setProperty('--container-bg', colore);
    chrome.storage.local.set({ containerBg: colore });
  });
  // — fine gestione colori —

  // Elementi del Modello a Oggetti del Documento (Document Object Model)
  const dropArea           = document.getElementById('drop-area');
  const linksContainer     = document.getElementById('links-container');
  const createContainerBtn = document.getElementById('create-container-btn');
  const tabsContainerEl    = document.getElementById('tabs-container');
  const addTabBtn          = document.getElementById('add-tab-btn');
  const pasteContainerBtn  = document.getElementById('paste-container-btn');

  // ------------------ Gestione dei Tab ------------------
  let tabs = [];
  let activeTabId = null;
  let lastClickedTab = null;

  async function initTabs() {
    const stored = await chrome.storage.local.get(['myTabs','currentTab']);
    tabs = stored.myTabs || [];
    if (tabs.length === 0) {
      const defaultTab = { id: "default", name: "Tab 1" };
      tabs.push(defaultTab);
      await chrome.storage.local.set({ myTabs: tabs, currentTab: 'default' });
    }
    const desired = stored.currentTab && tabs.find(t => t.id === stored.currentTab) ? stored.currentTab : tabs[0].id;
    activeTabId = desired;
    LSUtils.setTab(activeTabId);
    // Prefetch underlying storage-backed data for this tab so initial load shows imported content
    if (LSUtils.prefetchTab) {
      await LSUtils.prefetchTab(activeTabId);
    }
    renderTabs();
  }

  function renderTabs() {
    tabsContainerEl.innerHTML = "";
    tabs.forEach(tab => {
      const tabEl = document.createElement("div");
      tabEl.className = "tab-item";
      if (tab.id === activeTabId) tabEl.classList.add("active");

      tabEl.draggable = true;
      tabEl.addEventListener("dragstart", e => {
        e.dataTransfer.setData("text/plain", tab.id);
      });
      tabEl.addEventListener("dragover", e => e.preventDefault());
      tabEl.addEventListener("drop", e => {
        e.preventDefault();
        const draggedTabId = e.dataTransfer.getData("text/plain");
        if (draggedTabId === tab.id) return;
        const draggedIndex = tabs.findIndex(t => t.id === draggedTabId);
        const targetIndex  = tabs.findIndex(t => t.id === tab.id);
        if (draggedIndex > -1 && targetIndex > -1) {
          const [draggedTab] = tabs.splice(draggedIndex, 1);
          tabs.splice(targetIndex, 0, draggedTab);
          chrome.storage.local.set({ myTabs: tabs });
          renderTabs();
        }
      });

      const nameSpan = document.createElement("span");
      nameSpan.className = "tab-name";
      nameSpan.textContent = tab.name;
      nameSpan.contentEditable = "false";
      nameSpan.spellcheck = false;
      nameSpan.addEventListener("blur", () => {
        nameSpan.contentEditable = "false";
        tab.name = nameSpan.textContent;
        chrome.storage.local.set({ myTabs: tabs });
      });
      nameSpan.addEventListener("keydown", e => {
        if (e.key === "Enter") {
          e.preventDefault();
          nameSpan.blur();
        }
      });
      tabEl.appendChild(nameSpan);

      const removeBtn = document.createElement("button");
      removeBtn.className = "tab-remove-btn";
      removeBtn.textContent = "×";
      removeBtn.addEventListener("click", e => {
        e.stopPropagation();
        if (confirm("Are you sure you want to delete this tab?")) {
          removeTab(tab.id);
        }
      });
      tabEl.appendChild(removeBtn);

      tabEl.addEventListener("click", () => {
        if (tab.id === activeTabId) {
          if (lastClickedTab === tab.id) {
            nameSpan.contentEditable = "true";
            nameSpan.focus();
          } else {
            lastClickedTab = tab.id;
            setTimeout(() => { lastClickedTab = null; }, 500);
          }
        } else {
          switchTab(tab.id);
        }
      });

      tabsContainerEl.appendChild(tabEl);
    });
  }

  function switchTab(tabId) {
    activeTabId = tabId;
    chrome.storage.local.set({ currentTab: tabId });
    LSUtils.setTab(tabId);
    renderTabs();
    loadWorkspace();
  }

  function removeTab(tabId) {
    if (tabs.length === 1) {
      alert("You can't delete the only tab!");
      return;
    }
  tabs = tabs.filter(tab => tab.id !== tabId);
  chrome.storage.local.set({ myTabs: tabs });
    if (activeTabId === tabId) {
      activeTabId = tabs[0].id;
      LSUtils.setTab(activeTabId);
    }
    renderTabs();
    loadWorkspace();
  }

  function loadWorkspace() {
    linksContainer.innerHTML = "";
    ContainerModule.loadContainers();
    IconModule.loadLinks();
  }

  addTabBtn.addEventListener("click", async () => {
    const newTabId = "tab_" + Date.now();
    const newTab = { id: newTabId, name: "New Tab" };
    tabs.push(newTab);
    await chrome.storage.local.set({ myTabs: tabs, currentTab: newTabId });
    switchTab(newTabId);
    renderTabs();
  });
  // -------------------------------------------------------

  ContainerModule.initContainers(linksContainer);
  IconModule.initIcons(linksContainer);

  pasteContainerBtn.addEventListener('click', () => {
    if (window.clipboardContainer) {
      const { containerData, linksToCopy } = window.clipboardContainer;
      const newX = containerData.x + 20;
      const newY = containerData.y + 20;
      ContainerModule.createResizableContainer(newX, newY, containerData.width, containerData.height, true, null, containerData.name + " (copia)");
      const allContainers = LSUtils.getSavedContainers();
      const newContainerId = allContainers[allContainers.length - 1].containerId;
      linksToCopy.forEach(link => {
        IconModule.addLink(link.url, link.x, link.y, true, newContainerId);
      });
      alert("Container pasted successfully into the current tab.");
      window.clipboardContainer = null;
    } else {
      alert("No container copied.");
    }
  });
  // -------------------------------------------------------

  await initTabs();
  loadWorkspace();

  // --- Licensing gating & UI (legacy from original code; keep for trial banner) ---
  async function applyLicenseStateLegacy(triggeredByMessage=false) {
    // Merge classical license/trial state with ExtPay (if enabled)
    let licPro = false, extPayPro = false;
    try {
  const licPromise = isPro();
  const extPromise = (USE_EXTPAY ? (window.isPaidViaExtPay && window.isPaidViaExtPay()) : Promise.resolve(false));
  [licPro, extPayPro] = await Promise.all([licPromise, extPromise]);
    } catch (e) {
      console.warn('compute pro status failed', e);
    }
    const pro = licPro || extPayPro;
    document.body.classList.toggle('pro', pro);
    for (const el of document.querySelectorAll('[data-pro]')) {
      if (!pro) {
        el.setAttribute('disabled', '');
        el.setAttribute('aria-disabled', 'true');
        el.classList.add('disabled-pro');
      } else {
        el.removeAttribute('disabled');
        el.removeAttribute('aria-disabled');
        el.classList.remove('disabled-pro');
      }
    }
    const info = await getTrialInfo();
    const banner = document.getElementById('trialBanner');
    if (banner) {
      let msg = '';
      if (!pro && info?.daysLeft != null) {
        if (info.daysLeft > 0) {
          msg = `Trial ends in ${info.daysLeft} day${info.daysLeft===1?'':'s'}. Buy lifetime to unlock all features.`;
        } else if (info.daysLeft <= 0) {
          msg = 'Trial expired. Buy lifetime to unlock all features.';
        }
      }
      banner.textContent = msg;
      banner.style.display = (!pro && info?.daysLeft>0) ? 'block' : (pro ? 'none' : 'block');
    }
    const upgradeActions = document.getElementById('upgradeActions');
    if (upgradeActions) {
      upgradeActions.style.display = pro ? 'none' : 'flex';
    }
    // Remove preload class after first application (avoid flash)
    if (document.body.classList.contains('preload')) {
      document.body.classList.remove('preload');
    }
  }
  await applyLicenseStateLegacy();

  document.getElementById('upgradeBtn')?.addEventListener('click', async () => {
    if (USE_EXTPAY) {
      // ExtPay flow
      try {
        await (window.openExtPayCheckout && window.openExtPayCheckout());
      } catch (e) {
        console.error('ExtPay checkout failed', e);
        alert('Checkout error. Please retry.');
      }
    } else {
      // Original backend checkout flow
      try {
        const resp = await fetch('https://lic.example.com/api/checkout/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        });
        if(!resp.ok){
          alert('Failed to initiate checkout.');
          return;
        }
        const data = await resp.json();
        if(data?.url){
          chrome.tabs.create({ url: data.url });
        } else {
          alert('Checkout session unavailable.');
        }
      } catch(e){
        console.error('Checkout create failed', e);
        alert('Error creating checkout session.');
      }
    }
  });
  document.getElementById('enterKeyBtn')?.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  // Live refresh after options page triggers a license check or ExtPay paid
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg?.type === 'CHECK_LICENSE_NOW') {
      applyLicenseStateLegacy(true);
      applyLicenseState(true);
    }
    if (msg?.type === 'EXTPAY_PAID') {
      console.log('[ExtPay] EXTPAY_PAID received → refreshing gating');
      applyLicenseState(true);
      applyLicenseStateLegacy(true);
    }
  });

  createContainerBtn.addEventListener('click', () => {
    const x = (linksContainer.clientWidth - 200) / 2;
    const y = (linksContainer.clientHeight - 150) / 2;
    ContainerModule.createResizableContainer(x, y, 200, 150);
  });

  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, preventDefaults, false);
  });
  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }
  ['dragenter', 'dragover'].forEach(eventName => {
    dropArea.addEventListener(eventName, highlight, false);
  });
  ['dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, unhighlight, false);
  });
  function highlight(e) {
    dropArea.style.borderColor = '#666';
    dropArea.style.color = '#666';
  }
  function unhighlight(e) {
    dropArea.style.borderColor = '#fff';
    dropArea.style.color = '#fff';
  }
  dropArea.addEventListener('drop', e => {
    let data = e.dataTransfer.getData('text/uri-list');
    if (!data) {
      alert('Please drag a valid link.');
      return;
    }
    const x = (linksContainer.clientWidth - 60) / 2;
    const y = (linksContainer.clientHeight - 80) / 2;
    IconModule.addLink(data, x, y, true, null);
  });
});
