// icons.js
(function() {
  const { getSavedLinks, setSavedLinks } = window.LSUtils;
  const GRID_SIZE = 80;
  let linksContainer = null;

  function initIcons(containerElement) {
    linksContainer = containerElement;
  }

  function addLink(url, x, y, save = true, containerId = null, skipValidation = false) {
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
    // Use Google's Favicon V2 API for better quality and reliability
    img.src = 'https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=' + encodeURIComponent(url) + '&size=64';
    // Fallback to standard Google favicon service if V2 fails
    img.onerror = function() {
      this.onerror = null; // Prevent infinite loop
      this.src = 'https://www.google.com/s2/favicons?sz=64&domain=' + extractDomain(url);
    };
    img.alt = url;
    circleDiv.appendChild(img);
    a.appendChild(circleDiv);

    let label = document.createElement('div');
    const rawDomain = extractDomain(url);
    const cleanedName = cleanDomainName(rawDomain);
    label.textContent = cleanedName;
    label.contentEditable = true;
    
    // Validate the cleaned name against readability rules (only for new icons, not loaded from storage)
    if (!skipValidation) {
      const validation = validateNameRules(cleanedName);
      if (!validation.isValid) {
        setTimeout(() => {
          showNameEditor(cleanedName, (newName) => {
            label.textContent = newName;
            updateLinkName(url, newName, containerId);
          }, validation);
        }, 100);
      }
    }
    
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
    
    // Store the original containerId before drag
    const parentContainer = this.parentNode.closest('.resizable-container');
    this.originalContainerId = parentContainer ? parentContainer.dataset.containerId : null;
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
    let oldContainerId = this.originalContainerId;
    console.log('[ICON] Drag ended:', { url: currentUrl, oldContainerId, newContainerId, x: parseInt(this.style.left), y: parseInt(this.style.top) });
    updateLinkData(currentUrl, parseInt(this.style.left), parseInt(this.style.top), newContainerId, oldContainerId);
  }

  function updateLinkData(url, x, y, newContainerId, oldContainerId) {
    let arr = getSavedLinks();
    
    // Normalize URLs for comparison (remove trailing slashes)
    const normalizeUrl = (u) => u ? u.replace(/\/$/, '') : u;
    const normalizedUrl = normalizeUrl(url);
    
    // First attempt: Find by exact URL and containerId match
    let idx = arr.findIndex(item => {
      const itemContainerId = item.containerId || null;
      const searchContainerId = oldContainerId || null;
      const itemUrl = normalizeUrl(item.url);
      return itemUrl === normalizedUrl && itemContainerId === searchContainerId;
    });
    
    // Fallback: If not found, try to find by URL only (for legacy data or edge cases)
    if (idx === -1) {
      console.warn('[ICON] Exact match not found, trying URL-only match');
      idx = arr.findIndex(item => normalizeUrl(item.url) === normalizedUrl);
    }
    
    if (idx !== -1) {
      arr[idx].x = x;
      arr[idx].y = y;
      arr[idx].containerId = newContainerId;
      setSavedLinks(arr);
      console.log('[ICON] Position saved:', { url, x, y, oldContainerId, newContainerId, index: idx });
    } else {
      console.error('[ICON] Failed to find link to update:', { 
        url, 
        normalizedUrl,
        oldContainerId, 
        existingLinks: arr.map(i => ({ url: i.url, normalizedUrl: normalizeUrl(i.url), containerId: i.containerId })) 
      });
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
    // Pass skipValidation = true to prevent popup for already-saved icons
    addLink(item.url, item.x, item.y, false, item.containerId, true);
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

  // Clean common patterns from domain name for better readability
  function cleanDomainName(domain) {
    let cleaned = domain.toLowerCase();
    
    // Comprehensive list of common patterns to remove
    const patternsToRemove = [
      // Common prefixes
      'www.', 'www1.', 'www2.', 'www3.',
      'web.', 'app.', 'portal.', 'my.', 'go.', 'get.', 'download.',
      'm.', 'mobile.', 'mail.', 'login.', 'signin.', 'auth.',
      'secure.', 'api.', 'cdn.', 'static.', 'assets.',
      
      // Common TLDs (Top Level Domains)
      '.com', '.net', '.org', '.edu', '.gov', '.mil',
      '.co', '.io', '.ai', '.app', '.dev', '.tech',
      
      // Country code TLDs
      '.it', '.uk', '.us', '.de', '.fr', '.es', '.ca', '.au', '.jp', '.cn',
      '.ru', '.br', '.in', '.mx', '.nl', '.be', '.ch', '.at', '.se', '.no',
      '.dk', '.fi', '.pl', '.cz', '.gr', '.pt', '.ie', '.nz', '.sg', '.hk',
      
      // European TLDs
      '.eu', '.me', '.ro', '.hu', '.bg', '.hr', '.si', '.sk', '.lt', '.lv',
      '.ee', '.cy', '.mt', '.lu',
      
      // Combined country TLDs
      '.co.uk', '.co.jp', '.co.in', '.co.za', '.com.au', '.com.br', '.com.mx',
      '.co.nz', '.com.sg', '.co.kr', '.com.ar', '.com.co', '.com.tr',
      
      // Other common TLDs
      '.xyz', '.online', '.store', '.shop', '.cloud', '.digital', '.tv',
      '.cc', '.to', '.gg', '.sh', '.ws', '.am', '.fm', '.biz', '.info',
      '.name', '.pro', '.mobi', '.tel', '.asia', '.jobs', '.cat'
    ];
    
    // Remove all matching patterns
    for (let pattern of patternsToRemove) {
      // Remove from start
      if (cleaned.startsWith(pattern)) {
        cleaned = cleaned.substring(pattern.length);
      }
      // Remove from end
      if (cleaned.endsWith(pattern)) {
        cleaned = cleaned.substring(0, cleaned.length - pattern.length);
      }
    }
    
    // Replace any remaining dots with spaces
    cleaned = cleaned.replace(/\./g, ' ');
    
    // Clean up multiple spaces and trim
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    
    // Capitalize first letter of each word for better appearance
    cleaned = cleaned.split(' ').map(word => {
      if (word.length > 0) {
        return word.charAt(0).toUpperCase() + word.slice(1);
      }
      return word;
    }).join(' ');
    
    return cleaned || domain; // Return original if cleaning resulted in empty string
  }

  // Validate if name meets the readability rules
  function validateNameRules(name) {
    const words = name.trim().split(/\s+/);
    const totalLength = name.length;
    
    // Rule 1: Maximum 2 words, each under 11 characters
    if (words.length <= 2) {
      const allWordsValid = words.every(word => word.length <= 11);
      if (allWordsValid) {
        return { isValid: true };
      }
    }
    
    // Rule 2: More than 2 words but total length under 18 characters
    if (words.length > 2 && totalLength <= 18) {
      return { isValid: true };
    }
    
    // If validation fails, provide helpful feedback
    let suggestion = '';
    if (words.length > 2 && totalLength > 18) {
      suggestion = 'Try using fewer words or abbreviations (e.g., "Chrome Web Store" → "Chrome Store")';
    } else if (words.length <= 2) {
      const longWords = words.filter(w => w.length > 11);
      if (longWords.length > 0) {
        suggestion = 'Try shortening long words (e.g., "Stackoverflow" → "Stack Over")';
      }
    }
    
    return { 
      isValid: false, 
      suggestion,
      words: words.length,
      totalLength
    };
  }

  // Show popup editor for icon name with character counter
  function showNameEditor(currentName, onSave, validationResult = null) {
    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    `;
    
    // Create modal content
    const modal = document.createElement('div');
    modal.style.cssText = `
      background: #2a2a2a;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
      min-width: 450px;
      color: #e0e0e0;
    `;
    
    const title = document.createElement('h3');
    title.textContent = 'Edit Icon Name';
    title.style.cssText = 'margin: 0 0 12px 0; color: #4fc3f7; font-size: 18px;';
    
    const subtitle = document.createElement('div');
    subtitle.style.cssText = 'margin: 0 0 16px 0; font-size: 13px; line-height: 1.5;';
    
    if (validationResult && !validationResult.isValid) {
      subtitle.innerHTML = `
        <p style="color: #ffb74d; margin: 0 0 8px 0;">⚠️ <strong>Suggested improvement for better visibility:</strong></p>
        <p style="color: #e0e0e0; margin: 0 0 4px 0;">• Maximum 2 words, each under 11 characters, OR</p>
        <p style="color: #e0e0e0; margin: 0 0 8px 0;">• Multiple words under 18 total characters</p>
        ${validationResult.suggestion ? `<p style="color: #81c784; margin: 0;"><em>${validationResult.suggestion}</em></p>` : ''}
      `;
    } else {
      subtitle.innerHTML = `
        <p style="color: #81c784; margin: 0;">For optimal visibility, follow these guidelines:</p>
        <p style="color: #e0e0e0; margin: 4px 0 0 0; font-size: 12px;">• Max 2 words (≤11 chars each) OR multiple words (≤18 total chars)</p>
      `;
    }
    
    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentName;
    input.maxLength = 50; // Absolute max limit
    input.style.cssText = `
      width: 100%;
      padding: 10px;
      border: 2px solid #444;
      border-radius: 6px;
      background: #1a1a1a;
      color: #e0e0e0;
      font-size: 16px;
      box-sizing: border-box;
      margin-bottom: 8px;
    `;
    
    const counter = document.createElement('div');
    counter.style.cssText = 'margin-bottom: 16px; font-size: 13px;';
    
    function updateCounter() {
      const value = input.value.trim();
      const words = value.split(/\s+/).filter(w => w.length > 0);
      const wordCount = words.length;
      const totalLength = value.length;
      const validation = validateNameRules(value);
      
      let statusHtml = '';
      if (validation.isValid) {
        statusHtml = `<span style="color: #81c784;">✓ Good for visibility</span>`;
      } else {
        statusHtml = `<span style="color: #ffb74d;">⚠️ Could be improved</span>`;
      }
      
      const lengthColor = totalLength <= 18 ? '#81c784' : '#ffb74d';
      const wordCountColor = wordCount <= 2 ? '#81c784' : (totalLength <= 18 ? '#81c784' : '#ffb74d');
      
      counter.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            ${statusHtml} • 
            <span style="color: ${wordCountColor};">${wordCount} word${wordCount !== 1 ? 's' : ''}</span> • 
            <span style="color: ${lengthColor};">${totalLength} chars</span>
          </div>
        </div>
      `;
    }
    
    input.addEventListener('input', updateCounter);
    updateCounter();
    
    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = 'display: flex; gap: 12px; justify-content: flex-end;';
    
    const skipBtn = document.createElement('button');
    skipBtn.textContent = 'Use Anyway';
    skipBtn.style.cssText = `
      padding: 10px 20px;
      border: none;
      border-radius: 6px;
      background: #555;
      color: #e0e0e0;
      cursor: pointer;
      font-size: 14px;
    `;
    skipBtn.addEventListener('mouseover', () => skipBtn.style.background = '#666');
    skipBtn.addEventListener('mouseout', () => skipBtn.style.background = '#555');
    
    const saveBtn = document.createElement('button');
    saveBtn.textContent = 'Save';
    saveBtn.style.cssText = `
      padding: 10px 20px;
      border: none;
      border-radius: 6px;
      background: #4fc3f7;
      color: #000;
      cursor: pointer;
      font-size: 14px;
      font-weight: bold;
    `;
    saveBtn.addEventListener('mouseover', () => saveBtn.style.background = '#29b6f6');
    saveBtn.addEventListener('mouseout', () => saveBtn.style.background = '#4fc3f7');
    
    skipBtn.onclick = () => {
      onSave(currentName); // Use the original auto-generated name
      document.body.removeChild(overlay);
    };
    
    saveBtn.onclick = () => {
      const newName = input.value.trim();
      if (newName) {
        onSave(newName);
      }
      document.body.removeChild(overlay);
    };
    
    input.onkeydown = (e) => {
      if (e.key === 'Enter') {
        saveBtn.click();
      } else if (e.key === 'Escape') {
        skipBtn.click();
      }
    };
    
    buttonContainer.appendChild(skipBtn);
    buttonContainer.appendChild(saveBtn);
    
    modal.appendChild(title);
    modal.appendChild(subtitle);
    modal.appendChild(input);
    modal.appendChild(counter);
    modal.appendChild(buttonContainer);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    input.focus();
    input.select();
  }

  window.IconModule = {
    initIcons,
    addLink,
    loadLinks
  };
})();
