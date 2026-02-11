// Configuration Quill pour TypeF@st
// Utilise des Blots personnalisés pour les tags et selectors

// Attendre que Quill soit chargé
function waitForQuill() {
  return new Promise((resolve) => {
    if (window.Quill) {
      resolve(window.Quill);
    } else {
      const checkInterval = setInterval(() => {
        if (window.Quill) {
          clearInterval(checkInterval);
          resolve(window.Quill);
        }
      }, 50);
    }
  });
}

// Fonction pour définir et enregistrer les blots (appelée après le chargement de Quill)
function registerBlots(QuillClass) {
  // Définir TagBlot
  const TagBlot = class extends QuillClass.import('blots/inline') {
    static create(value) {
      const node = super.create();
      node.setAttribute('data-type', 'tag');
      node.setAttribute('data-content', value);
      node.classList.add('tag-highlight');
      node.textContent = value; // Affiche seulement le contenu, pas les *
      return node;
    }
    
    static value(node) {
      return node.getAttribute('data-content') || '';
    }
    
    static formats(node) {
      return {
        content: node.getAttribute('data-content') || '',
      };
    }
  };
  
  TagBlot.blotName = 'tag';
  TagBlot.tagName = 'span';
  TagBlot.className = 'tag-highlight';
  
  // Définir SelectorBlot
  const SelectorBlot = class extends QuillClass.import('blots/inline') {
    static create(value) {
      const node = super.create();
      node.setAttribute('data-type', 'selector');
      node.setAttribute('data-option1', value.option1 || '');
      node.setAttribute('data-option2', value.option2 || '');
      node.classList.add('selector-highlight');
      // Affiche option1│option2 (sans les # et avec │ au lieu de :)
      node.textContent = `${value.option1 || ''}│${value.option2 || ''}`;
      return node;
    }
    
    static value(node) {
      return {
        option1: node.getAttribute('data-option1') || '',
        option2: node.getAttribute('data-option2') || '',
      };
    }
    
    static formats(node) {
      return {
        option1: node.getAttribute('data-option1') || '',
        option2: node.getAttribute('data-option2') || '',
      };
    }
  };
  
  SelectorBlot.blotName = 'selector';
  SelectorBlot.tagName = 'span';
  SelectorBlot.className = 'selector-highlight';
  
  // Enregistrer les blots
  QuillClass.register(TagBlot);
  QuillClass.register(SelectorBlot);
  
  return { TagBlot, SelectorBlot };
}

// Fonction pour convertir le texte avec marqueurs en Delta Quill
function textToQuillDelta(text, QuillClass) {
  const REGEX_TAG = /\*([^*\n]+)\*/g;
  const REGEX_SELECTOR = /#([^#\n]+):\s*([^#\n]+)#/g;
  
  const ops = [];
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
    });
  }
  
  // Trier par position
  matches.sort((a, b) => a.start - b.start);
  
  // Construire les ops
  for (const m of matches) {
    // Texte avant
    if (m.start > lastIndex) {
      const textBefore = text.substring(lastIndex, m.start);
      if (textBefore) {
        // Gérer les retours à la ligne
        const lines = textBefore.split('\n');
        lines.forEach((line, i) => {
          if (i > 0) ops.push({ insert: '\n' });
          if (line) ops.push({ insert: line });
        });
      }
    }
    
    // Le match
    if (m.type === 'tag') {
      ops.push({ insert: m.content, attributes: { tag: { content: m.content } } });
    } else {
      ops.push({ 
        insert: `${m.option1}│${m.option2}`, 
        attributes: { 
          selector: { 
            option1: m.option1, 
            option2: m.option2 
          } 
        } 
      });
    }
    
    lastIndex = m.end;
  }
  
  // Texte restant
  if (lastIndex < text.length) {
    const textAfter = text.substring(lastIndex);
    const lines = textAfter.split('\n');
    lines.forEach((line, i) => {
      if (i > 0) ops.push({ insert: '\n' });
      if (line) ops.push({ insert: line });
    });
  }
  
  return { ops };
}

// Fonction pour obtenir le texte avec marqueurs depuis le DOM Quill
function getTextFromQuillDOM(quill) {
  const root = quill.root;
  let text = '';
  
  function traverse(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      text += node.textContent;
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      if (node.classList.contains('tag-highlight')) {
        const content = node.getAttribute('data-content') || node.textContent;
        text += `*${content}*`;
      } else if (node.classList.contains('selector-highlight')) {
        const opt1 = node.getAttribute('data-option1') || '';
        const opt2 = node.getAttribute('data-option2') || '';
        text += `#${opt1}:${opt2}#`;
      } else {
        Array.from(node.childNodes).forEach(traverse);
      }
      
      // Gérer les retours à la ligne
      if (node.tagName === 'P' || node.tagName === 'BR') {
        if (node.tagName === 'BR' || (node.tagName === 'P' && node !== root.firstChild)) {
          text += '\n';
        }
      }
    }
  }
  
  Array.from(root.childNodes).forEach(traverse);
  return text;
}

// Créer un éditeur Quill
export async function createQuillEditor(element, initialText, onChange) {
  // Attendre que Quill soit chargé
  const Quill = await waitForQuill();
  
  // Enregistrer les blots
  registerBlots(Quill);
  
  // Créer le conteneur Quill
  const container = document.createElement('div');
  container.style.cssText = 'height: 100%;';
  element.appendChild(container);
  
  // Initialiser Quill
  const quill = new Quill(container, {
    theme: 'snow',
    modules: {
      toolbar: false, // Pas de toolbar
    },
    placeholder: '',
  });
  
  // Convertir le texte initial en Delta
  const initialDelta = textToQuillDelta(initialText || '', Quill);
  quill.setContents(initialDelta);
  
  // Styles personnalisés
  const style = document.createElement('style');
  style.id = 'quill-editor-styles';
  style.textContent = `
    .ql-container {
      font-size: 15px;
      font-family: 'Space Grotesk', 'Segoe UI', system-ui, sans-serif;
      color: var(--text);
      background: transparent;
      border: none;
    }
    .ql-editor {
      padding: 12px;
      min-height: 100%;
      line-height: 1.6;
    }
    .ql-editor.ql-blank::before {
      color: var(--muted);
      font-style: normal;
    }
    .ql-editor:focus {
      outline: none;
    }
    .tag-highlight {
      background: rgba(255, 107, 107, 0.18) !important;
      border: 1px solid rgba(255, 107, 107, 0.3) !important;
      border-radius: 4px;
      padding: 0px 1px;
      color: #ff6b6b !important;
      font-weight: 500;
      cursor: pointer;
    }
    .selector-highlight {
      background: rgba(74, 222, 128, 0.18) !important;
      border: 1px solid rgba(74, 222, 128, 0.3) !important;
      border-radius: 4px;
      padding: 0px 1px;
      color: #4ade80 !important;
      font-weight: 500;
      cursor: pointer;
    }
    .ql-snow .ql-stroke {
      stroke: var(--text);
    }
  `;
  if (!document.getElementById('quill-editor-styles')) {
    document.head.appendChild(style);
  }
  
  // Écouter les changements
  quill.on('text-change', () => {
    const text = getTextFromQuillDOM(quill);
    if (onChange) onChange(text);
  });
  
  // Gérer le clic sur les selectors
  quill.root.addEventListener('click', (e) => {
    const target = e.target;
    if (target.classList.contains('selector-highlight')) {
      const opt1 = target.getAttribute('data-option1');
      const opt2 = target.getAttribute('data-option2');
      
      // Pour l'instant, remplacer par option1
      // Vous pouvez ajouter un menu de sélection ici
      const range = quill.getSelection(true);
      if (range) {
        quill.deleteText(range.index, range.length);
        quill.insertText(range.index, opt1);
        quill.setSelection(range.index + opt1.length);
      }
    }
  });
  
  // Gérer la copie avec couleur noire
  quill.root.addEventListener('copy', (e) => {
    const selection = quill.getSelection();
    if (selection && selection.length > 0) {
      const text = quill.getText(selection.index, selection.length);
      e.clipboardData.setData('text/plain', text);
      const html = `<span style="color: #000000;">${text.replace(/\n/g, '<br>')}</span>`;
      e.clipboardData.setData('text/html', html);
      e.preventDefault();
    }
  });
  
  return {
    editor: quill,
    getValue: () => getTextFromQuillDOM(quill),
    setValue: (text) => {
      const delta = textToQuillDelta(text, Quill);
      quill.setContents(delta);
    },
    focus: () => quill.focus(),
    setCursor: (pos) => {
      quill.setSelection(pos);
      quill.focus();
    },
    getCursor: () => {
      const selection = quill.getSelection();
      return selection ? selection.index : 0;
    },
    destroy: () => {
      quill.off('text-change');
      style.remove();
      container.remove();
    },
  };
}
