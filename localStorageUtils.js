// localStorageUtils.js (migrated) - Provides backward compatible API using chrome.storage.local
// Assumes src/init.js (migration) already executed; operations remain synchronous for caller by
// caching data in-memory and writing async. This keeps existing code (which expects immediate
// returns) functioning without refactor.
(function() {
  const LS_PREFIX = window.location.pathname;
  let currentTab = 'default';

  // In-memory mirrors
  const cache = { links: {}, containers: {} }; // keyed by tab

  function linksKeyFor(tab) { return LS_PREFIX + '_' + tab + '_myNestedLinks'; }
  function containersKeyFor(tab) { return LS_PREFIX + '_' + tab + '_myNestedContainers'; }

  // Prime cache lazily
  async function ensureLoaded(tab) {
    const lk = linksKeyFor(tab);
    const ck = containersKeyFor(tab);
    const existing = await chrome.storage.local.get([lk, ck]);
    if (!(tab in cache.links)) cache.links[tab] = existing[lk] || [];
    if (!(tab in cache.containers)) cache.containers[tab] = existing[ck] || [];
  }

  function getSavedLinks() {
    if (!(currentTab in cache.links)) {
      // Fire & forget async load; return empty until resolved
      ensureLoaded(currentTab);
      cache.links[currentTab] = [];
    }
    return cache.links[currentTab];
  }
  function setSavedLinks(linksArray) {
    cache.links[currentTab] = linksArray;
    const key = linksKeyFor(currentTab);
    chrome.storage.local.set({ [key]: linksArray });
  }
  function getSavedContainers() {
    if (!(currentTab in cache.containers)) {
      ensureLoaded(currentTab);
      cache.containers[currentTab] = [];
    }
    return cache.containers[currentTab];
  }
  function setSavedContainers(containersArray) {
    cache.containers[currentTab] = containersArray;
    const key = containersKeyFor(currentTab);
    chrome.storage.local.set({ [key]: containersArray });
  }
  function setTab(tabId) {
    currentTab = tabId;
    // Kick off load for new tab (no await to keep API sync)
    ensureLoaded(tabId);
  }

  window.LSUtils = {
    getSavedLinks,
    setSavedLinks,
    getSavedContainers,
    setSavedContainers,
    setTab,
    prefetchTab: (tabId) => ensureLoaded(tabId),
    get currentTab() { return currentTab; },
    LS_PREFIX
  };
})();
