// icons.js
(function() {
  const { getSavedLinks, setSavedLinks } = window.LSUtils;
  const GRID_SIZE = 80;
  let linksContainer = null;

  function initIcons(containerElement) {
    linksContainer = containerElement;
  }

  function addLink(url, x, y, save = true, containerId = null) {
    const parentEl = containerId 
      ? document.querySelector(`[data-container-id="${containerId}"]`)
      : linksContainer;
    
    let iconDiv = document.createElement('div');
    iconDiv.className = 'icon-container';
    iconDiv.draggable = true;
    iconDiv.style.left = x + 'px';
    iconDiv.style.top  = y + 'px';

    iconDiv.addEventListener('dragstart', handleIconDragStart, false);
    iconDiv.addEventListener('dragend', handleIconDragEnd, false);

    let removeBtn = document.createElement('button');
    removeBtn.textContent = '×';
    removeBtn.onclick = function(e) {
      e.stopPropagation();
      parentEl.removeChild(iconDiv);
      let arr = getSavedLinks();
      arr = arr.filter(item => !(item.url === url && item.containerId === containerId));
      setSavedLinks(arr);
    };
    iconDiv.appendChild(removeBtn);

    let editBtn = document.createElement('button');
    editBtn.textContent = '✎';
    editBtn.className = 'edit-btn';
    editBtn.onclick = function(e) {
      e.stopPropagation();
      let fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = 'image/*';
      fileInput.onchange = function(event) {
        let file = event.target.files[0];
        let reader = new FileReader();
        reader.onload = function(e2) {
          img.src = e2.target.result;
          updateLinkIcon(url, e2.target.result, containerId);
        };
        reader.readAsDataURL(file);
      };
      fileInput.click();
    };
    iconDiv.appendChild(editBtn);

    let a = document.createElement('a');
    a.href = url;
    a.addEventListener('click', function(e) {
      e.preventDefault();
      window.open(url, '_blank');
    });

    // Creazione del contenitore circolare per l'icona
    let circleDiv = document.createElement('div');
    circleDiv.className = 'icon-circle';
    let img = document.createElement('img');
    img.src = 'https://www.google.com/s2/favicons?domain=' + extractDomain(url);
    img.alt = url;
    circleDiv.appendChild(img);
    a.appendChild(circleDiv);

    let label = document.createElement('div');
    label.textContent = extractDomain(url);
    label.contentEditable = true;
    label.addEventListener('blur', () => {
      updateLinkName(url, label.textContent, containerId);
    });
    
    iconDiv.appendChild(a);
    iconDiv.appendChild(label);

    parentEl.appendChild(iconDiv);

    if (save) {
      let arr = getSavedLinks();
      let alreadyExists = arr.some(item => item.url === url && item.containerId === containerId);
      if (!alreadyExists) {
        arr.push({ url, name: label.textContent, icon: img.src, x, y, containerId });
        setSavedLinks(arr);
      }
    }
  }

  function handleIconDragStart(e) {
    e.dataTransfer.setData('internal-icon', 'true');
    e.dataTransfer.setData('text/plain', '');
    this.style.opacity = '0.5';
    const rect = this.getBoundingClientRect();
    const iconLeft = rect.left + window.scrollX;
    const iconTop  = rect.top + window.scrollY;
    this.dragOffsetX = e.pageX - iconLeft;
    this.dragOffsetY = e.pageY - iconTop;
  }

  function handleIconDragEnd(e) {
    this.style.opacity = '1';
    let newContainerId = null;
    const mainRect = linksContainer.getBoundingClientRect();
    let containers = document.querySelectorAll('.resizable-container');
    let droppedInContainer = false;
    for (let ct of containers) {
      const rect = ct.getBoundingClientRect();
      if (
        e.pageX >= rect.left + window.scrollX &&
        e.pageX <= rect.right + window.scrollX &&
        e.pageY >= rect.top + window.scrollY &&
        e.pageY <= rect.bottom + window.scrollY
      ) {
        droppedInContainer = true;
        newContainerId = ct.dataset.containerId;
        const containerLeft = rect.left + window.scrollX;
        const containerTop  = rect.top + window.scrollY;
        const SNAP_OFFSET_X = 50; // modifica questo valore se necessario roiginale 30
		const SNAP_OFFSET_Y = 60; // modifica questo valore se necessario originale 20

		let offsetX = e.pageX - containerLeft - this.dragOffsetX;
		let offsetY = e.pageY - containerTop - this.dragOffsetY;
		offsetX = Math.round((offsetX - SNAP_OFFSET_X) / GRID_SIZE) * GRID_SIZE + SNAP_OFFSET_X;
		offsetY = Math.round((offsetY - SNAP_OFFSET_Y) / GRID_SIZE) * GRID_SIZE + SNAP_OFFSET_Y;
        let maxX = parseInt(ct.style.width) - 60;
        let maxY = parseInt(ct.style.height) - 80;
        if (offsetX < 0) offsetX = 0;
        if (offsetY < 0) offsetY = 0;
        if (offsetX > maxX) offsetX = maxX;
        if (offsetY > maxY) offsetY = maxY;
        if (this.parentNode !== ct) {
          this.parentNode.removeChild(this);
          ct.appendChild(this);
        }
        this.style.left = offsetX + 'px';
        this.style.top  = offsetY + 'px';
        break;
      }
    }
    if (!droppedInContainer) {
      const mainLeft = mainRect.left + window.scrollX;
      const mainTop  = mainRect.top + window.scrollY;
      let x = e.pageX - mainLeft - this.dragOffsetX;
      let y = e.pageY - mainTop - this.dragOffsetY;
      x = Math.round(x / GRID_SIZE) * GRID_SIZE;
      y = Math.round(y / GRID_SIZE) * GRID_SIZE;
      let maxX = mainRect.width - 60;
      let maxY = mainRect.height - 80;
      if (x < 0) x = 0;
      if (y < 0) y = 0;
      if (x > maxX) x = maxX;
      if (y > maxY) y = maxY;
      if (this.parentNode !== linksContainer) {
        this.parentNode.removeChild(this);
        linksContainer.appendChild(this);
      }
      this.style.left = x + 'px';
      this.style.top  = y + 'px';
    }
    let currentUrl = this.querySelector('a').href;
    updateLinkData(currentUrl, parseInt(this.style.left), parseInt(this.style.top), newContainerId);
  }

  function updateLinkData(url, x, y, containerId) {
    let arr = getSavedLinks();
    let idx = arr.findIndex(item => item.url === url);
    if (idx !== -1) {
      arr[idx].x = x;
      arr[idx].y = y;
      arr[idx].containerId = containerId;
      setSavedLinks(arr);
    }
  }

  function updateLinkName(url, newName, containerId) {
    let arr = getSavedLinks();
    let idx = arr.findIndex(item => item.url === url && item.containerId === containerId);
    if (idx !== -1) {
      arr[idx].name = newName;
      setSavedLinks(arr);
    }
  }
  function updateLinkIcon(url, newIcon, containerId) {
    let arr = getSavedLinks();
    let idx = arr.findIndex(item => item.url === url && item.containerId === containerId);
    if (idx !== -1) {
      arr[idx].icon = newIcon;
      setSavedLinks(arr);
    }
  }

  function loadLinks() {
    let arr = getSavedLinks();
    arr.forEach(item => {
      addLinkFromStorage(item);
    });
  }

  function addLinkFromStorage(item) {
    addLink(item.url, item.x, item.y, false, item.containerId);
    let parentEl = (item.containerId)
      ? document.querySelector(`[data-container-id="${item.containerId}"]`)
      : linksContainer;
    let iconDivs = parentEl.getElementsByClassName('icon-container');
    for (let div of iconDivs) {
      let a = div.querySelector('a');
      if (a && a.href === item.url) {
        let img = div.querySelector('img');
        let label = div.querySelector('div[contentEditable]');
        img.src = item.icon;
        label.textContent = item.name;
      }
    }
  }

  function extractDomain(url) {
    let hostname;
    if (url.indexOf('//') > -1) {
      hostname = url.split('/')[2];
    } else {
      hostname = url.split('/')[0];
    }
    hostname = hostname.split(':')[0];
    hostname = hostname.split('?')[0];
    return hostname;
  }

  window.IconModule = {
    initIcons,
    addLink,
    loadLinks
  };
})();
