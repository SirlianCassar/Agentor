// Éditeur de texte simple avec surlignage des tags et selectors
// Version basique : marqueurs visibles, surlignage CSS, comportements simples

const REGEX_TAG = /\*([^*\n]+)\*/g;
const REGEX_SELECTOR = /#([^#\n]+):\s*([^#\n]+)#/g;

// Fonction pour surligner le texte avec des spans
function highlightText(text) {
  let html = '';
  let lastIndex = 0;
  const matches = [];
  
  // Trouver tous les tags
  REGEX_TAG.lastIndex = 0;
  let match;
  while ((match = REGEX_TAG.exec(text)) !== null) {
    matches.push({
      type: 'tag',
      start: match.index,
      end: match.index + match[0].length,
      full: match[0],
    });
  }
  
  // Trouver tous les selectors
  REGEX_SELECTOR.lastIndex = 0;
  while ((match = REGEX_SELECTOR.exec(text)) !== null) {
    matches.push({
      type: 'selector',
      start: match.index,
      end: match.index + match[0].length,
      full: match[0],
    });
  }
  
  // Trier par position
  matches.sort((a, b) => a.start - b.start);
  
  // Construire le HTML
  for (const m of matches) {
    // Texte avant
    if (m.start > lastIndex) {
      const beforeText = text.substring(lastIndex, m.start);
      html += escapeHtml(beforeText.replace(/\n/g, '<br>'));
    }
    
    // Le match avec surlignage
    if (m.type === 'tag') {
      html += `<span class="tag-highlight">${escapeHtml(m.full)}</span>`;
    } else {
      // Remplacer : par │ dans l'affichage
      const displayText = m.full.replace(':', '│');
      html += `<span class="selector-highlight">${escapeHtml(displayText)}</span>`;
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

// Fonction pour obtenir le texte brut d'un contenteditable
function getTextFromElement(element) {
  return element.innerText || element.textContent || '';
}

// Fonction pour obtenir la position du curseur
function getCaretPosition(element) {
  const selection = window.getSelection();
  if (selection.rangeCount === 0) return 0;
  
  const range = selection.getRangeAt(0);
  const preRange = range.cloneRange();
  preRange.selectNodeContents(element);
  preRange.setEnd(range.endContainer, range.endOffset);
  
  return preRange.toString().length;
}

// Fonction pour définir la position du curseur
function setCaretPosition(element, position) {
  const range = document.createRange();
  const selection = window.getSelection();
  
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
  
  // Placer à la fin
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

// Créer un éditeur simple
export function createSimpleEditor(container, initialText, onChange) {
  container.contentEditable = 'true';
  container.setAttribute('spellcheck', 'false');
  container.style.cssText = `
    padding: 12px;
    font-size: 15px;
    font-family: 'Space Grotesk', 'Segoe UI', system-ui, sans-serif;
    line-height: 1.6;
    color: var(--text);
    background: transparent;
    outline: none;
    white-space: pre-wrap;
    word-wrap: break-word;
    min-height: 100%;
  `;
  
  // Styles pour les highlights
  if (!document.getElementById('simple-editor-styles')) {
    const style = document.createElement('style');
    style.id = 'simple-editor-styles';
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
      [contenteditable="true"]:focus {
        outline: none;
      }
    `;
    document.head.appendChild(style);
  }
  
  // Fonction pour mettre à jour le rendu
  let isUpdating = false;
  function updateHighlight() {
    if (isUpdating) return;
    isUpdating = true;
    
    const text = getTextFromElement(container);
    const cursorPos = getCaretPosition(container);
    
    container.innerHTML = highlightText(text);
    
    // Restaurer le curseur
    setCaretPosition(container, Math.min(cursorPos, text.length));
    
    isUpdating = false;
  }
  
  // Initialiser
  container.textContent = initialText || '';
  updateHighlight();
  
  // Écouter les changements
  container.addEventListener('input', () => {
    if (!isUpdating) {
      const text = getTextFromElement(container);
      updateHighlight();
      if (onChange) onChange(text);
    }
  });
  
  // Gérer Backspace/Delete pour supprimer les tags/selectors entiers
  container.addEventListener('keydown', (e) => {
    if (e.key !== 'Backspace' && e.key !== 'Delete') return;
    
    const text = getTextFromElement(container);
    const cursorPos = getCaretPosition(container);
    const selection = window.getSelection();
    
    // Si une sélection est active
    if (selection.rangeCount > 0 && !selection.isCollapsed) {
      const range = selection.getRangeAt(0);
      const startPos = getCaretPosition(container);
      const endPos = startPos + selection.toString().length;
      
      // Vérifier si la sélection correspond à un tag ou selector
      const selectedText = text.substring(startPos, endPos);
      const tagMatch = /^\*([^*\n]+)\*$/.exec(selectedText);
      const selectorMatch = /^#([^#\n]+):\s*([^#\n]+)#$/.exec(selectedText);
      
      if (tagMatch || selectorMatch) {
        e.preventDefault();
        range.deleteContents();
        updateHighlight();
        if (onChange) onChange(getTextFromElement(container));
        return false;
      }
    }
    
    // Si pas de sélection, vérifier si on est dans un tag/selector
    if (e.key === 'Backspace' && cursorPos > 0) {
      REGEX_TAG.lastIndex = 0;
      while ((match = REGEX_TAG.exec(text)) !== null) {
        const tagStart = match.index;
        const tagEnd = tagStart + match[0].length;
        
        if (cursorPos >= tagStart && cursorPos <= tagEnd) {
          e.preventDefault();
          const before = text.substring(0, tagStart);
          const after = text.substring(tagEnd);
          container.textContent = before + after;
          setCaretPosition(container, tagStart);
          updateHighlight();
          if (onChange) onChange(getTextFromElement(container));
          return false;
        }
      }
      
      REGEX_SELECTOR.lastIndex = 0;
      while ((match = REGEX_SELECTOR.exec(text)) !== null) {
        const selectorStart = match.index;
        const selectorEnd = selectorStart + match[0].length;
        
        if (cursorPos >= selectorStart && cursorPos <= selectorEnd) {
          e.preventDefault();
          const before = text.substring(0, selectorStart);
          const after = text.substring(selectorEnd);
          container.textContent = before + after;
          setCaretPosition(container, selectorStart);
          updateHighlight();
          if (onChange) onChange(getTextFromElement(container));
          return false;
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
          container.textContent = before + after;
          setCaretPosition(container, tagStart);
          updateHighlight();
          if (onChange) onChange(getTextFromElement(container));
          return false;
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
          container.textContent = before + after;
          setCaretPosition(container, selectorStart);
          updateHighlight();
          if (onChange) onChange(getTextFromElement(container));
          return false;
        }
      }
    }
  });
  
  // Gérer le clic pour sélectionner les tags/selectors entiers
  container.addEventListener('mousedown', (e) => {
    setTimeout(() => {
      const text = getTextFromElement(container);
      const cursorPos = getCaretPosition(container);
      
      // Vérifier les tags
      REGEX_TAG.lastIndex = 0;
      let match;
      while ((match = REGEX_TAG.exec(text)) !== null) {
        const tagStart = match.index;
        const tagEnd = tagStart + match[0].length;
        
        if (cursorPos >= tagStart && cursorPos <= tagEnd) {
          const range = document.createRange();
          const selection = window.getSelection();
          
          // Trouver les nœuds correspondants
          let charCount = 0;
          const walker = document.createTreeWalker(
            container,
            NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
            null,
            false
          );
          
          let startNode = null, startOffset = 0;
          let endNode = null, endOffset = 0;
          let node;
          
          while ((node = walker.nextNode())) {
            let nodeLength = 0;
            if (node.nodeType === Node.TEXT_NODE) {
              nodeLength = node.textContent.length;
            } else if (node.classList && node.classList.contains('tag-highlight')) {
              nodeLength = node.textContent.length;
            }
            
            const nextCharCount = charCount + nodeLength;
            
            if (!startNode && tagStart >= charCount && tagStart <= nextCharCount) {
              startNode = node;
              startOffset = tagStart - charCount;
            }
            
            if (tagEnd >= charCount && tagEnd <= nextCharCount) {
              endNode = node;
              endOffset = tagEnd - charCount;
              break;
            }
            
            charCount = nextCharCount;
          }
          
          if (startNode && endNode) {
            if (startNode.nodeType === Node.TEXT_NODE) {
              range.setStart(startNode, startOffset);
            } else {
              range.setStartBefore(startNode);
            }
            if (endNode.nodeType === Node.TEXT_NODE) {
              range.setEnd(endNode, endOffset);
            } else {
              range.setEndAfter(endNode);
            }
            selection.removeAllRanges();
            selection.addRange(range);
          }
          return;
        }
      }
      
      // Vérifier les selectors (même logique)
      REGEX_SELECTOR.lastIndex = 0;
      while ((match = REGEX_SELECTOR.exec(text)) !== null) {
        const selectorStart = match.index;
        const selectorEnd = selectorStart + match[0].length;
        
        if (cursorPos >= selectorStart && cursorPos <= selectorEnd) {
          // Même logique que pour les tags
          const range = document.createRange();
          const selection = window.getSelection();
          
          let charCount = 0;
          const walker = document.createTreeWalker(
            container,
            NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
            null,
            false
          );
          
          let startNode = null, startOffset = 0;
          let endNode = null, endOffset = 0;
          let node;
          
          while ((node = walker.nextNode())) {
            let nodeLength = 0;
            if (node.nodeType === Node.TEXT_NODE) {
              nodeLength = node.textContent.length;
            } else if (node.classList && node.classList.contains('selector-highlight')) {
              nodeLength = node.textContent.length;
            }
            
            const nextCharCount = charCount + nodeLength;
            
            if (!startNode && selectorStart >= charCount && selectorStart <= nextCharCount) {
              startNode = node;
              startOffset = selectorStart - charCount;
            }
            
            if (selectorEnd >= charCount && selectorEnd <= nextCharCount) {
              endNode = node;
              endOffset = selectorEnd - charCount;
              break;
            }
            
            charCount = nextCharCount;
          }
          
          if (startNode && endNode) {
            if (startNode.nodeType === Node.TEXT_NODE) {
              range.setStart(startNode, startOffset);
            } else {
              range.setStartBefore(startNode);
            }
            if (endNode.nodeType === Node.TEXT_NODE) {
              range.setEnd(endNode, endOffset);
            } else {
              range.setEndAfter(endNode);
            }
            selection.removeAllRanges();
            selection.addRange(range);
          }
          return;
        }
      }
    }, 10);
  });
  
  // Gérer la copie avec couleur noire
  container.addEventListener('copy', (e) => {
    const selection = window.getSelection();
    if (selection && selection.toString()) {
      const text = selection.toString();
      e.clipboardData.setData('text/plain', text);
      const html = `<span style="color: #000000;">${text.replace(/\n/g, '<br>')}</span>`;
      e.clipboardData.setData('text/html', html);
      e.preventDefault();
    }
  });
  
  return {
    getValue: () => getTextFromElement(container),
    setValue: (text) => {
      container.textContent = text;
      updateHighlight();
    },
    focus: () => container.focus(),
    setCursor: (pos) => {
      setCaretPosition(container, pos);
      container.focus();
    },
    getCursor: () => getCaretPosition(container),
    destroy: () => {
      // Cleanup si nécessaire
    },
  };
}

