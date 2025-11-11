// advancedBackup.js

document.addEventListener('DOMContentLoaded', () => {
  const exportFileBtn = document.getElementById('export-file-btn');
  const importFileInput = document.getElementById('import-file-input');
  const importBtn = document.getElementById('import-btn');

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
    // Ask the user for the filename
    const filename = prompt("Enter the backup filename:", "backup.json") || "backup.json";
    const blob = new Blob([exportedData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
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
});
