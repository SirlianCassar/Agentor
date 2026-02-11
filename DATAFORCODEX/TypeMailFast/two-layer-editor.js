// Système d'éditeur à deux couches pour surlignage sans décalage
// Couche inférieure : invisible, contenteditable avec texte complet (incluant * et #)
// Couche supérieure : visible, div avec surlignage mais sans marqueurs

const REGEX_TAG = /\*([^*\n]+)\*/g;
const REGEX_SELECTOR = /#([^#\n]+):\s*([^#\n]+)#/g;

// Fonction pour convertir le texte avec tags/selectors en HTML avec surlignage
function highlightText(text, hideMarkers = true) {
  let html = '';
  let lastIndex = 0;
  
  // Trouver tous les tags et selectors
  const matches = [];
  
  // Tags
  let match;
  REGEX_TAG.lastIndex = 0;
  while ((match = REGEX_TAG.exec(text)) !== null) {
    matches.push({
      type: 'tag',
      start: match.index,
      end: match.index + match[0].length,
      content: match[1],
      full: match[0]
    });
  }
  
  // Selectors
  REGEX_SELECTOR.lastIndex = 0;
  while ((match = REGEX_SELECTOR.exec(text)) !== null) {
    matches.push({
      type: 'selector',
      start: match.index,
      end: match.index + match[0].length,
      option1: match[1],
      option2: match[2],
      full: match[0]
    });
  }
  
  // Trier par position
  matches.sort((a, b) => a.start - b.start);
  
  // Construire le HTML
  for (const m of matches) {
    // Texte avant le match
    if (m.start > lastIndex) {
      const beforeText = text.substring(lastIndex, m.start);
      html += escapeHtml(beforeText.replace(/\n/g, '<br>'));
    }
    
    // Le match lui-même
    if (m.type === 'tag') {
      if (hideMarkers) {
        // Masquer les * mais garder leur espace pour éviter les décalages
        html += `<span class="tag-highlight"><span class="marker-hidden">*</span>${escapeHtml(m.content)}<span class="marker-hidden">*</span></span>`;
      } else {
        html += `<span class="tag-highlight">${escapeHtml(m.full)}</span>`;
      }
    } else if (m.type === 'selector') {
      if (hideMarkers) {
        // Masquer les # mais garder leur espace, remplacer : par │
        html += `<span class="selector-highlight"><span class="marker-hidden">#</span>${escapeHtml(m.option1)}<span class="selector-separator">│</span>${escapeHtml(m.option2)}<span class="marker-hidden">#</span></span>`;
      } else {
        html += `<span class="selector-highlight">${escapeHtml(m.full)}</span>`;
      }
    }
    
    lastIndex = m.end;
  }
  
  // Texte restant
  if (lastIndex < text.length) {
    const afterText = text.substring(lastIndex);
    html += escapeHtml(afterText.replace(/\n/g, '<br>'));
  }
  
  return html;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Fonction pour obtenir la position du curseur dans un contenteditable
function getCaretPosition(element) {
  const selection = window.getSelection();
  if (selection.rangeCount === 0) return 0;
  
  const range = selection.getRangeAt(0);
  const preCaretRange = range.cloneRange();
  preCaretRange.selectNodeContents(element);
  preCaretRange.setEnd(range.endContainer, range.endOffset);
  
  return preCaretRange.toString().length;
}

// Fonction pour définir la position du curseur dans un contenteditable
function setCaretPosition(element, position) {
  const range = document.createRange();
  const selection = window.getSelection();
  
  // Utiliser une approche plus simple avec textContent
  const text = element.textContent || '';
  if (position < 0 || position > text.length) {
    position = Math.max(0, Math.min(position, text.length));
  }
  
  let charCount = 0;
  const walker = document.createTreeWalker(
    element,
    NodeFilter.SHOW_TEXT,
    null,
    false
  );
  
  let node;
  while ((node = walker.nextNode())) {
    const nodeLength = node.textContent.length;
    const nextCharCount = charCount + nodeLength;
    
    if (position <= nextCharCount) {
      const offset = position - charCount;
      range.setStart(node, Math.min(offset, nodeLength));
      range.setEnd(node, Math.min(offset, nodeLength));
      selection.removeAllRanges();
      selection.addRange(range);
      return;
    }
    
    charCount = nextCharCount;
  }
  
  // Si on arrive ici, placer à la fin
  const lastNode = getLastTextNode(element);
  if (lastNode) {
    range.setStart(lastNode, lastNode.textContent.length);
    range.setEnd(lastNode, lastNode.textContent.length);
    selection.removeAllRanges();
    selection.addRange(range);
  }
}

function getLastTextNode(node) {
  if (node.nodeType === Node.TEXT_NODE) {
    return node;
  }
  for (let i = node.childNodes.length - 1; i >= 0; i--) {
    const result = getLastTextNode(node.childNodes[i]);
    if (result) return result;
  }
  return null;
}

// Fonction pour obtenir le texte brut d'un contenteditable
function getTextFromContentEditable(element) {
  return element.innerText || element.textContent || '';
}

// Créer un éditeur à deux couches
export function createTwoLayerEditor(container, initialText, onChange) {
  // Créer le wrapper
  const wrapper = document.createElement('div');
  wrapper.className = 'two-layer-editor-wrapper';
  wrapper.style.cssText = `
    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;
  `;
  
  // Couche inférieure : invisible, contenteditable
  const bottomLayer = document.createElement('div');
  bottomLayer.className = 'editor-bottom-layer';
  bottomLayer.contentEditable = 'true';
  bottomLayer.setAttribute('spellcheck', 'false');
  const baseStyles = `
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    padding: 12px;
    margin: 0;
    font-size: 15px;
    font-family: 'Space Grotesk', 'Segoe UI', system-ui, sans-serif;
    line-height: 1.6;
    border: none;
    outline: none;
    white-space: pre-wrap;
    word-wrap: break-word;
    overflow-wrap: break-word;
    box-sizing: border-box;
  `;
  bottomLayer.style.cssText = baseStyles + `
    color: transparent;
    background: transparent;
    z-index: 1;
    caret-color: var(--accent);
    overflow: auto;
  `;
  bottomLayer.textContent = initialText || '';
  
  // Couche supérieure : visible, div avec surlignage
  const topLayer = document.createElement('div');
  topLayer.className = 'editor-top-layer';
  topLayer.style.cssText = baseStyles + `
    color: var(--text);
    background: transparent;
    pointer-events: none;
    z-index: 2;
    overflow: hidden;
  `;
  
  // Styles pour les highlights
  const style = document.createElement('style');
  style.id = 'two-layer-editor-styles';
  style.textContent = `
    .tag-highlight {
      background: rgba(255, 107, 107, 0.18);
      border: 1px solid rgba(255, 107, 107, 0.3);
      border-radius: 4px;
      padding: 0px 1px;
      color: #ff6b6b;
      font-weight: 500;
    }
    .selector-highlight {
      background: rgba(74, 222, 128, 0.18);
      border: 1px solid rgba(74, 222, 128, 0.3);
      border-radius: 4px;
      padding: 0px 1px;
      color: #4ade80;
      font-weight: 500;
    }
    .marker-hidden {
      visibility: hidden;
      /* Garde l'espace du caractère mais le masque visuellement */
    }
    .selector-separator {
      color: rgba(74, 222, 128, 0.6);
      font-weight: 300;
      margin: 0 4px;
    }
    .editor-bottom-layer::selection {
      background: rgba(139, 111, 201, 0.3);
    }
  `;
  if (!document.getElementById('two-layer-editor-styles')) {
    document.head.appendChild(style);
  }
  
  // Fonction pour mettre à jour la couche supérieure
  function updateTopLayer() {
    const text = getTextFromContentEditable(bottomLayer);
    topLayer.innerHTML = highlightText(text, true);
    
    // Synchroniser le scroll
    topLayer.scrollTop = bottomLayer.scrollTop;
    topLayer.scrollLeft = bottomLayer.scrollLeft;
  }
  
  
  // Écouter les changements
  let updateTimeout;
  bottomLayer.addEventListener('input', () => {
    const text = getTextFromContentEditable(bottomLayer);
    updateTopLayer();
    
    clearTimeout(updateTimeout);
    updateTimeout = setTimeout(() => {
      if (onChange) onChange(text);
    }, 10);
  });
  
  // Gérer le backspace/delete et la saisie pour supprimer/remplacer les tags/selectors entiers
  bottomLayer.addEventListener('keydown', (e) => {
    const text = getTextFromContentEditable(bottomLayer);
    const selection = window.getSelection();
    
    // Si une sélection est active
    if (selection.rangeCount > 0 && !selection.isCollapsed) {
      const range = selection.getRangeAt(0);
      
      // Obtenir la position de la sélection dans le texte
      const preRange = range.cloneRange();
      preRange.selectNodeContents(bottomLayer);
      preRange.setEnd(range.startContainer, range.startOffset);
      const startPos = preRange.toString().length;
      const endPos = startPos + selection.toString().length;
      
      // Extraire le texte sélectionné depuis le texte complet
      const selectedText = text.substring(startPos, endPos);
      
      // Vérifier si la sélection correspond à un tag ou selector complet
      const tagMatch = /^\*([^*\n]+)\*$/.exec(selectedText);
      const selectorMatch = /^#([^#\n]+):\s*([^#\n]+)#$/.exec(selectedText);
      
      if (tagMatch || selectorMatch) {
        // Si on tape un caractère, remplacer le tag/selector
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
          e.preventDefault();
          e.stopPropagation();
          range.deleteContents();
          const textNode = document.createTextNode(e.key);
          range.insertNode(textNode);
          range.setStartAfter(textNode);
          range.setEndAfter(textNode);
          selection.removeAllRanges();
          selection.addRange(range);
          updateTopLayer();
          if (onChange) onChange(getTextFromContentEditable(bottomLayer));
          return false;
        }
        
        // Si Backspace ou Delete, supprimer complètement
        if (e.key === 'Backspace' || e.key === 'Delete') {
          e.preventDefault();
          e.stopPropagation();
          range.deleteContents();
          updateTopLayer();
          if (onChange) onChange(getTextFromContentEditable(bottomLayer));
          return false;
        }
      }
    }
    
    // Si pas de sélection, gérer Backspace/Delete
    if (e.key !== 'Backspace' && e.key !== 'Delete') return;
    
    const cursorPos = getCaretPosition(bottomLayer);
    
    // Si pas de sélection, vérifier si on est dans ou juste avant un tag/selector
    if (e.key === 'Backspace' && cursorPos > 0) {
      // Vérifier les tags
      REGEX_TAG.lastIndex = 0;
      while ((match = REGEX_TAG.exec(text)) !== null) {
        const tagStart = match.index;
        const tagEnd = tagStart + match[0].length;
        
        if (cursorPos >= tagStart && cursorPos <= tagEnd) {
          e.preventDefault();
          const before = text.substring(0, tagStart);
          const after = text.substring(tagEnd);
          bottomLayer.textContent = before + after;
          setCaretPosition(bottomLayer, tagStart);
          updateTopLayer();
          if (onChange) onChange(getTextFromContentEditable(bottomLayer));
          return;
        }
      }
      
      // Vérifier les selectors
      REGEX_SELECTOR.lastIndex = 0;
      while ((match = REGEX_SELECTOR.exec(text)) !== null) {
        const selectorStart = match.index;
        const selectorEnd = selectorStart + match[0].length;
        
        if (cursorPos >= selectorStart && cursorPos <= selectorEnd) {
          e.preventDefault();
          const before = text.substring(0, selectorStart);
          const after = text.substring(selectorEnd);
          bottomLayer.textContent = before + after;
          setCaretPosition(bottomLayer, selectorStart);
          updateTopLayer();
          if (onChange) onChange(getTextFromContentEditable(bottomLayer));
          return;
        }
      }
    }
    
    // Pour Delete
    if (e.key === 'Delete' && cursorPos < text.length) {
      REGEX_TAG.lastIndex = 0;
      while ((match = REGEX_TAG.exec(text)) !== null) {
        const tagStart = match.index;
        const tagEnd = tagStart + match[0].length;
        
        if (cursorPos >= tagStart && cursorPos < tagEnd) {
          e.preventDefault();
          const before = text.substring(0, tagStart);
          const after = text.substring(tagEnd);
          bottomLayer.textContent = before + after;
          setCaretPosition(bottomLayer, tagStart);
          updateTopLayer();
          if (onChange) onChange(getTextFromContentEditable(bottomLayer));
          return;
        }
      }
      
      REGEX_SELECTOR.lastIndex = 0;
      while ((match = REGEX_SELECTOR.exec(text)) !== null) {
        const selectorStart = match.index;
        const selectorEnd = selectorStart + match[0].length;
        
        if (cursorPos >= selectorStart && cursorPos < selectorEnd) {
          e.preventDefault();
          const before = text.substring(0, selectorStart);
          const after = text.substring(selectorEnd);
          bottomLayer.textContent = before + after;
          setCaretPosition(bottomLayer, selectorStart);
          updateTopLayer();
          if (onChange) onChange(getTextFromContentEditable(bottomLayer));
          return;
        }
      }
    }
  });
  
  // Fonction helper pour sélectionner un tag/selector complet
  function selectTagOrSelector(text, start, end) {
    const range = document.createRange();
    const selection = window.getSelection();
    
    // Trouver les nœuds de texte correspondants
    let charCount = 0;
    const walker = document.createTreeWalker(
      bottomLayer,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );
    
    let startNode = null, startOffset = 0;
    let endNode = null, endOffset = 0;
    let node;
    
    while ((node = walker.nextNode())) {
      const nodeLength = node.textContent.length;
      const nextCharCount = charCount + nodeLength;
      
      if (!startNode && start >= charCount && start <= nextCharCount) {
        startNode = node;
        startOffset = Math.min(start - charCount, nodeLength);
      }
      
      if (end >= charCount && end <= nextCharCount) {
        endNode = node;
        endOffset = Math.min(end - charCount, nodeLength);
        break;
      }
      
      charCount = nextCharCount;
    }
    
    if (startNode && endNode) {
      range.setStart(startNode, startOffset);
      range.setEnd(endNode, endOffset);
      selection.removeAllRanges();
      selection.addRange(range);
      return true;
    }
    return false;
  }
  
  // Gérer le clic pour sélectionner les tags/selectors entiers
  bottomLayer.addEventListener('mousedown', (e) => {
    // Laisser le navigateur gérer le clic d'abord, puis ajuster la sélection
    setTimeout(() => {
      const text = getTextFromContentEditable(bottomLayer);
      const cursorPos = getCaretPosition(bottomLayer);
      
      // Vérifier les tags
      REGEX_TAG.lastIndex = 0;
      let match;
      while ((match = REGEX_TAG.exec(text)) !== null) {
        const tagStart = match.index;
        const tagEnd = tagStart + match[0].length;
        
        if (cursorPos >= tagStart && cursorPos <= tagEnd) {
          if (selectTagOrSelector(text, tagStart, tagEnd)) {
            e.preventDefault();
            return;
          }
        }
      }
      
      // Vérifier les selectors
      REGEX_SELECTOR.lastIndex = 0;
      while ((match = REGEX_SELECTOR.exec(text)) !== null) {
        const selectorStart = match.index;
        const selectorEnd = selectorStart + match[0].length;
        
        if (cursorPos >= selectorStart && cursorPos <= selectorEnd) {
          if (selectTagOrSelector(text, selectorStart, selectorEnd)) {
            e.preventDefault();
            return;
          }
        }
      }
    }, 0);
  });
  
  // Gérer la copie avec couleur noire
  bottomLayer.addEventListener('copy', (e) => {
    const selection = window.getSelection();
    if (selection && selection.toString()) {
      const text = selection.toString();
      e.clipboardData.setData('text/plain', text);
      const html = `<span style="color: #000000;">${text.replace(/\n/g, '<br>')}</span>`;
      e.clipboardData.setData('text/html', html);
      e.preventDefault();
    }
  });
  
  // Observer pour synchroniser les dimensions et le scroll
  const resizeObserver = new ResizeObserver(() => {
    // Forcer la synchronisation exacte des dimensions
    const rect = bottomLayer.getBoundingClientRect();
    topLayer.style.width = rect.width + 'px';
    topLayer.style.height = rect.height + 'px';
    updateTopLayer();
  });
  resizeObserver.observe(bottomLayer);
  resizeObserver.observe(wrapper);
  
  // Synchroniser le scroll en temps réel avec requestAnimationFrame pour fluidité
  let scrollTimeout;
  bottomLayer.addEventListener('scroll', () => {
    topLayer.scrollTop = bottomLayer.scrollTop;
    topLayer.scrollLeft = bottomLayer.scrollLeft;
    
    // Annuler les mises à jour en attente pour éviter les saccades
    cancelAnimationFrame(scrollTimeout);
    scrollTimeout = requestAnimationFrame(() => {
      topLayer.scrollTop = bottomLayer.scrollTop;
      topLayer.scrollLeft = bottomLayer.scrollLeft;
    });
  });
  
  // Assembler
  wrapper.appendChild(bottomLayer);
  wrapper.appendChild(topLayer);
  container.appendChild(wrapper);
  
  // Initialiser
  updateTopLayer();
  
  return {
    getValue: () => getTextFromContentEditable(bottomLayer),
    setValue: (text) => {
      bottomLayer.textContent = text || '';
      updateTopLayer();
    },
    focus: () => bottomLayer.focus(),
    setCursor: (pos) => {
      setCaretPosition(bottomLayer, pos);
      bottomLayer.focus();
    },
    getCursor: () => getCaretPosition(bottomLayer),
    destroy: () => {
      resizeObserver.disconnect();
      wrapper.remove();
    }
  };
}

