// Configuration Tiptap pour TypeF@st
// Utilise des nodes personnalisés pour les tags et selectors

import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';

// Extension pour les tags *tag*
const Tag = {
  name: 'tag',
  group: 'inline',
  inline: true,
  atom: true,
  
  addAttributes() {
    return {
      content: {
        default: '',
        parseHTML: element => element.getAttribute('data-content'),
        renderHTML: attributes => {
          return {
            'data-content': attributes.content,
          };
        },
      },
    };
  },
  
  parseHTML() {
    return [
      {
        tag: 'span[data-type="tag"]',
      },
    ];
  },
  
  renderHTML({ HTMLAttributes }) {
    return ['span', { 
      'data-type': 'tag',
      class: 'tag-highlight',
      ...HTMLAttributes 
    }, HTMLAttributes.content];
  },
  
  addKeyboardShortcuts() {
    return {
      Backspace: () => {
        const { state } = this.editor;
        const { selection } = state;
        
        // Si on est dans un tag, le supprimer complètement
        const node = state.doc.nodeAt(selection.from - 1);
        if (node && node.type.name === 'tag') {
          this.editor.commands.deleteRange({
            from: selection.from - node.nodeSize,
            to: selection.from,
          });
          return true;
        }
        return false;
      },
    };
  },
};

// Extension pour les selectors #option1:option2#
const Selector = {
  name: 'selector',
  group: 'inline',
  inline: true,
  atom: true,
  
  addAttributes() {
    return {
      option1: {
        default: '',
        parseHTML: element => element.getAttribute('data-option1'),
        renderHTML: attributes => ({
          'data-option1': attributes.option1,
        }),
      },
      option2: {
        default: '',
        parseHTML: element => element.getAttribute('data-option2'),
        renderHTML: attributes => ({
          'data-option2': attributes.option2,
        }),
      },
    };
  },
  
  parseHTML() {
    return [
      {
        tag: 'span[data-type="selector"]',
      },
    ];
  },
  
  renderHTML({ HTMLAttributes }) {
    return ['span', { 
      'data-type': 'selector',
      class: 'selector-highlight',
      ...HTMLAttributes 
    }, `${HTMLAttributes.option1}│${HTMLAttributes.option2}`];
  },
  
  addKeyboardShortcuts() {
    return {
      Backspace: () => {
        const { state } = this.editor;
        const { selection } = state;
        
        const node = state.doc.nodeAt(selection.from - 1);
        if (node && node.type.name === 'selector') {
          this.editor.commands.deleteRange({
            from: selection.from - node.nodeSize,
            to: selection.from,
          });
          return true;
        }
        return false;
      },
    };
  },
};

// Fonction pour convertir le texte avec tags/selectors en JSON Tiptap
function textToTiptapJSON(text) {
  const REGEX_TAG = /\*([^*\n]+)\*/g;
  const REGEX_SELECTOR = /#([^#\n]+):\s*([^#\n]+)#/g;
  
  const content = [];
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
  
  // Construire le contenu
  let currentParagraph = { type: 'paragraph', content: [] };
  
  for (const m of matches) {
    // Texte avant le match
    if (m.start > lastIndex) {
      const beforeText = text.substring(lastIndex, m.start);
      if (beforeText) {
        currentParagraph.content.push({
          type: 'text',
          text: beforeText,
        });
      }
    }
    
    // Le match lui-même
    if (m.type === 'tag') {
      currentParagraph.content.push({
        type: 'tag',
        attrs: { content: m.content },
      });
    } else if (m.type === 'selector') {
      currentParagraph.content.push({
        type: 'selector',
        attrs: { option1: m.option1, option2: m.option2 },
      });
    }
    
    lastIndex = m.end;
  }
  
  // Texte restant
  if (lastIndex < text.length) {
    const afterText = text.substring(lastIndex);
    if (afterText) {
      currentParagraph.content.push({
        type: 'text',
        text: afterText,
      });
    }
  }
  
  // Gérer les retours à la ligne
  const lines = text.split('\n');
  if (lines.length > 1) {
    content.length = 0;
    lines.forEach((line, index) => {
      if (line.trim() || index === 0) {
        // Re-parser chaque ligne
        const lineMatches = [];
        REGEX_TAG.lastIndex = 0;
        while ((match = REGEX_TAG.exec(line)) !== null) {
          lineMatches.push({
            type: 'tag',
            start: match.index,
            end: match.index + match[0].length,
            content: match[1],
          });
        }
        REGEX_SELECTOR.lastIndex = 0;
        while ((match = REGEX_SELECTOR.exec(line)) !== null) {
          lineMatches.push({
            type: 'selector',
            start: match.index,
            end: match.index + match[0].length,
            option1: match[1],
            option2: match[2].trim(),
          });
        }
        lineMatches.sort((a, b) => a.start - b.start);
        
        const paraContent = [];
        let lineLastIndex = 0;
        lineMatches.forEach(m => {
          if (m.start > lineLastIndex) {
            const before = line.substring(lineLastIndex, m.start);
            if (before) paraContent.push({ type: 'text', text: before });
          }
          if (m.type === 'tag') {
            paraContent.push({ type: 'tag', attrs: { content: m.content } });
          } else {
            paraContent.push({ type: 'selector', attrs: { option1: m.option1, option2: m.option2 } });
          }
          lineLastIndex = m.end;
        });
        if (lineLastIndex < line.length) {
          const after = line.substring(lineLastIndex);
          if (after) paraContent.push({ type: 'text', text: after });
        }
        
        content.push({ type: 'paragraph', content: paraContent.length ? paraContent : [] });
      } else {
        content.push({ type: 'paragraph', content: [] });
      }
    });
  } else {
    if (currentParagraph.content.length > 0) {
      content.push(currentParagraph);
    } else {
      content.push({ type: 'paragraph', content: [] });
    }
  }
  
  return {
    type: 'doc',
    content: content.length ? content : [{ type: 'paragraph', content: [] }],
  };
}

// Fonction pour convertir le JSON Tiptap en texte avec marqueurs
function tiptapJSONToText(json) {
  let text = '';
  
  function processNode(node) {
    if (node.type === 'text') {
      return node.text || '';
    } else if (node.type === 'tag') {
      return `*${node.attrs?.content || ''}*`;
    } else if (node.type === 'selector') {
      return `#${node.attrs?.option1 || ''}:${node.attrs?.option2 || ''}#`;
    } else if (node.content && Array.isArray(node.content)) {
      return node.content.map(processNode).join('');
    }
    return '';
  }
  
  if (json.content && Array.isArray(json.content)) {
    const paragraphs = json.content.map(para => {
      if (para.content && Array.isArray(para.content)) {
        return para.content.map(processNode).join('');
      }
      return '';
    });
    text = paragraphs.join('\n');
  }
  
  return text;
}

// Créer un éditeur Tiptap
export function createTiptapEditor(element, initialText, onChange) {
  // Convertir le texte initial en JSON Tiptap
  const initialJSON = textToTiptapJSON(initialText || '');
  
  const editor = new Editor({
    element,
    extensions: [
      StarterKit.configure({
        // Désactiver certaines fonctionnalités si nécessaire
      }),
      Tag,
      Selector,
    ],
    content: initialJSON,
    onUpdate: ({ editor }) => {
      const json = editor.getJSON();
      const text = tiptapJSONToText(json);
      if (onChange) onChange(text);
    },
    editorProps: {
      attributes: {
        class: 'tiptap-editor',
        spellcheck: 'false',
      },
    },
  });
  
  // Styles pour les highlights
  const style = document.createElement('style');
  style.id = 'tiptap-editor-styles';
  style.textContent = `
    .tiptap-editor {
      padding: 12px;
      font-size: 15px;
      font-family: 'Space Grotesk', 'Segoe UI', system-ui, sans-serif;
      line-height: 1.6;
      color: var(--text);
      background: transparent;
      outline: none;
      min-height: 100%;
    }
    .tiptap-editor p {
      margin: 0;
      padding: 0;
    }
    .tiptap-editor p.is-editor-empty:first-child::before {
      content: attr(data-placeholder);
      float: left;
      color: var(--muted);
      pointer-events: none;
      height: 0;
    }
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
    .ProseMirror-focused {
      outline: none;
    }
    .ProseMirror-selectednode {
      outline: 2px solid var(--accent);
    }
  `;
  if (!document.getElementById('tiptap-editor-styles')) {
    document.head.appendChild(style);
  }
  
  // Gérer le clic sur les selectors pour choisir une option
  editor.view.dom.addEventListener('click', (e) => {
    const target = e.target;
    if (target.classList.contains('selector-highlight')) {
      const option1 = target.getAttribute('data-option1');
      const option2 = target.getAttribute('data-option2');
      
      // Pour l'instant, on remplace par option1 par défaut
      // Vous pouvez ajouter un menu de sélection ici
      const pos = editor.view.posAtDOM(target, 0);
      editor.commands.deleteRange({ from: pos, to: pos + target.textContent.length });
      editor.commands.insertContent(option1);
    }
  });
  
  // Gérer la copie avec couleur noire
  editor.view.dom.addEventListener('copy', (e) => {
    const selection = editor.state.selection;
    const text = editor.state.doc.textBetween(selection.from, selection.to);
    if (text) {
      e.clipboardData.setData('text/plain', text);
      const html = `<span style="color: #000000;">${text.replace(/\n/g, '<br>')}</span>`;
      e.clipboardData.setData('text/html', html);
      e.preventDefault();
    }
  });
  
  return {
    editor,
    getValue: () => {
      const json = editor.getJSON();
      return tiptapJSONToText(json);
    },
    setValue: (text) => {
      const json = textToTiptapJSON(text);
      editor.commands.setContent(json);
    },
    focus: () => editor.commands.focus(),
    setCursor: (pos) => {
      // Tiptap gère les positions différemment, on doit convertir
      const doc = editor.state.doc;
      if (pos <= doc.content.size) {
        editor.commands.setTextSelection(pos);
      }
    },
    getCursor: () => {
      return editor.state.selection.from;
    },
    destroy: () => {
      editor.destroy();
      style.remove();
    },
  };
}

