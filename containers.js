// containers.js
(function() {
  const { getSavedContainers, setSavedContainers, getSavedLinks, setSavedLinks } = window.LSUtils;
  const GRID_SIZE = 80;
  let linksContainerRef = null;
  let currentResizingContainer = null;
  let currentDraggingContainer = null;
  let containerDragOffsetX = 0;
  let containerDragOffsetY = 0;

  function initContainers(containerElement) {
    linksContainerRef = containerElement;
  }

  function createResizableContainer(x, y, width, height, save = true, containerId = null, containerName = "New Container") {
    const container = document.createElement('div');
    container.className = 'resizable-container';

    containerId = containerId || generateUniqueId();
    container.dataset.containerId = containerId;

    container.style.left = x + 'px';
    container.style.top  = y + 'px';
    container.style.width  = width + 'px';
    container.style.height = height + 'px';

    // Barra in alto per il drag
    const dragHandle = document.createElement('div');
    dragHandle.className = 'container-drag-handle';
    container.appendChild(dragHandle);

    // Header: contiene nome e pulsanti
    const headerDiv = document.createElement('div');
    headerDiv.className = 'container-header';
    headerDiv.style.display = 'flex';
    headerDiv.style.alignItems = 'center';
    headerDiv.style.justifyContent = 'space-between';
    dragHandle.appendChild(headerDiv);

    // Nome del contenitore, modificabile in linea
    const nameSpan = document.createElement('div');
    nameSpan.className = 'container-name';
    nameSpan.contentEditable = true;
    nameSpan.textContent = containerName;
    nameSpan.style.flexGrow = "1";
    headerDiv.appendChild(nameSpan);
    nameSpan.addEventListener('blur', () => {
      updateContainerName(containerId, nameSpan.textContent);
    });

    // Pulsante per copiare il contenitore (a sinistra del pulsante di eliminazione)
    const copyBtn = document.createElement('button');
    copyBtn.className = 'container-copy-btn';
    copyBtn.textContent = '⧉';
    copyBtn.title = "Copy container";
    copyBtn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      const containerData = {
        x: parseInt(container.style.left),
        y: parseInt(container.style.top),
        width: parseInt(container.style.width),
        height: parseInt(container.style.height),
        name: nameSpan.textContent,
        containerId: container.dataset.containerId
      };
      let savedLinks = getSavedLinks();
      const linksToCopy = savedLinks.filter(link => link.containerId === containerData.containerId);
      window.clipboardContainer = { containerData, linksToCopy };
      alert("Container copied! Switch to the destination tab and use the paste button.");
    });
    headerDiv.appendChild(copyBtn);

    // Pulsante per eliminare il contenitore (richiede conferma)
    const removeBtn = document.createElement('button');
    removeBtn.className = 'container-remove-btn';
    removeBtn.textContent = '×';
    removeBtn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      if (confirm("Are you sure you want to delete this container?")) {
        removeContainer(container);
      }
    });
    headerDiv.appendChild(removeBtn);

    // Eventi per il drag del contenitore
    dragHandle.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      currentDraggingContainer = container;
      containerDragOffsetX = e.clientX - parseInt(container.style.left);
      containerDragOffsetY = e.clientY - parseInt(container.style.top);
      document.addEventListener('mousemove', handleContainerMouseMove);
      document.addEventListener('mouseup', handleContainerMouseUp);
    });

    // Maniglia per il ridimensionamento
    const resizeHandle = document.createElement('div');
    resizeHandle.className = 'resize-handle';
    container.appendChild(resizeHandle);
    resizeHandle.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      currentResizingContainer = container;
      document.addEventListener('mousemove', handleResizeMouseMove);
      document.addEventListener('mouseup', handleResizeMouseUp);
    });

    // Dragover e drop per i link esterni
    container.addEventListener('dragover', (e) => {
      e.preventDefault();
    });
    container.addEventListener('drop', (e) => {
      e.preventDefault();
      if (e.dataTransfer.getData('internal-icon') === 'true') return;
      const url = e.dataTransfer.getData('text/uri-list');
      if (!url) return;
      const rect = container.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      window.IconModule.addLink(url, cx, cy, true, containerId);
    });

    linksContainerRef.appendChild(container);

    if (save) {
      saveContainerInLocalStorage(containerId, x, y, width, height, containerName);
    }
  }

  function handleContainerMouseMove(e) {
    if (!currentDraggingContainer) return;
    const container = currentDraggingContainer;
    const newLeft = e.clientX - containerDragOffsetX;
    const newTop  = e.clientY - containerDragOffsetY;
    container.style.left = newLeft + 'px';
    container.style.top  = newTop + 'px';
  }
  function handleContainerMouseUp(e) {
    if (!currentDraggingContainer) return;
    const container = currentDraggingContainer;
    const x = parseInt(container.style.left);
    const y = parseInt(container.style.top);
    const w = parseInt(container.style.width);
    const h = parseInt(container.style.height);
    const cId = container.dataset.containerId;
    updateContainerInLocalStorage(cId, x, y, w, h);
    document.removeEventListener('mousemove', handleContainerMouseMove);
    document.removeEventListener('mouseup', handleContainerMouseUp);
    currentDraggingContainer = null;
  }

  function handleResizeMouseMove(e) {
    if (!currentResizingContainer) return;
    const container = currentResizingContainer;
    const rect = container.getBoundingClientRect();
    let newWidth  = e.clientX - rect.left;
    let newHeight = e.clientY - rect.top;
    if (newWidth < 80)  newWidth = 80;
    if (newHeight < 50) newHeight = 50;
    container.style.width  = newWidth + 'px';
    container.style.height = newHeight + 'px';
  }
  function handleResizeMouseUp(e) {
    if (!currentResizingContainer) return;
    const container = currentResizingContainer;
    const x = parseInt(container.style.left);
    const y = parseInt(container.style.top);
    const w = parseInt(container.style.width);
    const h = parseInt(container.style.height);
    const cId = container.dataset.containerId;
    updateContainerInLocalStorage(cId, x, y, w, h);
    document.removeEventListener('mousemove', handleResizeMouseMove);
    document.removeEventListener('mouseup', handleResizeMouseUp);
    currentResizingContainer = null;
  }

  function removeContainer(containerEl) {
    let savedContainers = getSavedContainers();
    let savedLinks = getSavedLinks();
    const cId = containerEl.dataset.containerId;
    savedContainers = savedContainers.filter(c => c.containerId !== cId);
    setSavedContainers(savedContainers);
    savedLinks = savedLinks.filter(link => link.containerId !== cId);
    setSavedLinks(savedLinks);
    linksContainerRef.removeChild(containerEl);
  }

  function saveContainerInLocalStorage(cId, x, y, w, h, name) {
    let arr = getSavedContainers();
    arr.push({ containerId: cId, x, y, width: w, height: h, name });
    setSavedContainers(arr);
  }
  function updateContainerInLocalStorage(cId, x, y, w, h) {
    let arr = getSavedContainers();
    const idx = arr.findIndex(c => c.containerId === cId);
    if (idx !== -1) {
      arr[idx].x = x;
      arr[idx].y = y;
      arr[idx].width = w;
      arr[idx].height = h;
      setSavedContainers(arr);
    }
  }
  function updateContainerName(cId, newName) {
    let arr = getSavedContainers();
    const idx = arr.findIndex(c => c.containerId === cId);
    if (idx !== -1) {
      arr[idx].name = newName;
      setSavedContainers(arr);
    }
  }

  function loadContainers() {
    let arr = getSavedContainers();
    arr.forEach(item => {
      createResizableContainer(item.x, item.y, item.width, item.height, false, item.containerId, item.name);
    });
  }

  function generateUniqueId() {
    return 'c_' + Math.random().toString(36).substr(2, 9);
  }

  window.ContainerModule = {
    initContainers,
    createResizableContainer,
    loadContainers
  };
})();
