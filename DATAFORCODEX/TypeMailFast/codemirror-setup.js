// Configuration CodeMirror 5 pour TypeF@st
// Système de surlignage personnalisé pour tags et selectors

// CodeMirror 5 est chargé globalement via CDN
const CodeMirror = window.CodeMirror;

// Mode personnalisé pour surligner les tags et selectors
// Utilise un overlay mode pour surligner sans masquer les marqueurs (masquage via CSS)
CodeMirror.defineMode("typefast", function(config) {
  // Mode de base (texte)
  const baseMode = CodeMirror.getMode(config, "text");
  
  // Overlay mode pour surligner les tags et selectors
  const overlay = {
    token: function(stream, state) {
      // Tags *tag* - surligner tout le tag y compris les *
      if (stream.match(/^\*([^*\n]+)\*/)) {
        return "tag";
      }
      // Selectors #option1:option2# ou #option1│option2# - surligner tout le selector
      if (stream.match(/^#([^#\n]+)([:│])([^#\n]+)#/)) {
        return "selector";
      }
      // Avancer d'un caractère
      stream.next();
      return null;
    }
  };
  
  return CodeMirror.overlayMode(baseMode, overlay);
});

// Extension pour créer un éditeur CodeMirror
export function createCodeMirrorEditor(element, initialText, onChange) {
  const editor = CodeMirror(element, {
    value: initialText || "",
    mode: "typefast",
    lineNumbers: false,
    lineWrapping: true,
    theme: "", // Pas de thème par défaut, on utilise notre CSS personnalisé
    autofocus: false,
    spellcheck: false,
    extraKeys: {
      // Désactiver certaines touches par défaut si nécessaire
    }
  });

  // Masquage des marqueurs désactivé pour éviter les problèmes de sélection et de curseur
  // Les marqueurs * et # restent visibles dans l'éditeur

  // Écouter les changements
  editor.on("change", function(cm) {
    if (onChange) {
      onChange(cm.getValue());
    }
  });

  // Gérer la sélection des tags et selectors au clic
  editor.on("mousedown", function(cm, e) {
    // Vérifier si on clique sur une option de selector
    const target = e.target;
    if (target && target.classList.contains('cm-selector-option')) {
      e.preventDefault();
      e.stopPropagation();
      
      // Trouver le selector parent
      const selectorElement = target.closest('.cm-selector');
      if (selectorElement) {
        const text = cm.getValue();
        const clickedText = target.textContent;
        
        // Trouver le selector dans le texte
        const selectorRegex = /#([^#\n]+)[:│]([^#\n]+)#/g;
        let match;
        while ((match = selectorRegex.exec(text)) !== null) {
          const option1 = match[1];
          const option2 = match[2].trim();
          
          // Vérifier si l'option cliquée correspond
          if (clickedText === option1 || clickedText === option2) {
            const selectorStart = match.index;
            const selectorEnd = selectorStart + match[0].length;
            
            // Remplacer le selector par l'option sélectionnée
            const startPos = cm.posFromIndex(selectorStart);
            const endPos = cm.posFromIndex(selectorEnd);
            cm.replaceRange(clickedText, startPos, endPos);
            
            // Placer le curseur à la fin
            const newPos = cm.posFromIndex(selectorStart + clickedText.length);
            cm.setCursor(newPos);
            if (onChange) onChange(cm.getValue());
            return;
          }
        }
      }
    }
    
    // Utiliser setTimeout pour laisser CodeMirror gérer le clic d'abord
    setTimeout(() => {
      const pos = cm.coordsChar({left: e.clientX, top: e.clientY});
      const index = cm.indexFromPos(pos);
      const text = cm.getValue();
      
      // Trouver si on clique sur un tag *tag*
      const tagRegex = /\*([^*\n]+)\*/g;
      let match;
      while ((match = tagRegex.exec(text)) !== null) {
        const tagStart = match.index;
        const tagEnd = tagStart + match[0].length;
        
        // Vérifier si le clic est dans le tag (avec une marge pour les marqueurs masqués)
        if (index >= tagStart && index <= tagEnd) {
          // Sélectionner tout le tag
          const startPos = cm.posFromIndex(tagStart);
          const endPos = cm.posFromIndex(tagEnd);
          cm.setSelection(startPos, endPos);
          return;
        }
      }
      
      // Trouver si on clique sur un selector #option1:option2# ou #option1│option2#
      const selectorRegex = /#([^#\n]+)[:│]([^#\n]+)#/g;
      while ((match = selectorRegex.exec(text)) !== null) {
        const selectorStart = match.index;
        const selectorEnd = selectorStart + match[0].length;
        
        if (index >= selectorStart && index <= selectorEnd) {
          // Sélectionner tout le selector
          const startPos = cm.posFromIndex(selectorStart);
          const endPos = cm.posFromIndex(selectorEnd);
          cm.setSelection(startPos, endPos);
          return;
        }
      }
    }, 10);
  });

  // Gérer le remplacement d'un tag sélectionné quand on tape
  editor.on("keydown", function(cm, e) {
    // Si on tape un caractère et qu'un tag est sélectionné, le remplacer
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const selection = cm.getSelection();
      const text = cm.getValue();
      const startIndex = cm.indexFromPos(cm.getCursor(true));
      const endIndex = cm.indexFromPos(cm.getCursor(false));
      
      if (selection && selection.length > 0) {
        const selectedText = text.substring(startIndex, endIndex);
        const tagMatch = /^\*([^*\n]+)\*$/.exec(selectedText);
        
        if (tagMatch) {
          e.preventDefault();
          // Remplacer le tag par le caractère tapé
          const startPos = cm.posFromIndex(startIndex);
          const endPos = cm.posFromIndex(endIndex);
          cm.replaceRange(e.key, startPos, endPos);
          // Placer le curseur après le caractère
          const newPos = cm.posFromIndex(startIndex + 1);
          cm.setCursor(newPos);
          if (onChange) onChange(cm.getValue());
          return;
        }
      }
    }
    
    if (e.key !== 'Backspace' && e.key !== 'Delete') return;
    
    const text = cm.getValue();
    const cursor = cm.getCursor();
    const index = cm.indexFromPos(cursor);
    const selection = cm.getSelection();
    
    // Si une sélection est active, vérifier si c'est un tag ou selector complet
    if (selection && selection.length > 0) {
      const startIndex = cm.indexFromPos(cm.getCursor(true));
      const endIndex = cm.indexFromPos(cm.getCursor(false));
      
      // Vérifier si la sélection correspond exactement à un tag
      const selectedText = text.substring(startIndex, endIndex);
      const tagMatch = /^\*([^*\n]+)\*$/.exec(selectedText);
      if (tagMatch) {
        e.preventDefault();
        cm.replaceSelection('');
        if (onChange) onChange(cm.getValue());
        return;
      }
      
      // Vérifier si la sélection correspond exactement à un selector
      const selectorMatch = /^#([^#\n]+)[:│]([^#\n]+)#$/.exec(selectedText);
      if (selectorMatch) {
        e.preventDefault();
        cm.replaceSelection('');
        if (onChange) onChange(cm.getValue());
        return;
      }
    }
    
    // Si pas de sélection, vérifier si on est dans ou juste avant un tag/selector
    if (e.key === 'Backspace' && index > 0) {
      // Vérifier si on est au début d'un selector
      const selectorRegex = /#([^#\n]+)[:│]([^#\n]+)#/g;
      let match;
      while ((match = selectorRegex.exec(text)) !== null) {
        const selectorStart = match.index;
        const selectorEnd = selectorStart + match[0].length;
        
        // Si le curseur est exactement au début ou juste avant le début (ou à l'intérieur)
        if (index >= selectorStart && index <= selectorEnd) {
          e.preventDefault();
          e.stopPropagation();
          const startPos = cm.posFromIndex(selectorStart);
          const endPos = cm.posFromIndex(selectorEnd);
          cm.replaceRange('', startPos, endPos);
          // Utiliser requestAnimationFrame pour éviter les conflits de rendu
          requestAnimationFrame(() => {
            cm.setCursor(startPos);
            if (onChange) onChange(cm.getValue());
          });
          return false;
        }
      }
      
      // Vérifier si on est au début d'un tag
      const tagRegex = /\*([^*\n]+)\*/g;
      while ((match = tagRegex.exec(text)) !== null) {
        const tagStart = match.index;
        const tagEnd = tagStart + match[0].length;
        
        // Si le curseur est exactement au début ou juste avant le début (ou à l'intérieur)
        if (index >= tagStart && index <= tagEnd) {
          e.preventDefault();
          e.stopPropagation();
          const startPos = cm.posFromIndex(tagStart);
          const endPos = cm.posFromIndex(tagEnd);
          cm.replaceRange('', startPos, endPos);
          // Utiliser requestAnimationFrame pour éviter les conflits de rendu
          requestAnimationFrame(() => {
            cm.setCursor(startPos);
            if (onChange) onChange(cm.getValue());
          });
          return false;
        }
      }
    }
    
    // Pour Delete, même logique mais en vérifiant la position suivante
    if (e.key === 'Delete' && index < text.length) {
      const selectorRegex = /#([^#\n]+)[:│]([^#\n]+)#/g;
      let match;
      while ((match = selectorRegex.exec(text)) !== null) {
        const selectorStart = match.index;
        const selectorEnd = selectorStart + match[0].length;
        
        if (index >= selectorStart && index < selectorEnd) {
          e.preventDefault();
          const startPos = cm.posFromIndex(selectorStart);
          const endPos = cm.posFromIndex(selectorEnd);
          cm.replaceRange('', startPos, endPos);
          cm.setCursor(startPos);
          if (onChange) onChange(cm.getValue());
          return;
        }
      }
      
      const tagRegex = /\*([^*\n]+)\*/g;
      while ((match = tagRegex.exec(text)) !== null) {
        const tagStart = match.index;
        const tagEnd = tagStart + match[0].length;
        
        if (index >= tagStart && index < tagEnd) {
          e.preventDefault();
          const startPos = cm.posFromIndex(tagStart);
          const endPos = cm.posFromIndex(tagEnd);
          cm.replaceRange('', startPos, endPos);
          cm.setCursor(startPos);
          if (onChange) onChange(cm.getValue());
          return;
        }
      }
    }
  });

  // Styles personnalisés pour les tags et selectors
  // Vérifier si le style existe déjà pour éviter les doublons
  let style = document.getElementById('codemirror-typefast-style');
  if (!style) {
    style = document.createElement('style');
    style.id = 'codemirror-typefast-style';
    style.textContent = `
      .CodeMirror {
        height: 100%;
        font-size: 15px;
        font-family: 'Space Grotesk', 'Segoe UI', system-ui, sans-serif;
        background: transparent !important;
        color: var(--text) !important;
      }
      .CodeMirror-scroll {
        min-height: 100%;
      }
      .CodeMirror-lines {
        padding: 12px;
        color: var(--text) !important;
      }
      .CodeMirror-line {
        color: var(--text) !important;
      }
      .CodeMirror-cursor {
        border-left: 2px solid var(--accent) !important;
      }
      .CodeMirror-focused {
        outline: none;
      }
      .CodeMirror .cm-tag {
        background: rgba(255, 107, 107, 0.18) !important;
        border: 1px solid rgba(255, 107, 107, 0.3) !important;
        border-radius: 4px;
        padding: 0px 1px;
        color: #ff6b6b !important;
        font-weight: 500;
        position: relative;
      }
      /* Masquer les * dans les tags en utilisant une technique qui préserve la sélection */
      /* On utilise une approche avec des spans invisibles créés dynamiquement */
      .CodeMirror .cm-tag {
        /* Le texte contient *text*, on va le masquer via JavaScript mais de manière plus stable */
      }
      .CodeMirror .cm-selector {
        background: rgba(74, 222, 128, 0.18) !important;
        border: 1px solid rgba(74, 222, 128, 0.3) !important;
        border-radius: 4px;
        padding: 0px 1px;
        color: #4ade80 !important;
        font-weight: 500;
        position: relative;
      }
      /* Masquer les # dans les selectors */
      .CodeMirror .cm-selector-marker {
        display: none !important;
        width: 0 !important;
        height: 0 !important;
        overflow: hidden !important;
        position: absolute !important;
        left: -9999px !important;
      }
      /* Remplacer : par │ dans les selectors */
      .CodeMirror .cm-selector-separator {
        color: rgba(74, 222, 128, 0.6) !important;
        font-weight: 300;
        margin: 0 4px;
      }
      .CodeMirror .cm-selector-option {
        cursor: pointer;
        padding: 2px 4px;
        margin: 0 1px;
        border-radius: 3px;
        transition: background 0.15s ease;
      }
      .CodeMirror .cm-selector-option:hover {
        background: rgba(74, 222, 128, 0.3) !important;
      }
      .CodeMirror-selected {
        background: rgba(139, 111, 201, 0.3) !important;
      }
    `;
    document.head.appendChild(style);
  }

  // Gérer la copie avec couleur noire
  const wrapper = editor.getWrapperElement();
  wrapper.addEventListener('copy', function(e) {
    const selection = editor.getSelection();
    if (selection) {
      // Copier le texte brut avec couleur noire dans le HTML
      e.clipboardData.setData('text/plain', selection);
      const html = `<span style="color: #000000;">${selection.replace(/\n/g, '<br>')}</span>`;
      e.clipboardData.setData('text/html', html);
      e.preventDefault();
    }
  });

  return {
    editor,
    getValue: () => editor.getValue(),
    setValue: (text) => {
      const cursor = editor.getCursor();
      editor.setValue(text);
      editor.setCursor(cursor);
    },
    focus: () => editor.focus(),
    setCursor: (pos) => {
      const posObj = editor.posFromIndex(pos);
      editor.setCursor(posObj);
      editor.focus();
    },
    getCursor: () => {
      const cursor = editor.getCursor();
      return editor.indexFromPos(cursor);
    },
    destroy: () => {
      editor.toTextArea();
      style.remove();
    }
  };
}
