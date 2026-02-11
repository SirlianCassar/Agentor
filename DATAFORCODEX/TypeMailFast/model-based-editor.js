// Éditeur basé sur un modèle de données
// Séparation complète entre le contenu (avec marqueurs) et le rendu (sans marqueurs)

const REGEX_TAG = /\*([^*\n]+)\*/g;
const REGEX_SELECTOR = /#([^#\n]+):\s*([^#\n]+)#/g;

// Modèle de données : liste de segments (texte, tag, ou selector)
class DocumentModel {
  constructor(text = '') {
    this.segments = this.parseText(text);
  }
  
  parseText(text) {
    const segments = [];
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
        content: match[1],
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
        option1: match[1],
        option2: match[2].trim(),
        full: match[0],
      });
    }
    
    // Trier par position
    matches.sort((a, b) => a.start - b.start);
    
    // Construire les segments
    for (const m of matches) {
      // Texte avant
      if (m.start > lastIndex) {
        const textSegment = text.substring(lastIndex, m.start);
        if (textSegment) {
          segments.push({ type: 'text', content: textSegment });
        }
      }
      
      // Le match
      if (m.type === 'tag') {
        segments.push({ type: 'tag', content: m.content, full: m.full });
      } else {
        segments.push({ 
          type: 'selector', 
          option1: m.option1, 
          option2: m.option2,
          full: m.full,
        });
      }
      
      lastIndex = m.end;
    }
    
    // Texte restant
    if (lastIndex < text.length) {
      const textSegment = text.substring(lastIndex);
      if (textSegment) {
        segments.push({ type: 'text', content: textSegment });
      }
    }
    
    // Si aucun segment, créer un segment texte vide
    if (segments.length === 0) {
      segments.push({ type: 'text', content: '' });
    }
    
    return segments;
  }
  
  toText() {
    return this.segments.map(s => {
      if (s.type === 'text') return s.content;
      if (s.type === 'tag') return `*${s.content}*`;
      if (s.type === 'selector') return `#${s.option1}:${s.option2}#`;
      return '';
    }).join('');
  }
  
  insertText(position, text) {
    // Trouver le segment et la position dans ce segment
    let currentPos = 0;
    for (let i = 0; i < this.segments.length; i++) {
      const seg = this.segments[i];
      const segLength = seg.type === 'text' ? seg.content.length : seg.full.length;
      
      if (position <= currentPos + segLength) {
        if (seg.type === 'text') {
          const offset = position - currentPos;
          seg.content = seg.content.slice(0, offset) + text + seg.content.slice(offset);
        } else {
          // Insérer avant le tag/selector
          this.segments.splice(i, 0, { type: 'text', content: text });
        }
        return;
      }
      currentPos += segLength;
    }
    
    // Ajouter à la fin
    const lastSeg = this.segments[this.segments.length - 1];
    if (lastSeg.type === 'text') {
      lastSeg.content += text;
    } else {
      this.segments.push({ type: 'text', content: text });
    }
  }
  
  deleteRange(start, end) {
    // Implémentation simplifiée : re-parse après suppression
    const text = this.toText();
    const newText = text.slice(0, start) + text.slice(end);
    this.segments = this.parseText(newText);
  }
  
  getSegmentAt(position) {
    let currentPos = 0;
    for (const seg of this.segments) {
      const segLength = seg.type === 'text' ? seg.content.length : seg.full.length;
      if (position >= currentPos && position < currentPos + segLength) {
        return { segment: seg, offset: position - currentPos, position: currentPos };
      }
      currentPos += segLength;
    }
    return null;
  }
}

// Rendu visuel sans marqueurs
class VisualRenderer {
  constructor(container, model, onUpdate) {
    this.container = container;
    this.model = model;
    this.onUpdate = onUpdate;
    this.cursorPosition = 0;
    this.isFocused = false;
    
    this.setupContainer();
    this.render();
  }
  
  setupContainer() {
    this.container.style.cssText = `
      position: relative;
      width: 100%;
      height: 100%;
      overflow: auto;
      padding: 12px;
      font-size: 15px;
      font-family: 'Space Grotesk', 'Segoe UI', system-ui, sans-serif;
      line-height: 1.6;
      color: var(--text);
      background: transparent;
      outline: none;
      white-space: pre-wrap;
      word-wrap: break-word;
    `;
    this.container.setAttribute('contenteditable', 'true');
    this.container.setAttribute('spellcheck', 'false');
    
    // Styles pour les highlights
    if (!document.getElementById('model-editor-styles')) {
      const style = document.createElement('style');
      style.id = 'model-editor-styles';
      style.textContent = `
        .tag-highlight {
          background: rgba(255, 107, 107, 0.18);
          border: 1px solid rgba(255, 107, 107, 0.3);
          border-radius: 4px;
          padding: 0px 1px;
          color: #ff6b6b;
          font-weight: 500;
          cursor: pointer;
        }
        .selector-highlight {
          background: rgba(74, 222, 128, 0.18);
          border: 1px solid rgba(74, 222, 128, 0.3);
          border-radius: 4px;
          padding: 0px 1px;
          color: #4ade80;
          font-weight: 500;
          cursor: pointer;
        }
        [contenteditable="true"]:focus {
          outline: none;
        }
      `;
      document.head.appendChild(style);
    }
  }
  
  render() {
    const html = this.model.segments.map(seg => {
      if (seg.type === 'text') {
        return escapeHtml(seg.content.replace(/\n/g, '<br>'));
      } else if (seg.type === 'tag') {
        return `<span class="tag-highlight" data-type="tag" data-content="${escapeHtml(seg.content)}">${escapeHtml(seg.content)}</span>`;
      } else if (seg.type === 'selector') {
        return `<span class="selector-highlight" data-type="selector" data-option1="${escapeHtml(seg.option1)}" data-option2="${escapeHtml(seg.option2)}">${escapeHtml(seg.option1)}│${escapeHtml(seg.option2)}</span>`;
      }
      return '';
    }).join('');
    
    this.container.innerHTML = html;
    this.restoreCursor();
  }
  
  getCursorPosition() {
    const selection = window.getSelection();
    if (selection.rangeCount === 0) return 0;
    
    const range = selection.getRangeAt(0);
    const preRange = range.cloneRange();
    preRange.selectNodeContents(this.container);
    preRange.setEnd(range.endContainer, range.endOffset);
    
    // Compter en tenant compte des tags/selectors
    let pos = 0;
    const walker = document.createTreeWalker(
      this.container,
      NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
      null,
      false
    );
    
    let node;
    while ((node = walker.nextNode())) {
      if (node === range.endContainer) {
        if (node.nodeType === Node.TEXT_NODE) {
          pos += range.endOffset;
        } else {
          // Si c'est un élément, trouver sa position dans le modèle
          const textBefore = this.getTextBeforeNode(node);
          pos = textBefore.length;
        }
        break;
      }
      
      if (node.nodeType === Node.TEXT_NODE) {
        pos += node.textContent.length;
      } else if (node.classList.contains('tag-highlight')) {
        const content = node.getAttribute('data-content') || '';
        pos += content.length + 2; // +2 pour les *
      } else if (node.classList.contains('selector-highlight')) {
        const opt1 = node.getAttribute('data-option1') || '';
        const opt2 = node.getAttribute('data-option2') || '';
        pos += opt1.length + opt2.length + 3; // +3 pour #:#
      }
    }
    
    return pos;
  }
  
  getTextBeforeNode(targetNode) {
    let text = '';
    const walker = document.createTreeWalker(
      this.container,
      NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
      null,
      false
    );
    
    let node;
    while ((node = walker.nextNode())) {
      if (node === targetNode) break;
      
      if (node.nodeType === Node.TEXT_NODE) {
        text += node.textContent;
      } else if (node.classList.contains('tag-highlight')) {
        const content = node.getAttribute('data-content') || '';
        text += `*${content}*`;
      } else if (node.classList.contains('selector-highlight')) {
        const opt1 = node.getAttribute('data-option1') || '';
        const opt2 = node.getAttribute('data-option2') || '';
        text += `#${opt1}:${opt2}#`;
      }
    }
    
    return text;
  }
  
  setCursorPosition(position) {
    // Trouver la position dans le DOM
    let currentPos = 0;
    const walker = document.createTreeWalker(
      this.container,
      NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
      null,
      false
    );
    
    let node;
    while ((node = walker.nextNode())) {
      let nodeLength = 0;
      
      if (node.nodeType === Node.TEXT_NODE) {
        nodeLength = node.textContent.length;
      } else if (node.classList.contains('tag-highlight')) {
        const content = node.getAttribute('data-content') || '';
        nodeLength = content.length; // Longueur visible (sans les *)
      } else if (node.classList.contains('selector-highlight')) {
        const opt1 = node.getAttribute('data-option1') || '';
        const opt2 = node.getAttribute('data-option2') || '';
        nodeLength = opt1.length + opt2.length + 1; // +1 pour │
      }
      
      if (position <= currentPos + nodeLength) {
        const range = document.createRange();
        const selection = window.getSelection();
        
        if (node.nodeType === Node.TEXT_NODE) {
          const offset = position - currentPos;
          range.setStart(node, Math.min(offset, node.textContent.length));
          range.setEnd(node, Math.min(offset, node.textContent.length));
        } else {
          // Pour les tags/selectors, placer avant ou après selon la position
          if (position <= currentPos + nodeLength / 2) {
            range.setStartBefore(node);
            range.setEndBefore(node);
          } else {
            range.setStartAfter(node);
            range.setEndAfter(node);
          }
        }
        
        selection.removeAllRanges();
        selection.addRange(range);
        return;
      }
      
      currentPos += nodeLength;
    }
    
    // Placer à la fin
    const range = document.createRange();
    const selection = window.getSelection();
    range.selectNodeContents(this.container);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  }
  
  restoreCursor() {
    if (this.isFocused) {
      this.setCursorPosition(this.cursorPosition);
    }
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Créer un éditeur basé sur modèle
export function createModelBasedEditor(container, initialText, onChange) {
  const model = new DocumentModel(initialText || '');
  const renderer = new VisualRenderer(container, model, onChange);
  
  // Écouter les changements avec une approche plus robuste
  let isUpdating = false;
  let lastText = model.toText();
  
  function handleInput() {
    if (isUpdating) return;
    
    const currentText = container.innerText || container.textContent || '';
    const cursorPos = renderer.getCursorPosition();
    
    // Si le texte a changé, re-parse
    const newModel = new DocumentModel(currentText);
    const newText = newModel.toText();
    
    // Si le texte réel (avec marqueurs) a changé, mettre à jour
    if (newText !== lastText) {
      model.segments = newModel.segments;
      lastText = newText;
      
      isUpdating = true;
      renderer.render();
      renderer.setCursorPosition(Math.min(cursorPos, newText.length));
      isUpdating = false;
      
      if (onChange) onChange(newText);
    }
  }
  
  container.addEventListener('input', handleInput);
  
  // Gérer le backspace/delete
  container.addEventListener('keydown', (e) => {
    if (e.key === 'Backspace' || e.key === 'Delete') {
      const selection = window.getSelection();
      if (selection.rangeCount > 0 && !selection.isCollapsed) {
        const range = selection.getRangeAt(0);
        const startPos = renderer.getCursorPosition();
        const endPos = startPos + selection.toString().length;
        
        // Vérifier si c'est un tag/selector
        const selectedText = model.toText().substring(startPos, endPos);
        const tagMatch = /^\*([^*\n]+)\*$/.exec(selectedText);
        const selectorMatch = /^#([^#\n]+):\s*([^#\n]+)#$/.exec(selectedText);
        
        if (tagMatch || selectorMatch) {
          e.preventDefault();
          model.deleteRange(startPos, endPos);
          renderer.render();
          renderer.setCursorPosition(startPos);
          if (onChange) onChange(model.toText());
          return false;
        }
      }
    }
  });
  
  // Gérer le clic pour sélectionner les tags/selectors
  container.addEventListener('mousedown', (e) => {
    const target = e.target;
    if (target.classList.contains('tag-highlight') || target.classList.contains('selector-highlight')) {
      setTimeout(() => {
        const range = document.createRange();
        range.selectNodeContents(target);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
      }, 0);
    }
  });
  
  // Gérer la copie
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
  
  // Focus/blur
  container.addEventListener('focus', () => {
    renderer.isFocused = true;
  });
  
  container.addEventListener('blur', () => {
    renderer.isFocused = false;
    renderer.cursorPosition = renderer.getCursorPosition();
  });
  
  return {
    getValue: () => model.toText(),
    setValue: (text) => {
      model.segments = model.parseText(text);
      renderer.render();
    },
    focus: () => container.focus(),
    setCursor: (pos) => {
      renderer.setCursorPosition(pos);
      container.focus();
    },
    getCursor: () => renderer.getCursorPosition(),
    destroy: () => {
      // Cleanup si nécessaire
    },
  };
}

