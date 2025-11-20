// advancedBackup.js
import { STARTER_DATA } from './src/starterData.js';

document.addEventListener('DOMContentLoaded', () => {
  const exportFileBtn = document.getElementById('export-file-btn');
  const importFileInput = document.getElementById('import-file-input');
  const importBtn = document.getElementById('import-btn');
  const loadStarterBtn = document.getElementById('load-starter-btn');

  async function exportData() {
    const stored = await chrome.storage.local.get(null); // all keys
    const myTabs = stored.myTabs || [];
    const lsPrefix = LSUtils.LS_PREFIX;
    const currentTab = LSUtils.currentTab;
    const linksKey = lsPrefix + "_" + currentTab + "_myNestedLinks";
    const containersKey = lsPrefix + "_" + currentTab + "_myNestedContainers";
    const linksData = stored[linksKey] || [];
    const containersData = stored[containersKey] || [];
    const exportObject = { myTabs, currentTab, linksData, containersData };
    return JSON.stringify(exportObject, null, 2);
  }

  exportFileBtn.addEventListener('click', async () => {
    const exportedData = await exportData();
    
    // Generate automatic filename with date: LinkCo_YYYYMMDD.json
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const defaultFilename = `LinkCo_${year}${month}${day}.json`;
    
    // Create blob and download using standard method
    const blob = new Blob([exportedData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = defaultFilename;
    a.click();
    
    // Clean up the blob URL after a short delay
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });

  importBtn.addEventListener('click', () => {
    importFileInput.click();
  });

  importFileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      importData(content);
    };
    reader.readAsText(file);
  });

  async function importData(jsonData) {
    try {
      const importObject = JSON.parse(jsonData);
  await chrome.storage.local.set({ myTabs: importObject.myTabs });

      const lsPrefix = LSUtils.LS_PREFIX;
      const currentTab = importObject.currentTab || "default";
      LSUtils.setTab(currentTab);
      const linksKey = lsPrefix + "_" + currentTab + "_myNestedLinks";
      const containersKey = lsPrefix + "_" + currentTab + "_myNestedContainers";
      await chrome.storage.local.set({ [linksKey]: importObject.linksData, [containersKey]: importObject.containersData, currentTab });
      // Prime LSUtils caches so first render sees data
      if (window.LSUtils && window.LSUtils.prefetchTab) {
        await window.LSUtils.prefetchTab(currentTab);
      }
      alert("Data imported successfully! Reloading...");
      setTimeout(() => window.location.reload(), 50);
    } catch (e) {
      alert("Error during import: " + e);
    }
  }

  // Load Start Page handler
  if (loadStarterBtn) {
    loadStarterBtn.addEventListener('click', async () => {
      const confirmed = confirm(
        "Create a new 'Start' tab with pre-configured containers and popular links?\n\n" +
        "This will create a new tab with example containers (AI, Tools, Communication, etc.).\n\n" +
        "Click OK to continue."
      );
      if (!confirmed) return;

      try {
        await loadStarterData();
        alert("Start tab created successfully! Reloading...");
        setTimeout(() => window.location.reload(), 50);
      } catch (e) {
        alert("Error creating Start tab: " + e);
        console.error('[STARTER] Load failed', e);
      }
    });
  }

  async function loadStarterData() {
    const lsPrefix = LSUtils.LS_PREFIX;
    
    // Create a new tab called "Start"
    const startTabId = "start";
    
    // Get existing tabs
    const stored = await chrome.storage.local.get(['myTabs']);
    const tabs = stored.myTabs || [];
    
    // Check if "Start" tab already exists
    const existingStartTab = tabs.find(t => t.id === startTabId);
    if (existingStartTab) {
      // Switch to existing Start tab
      await chrome.storage.local.set({ currentTab: startTabId });
      console.log('[STARTER] Start tab already exists, switching to it');
      return;
    }
    
    // Create new "Start" tab
    tabs.push({ id: startTabId, name: "Start" });
    await chrome.storage.local.set({ myTabs: tabs, currentTab: startTabId });
    
    const linksKey = lsPrefix + "_" + startTabId + "_myNestedLinks";
    const containersKey = lsPrefix + "_" + startTabId + "_myNestedContainers";

    // Use starter data exactly as defined (no transformation needed)
    await chrome.storage.local.set({
      [containersKey]: STARTER_DATA.containersData,
      [linksKey]: STARTER_DATA.linksData
    });

    // Prime cache
    if (window.LSUtils && window.LSUtils.prefetchTab) {
      await window.LSUtils.prefetchTab(startTabId);
    }

    console.log('[STARTER] Created Start tab with', STARTER_DATA.containersData.length, 'containers and', STARTER_DATA.linksData.length, 'links');
  }
});
