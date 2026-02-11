# Recommandations pour un système de tags/surlignage fiable

## Problèmes actuels avec contenteditable
- Gestion manuelle complexe du DOM
- Calculs de position de curseur fragiles
- Synchronisation texte brut ↔ HTML rendu
- Problèmes de sélection et restauration

## Solutions recommandées (par ordre de préférence)

### 1. **CodeMirror 6** ⭐ RECOMMANDÉ
**Pourquoi :**
- ✅ Gère nativement le surlignage syntaxique
- ✅ Système de décorations pour tags/selectors personnalisés
- ✅ Gestion correcte des positions de curseur
- ✅ Léger (~50KB minifié)
- ✅ Vanilla JS (pas besoin de framework)
- ✅ Extensible et bien documenté
- ✅ Performant même avec beaucoup de texte

**Installation :**
```bash
npm install @codemirror/view @codemirror/state @codemirror/basic-setup
```

**Avantages :**
- Décorations personnalisées pour les tags (rouge) et selectors (vert)
- Mode de surlignage syntaxique personnalisé
- Gestion native du curseur et de la sélection
- Pas de problèmes de synchronisation texte/DOM

**Exemple d'intégration :**
```javascript
import { EditorView, basicSetup } from "codemirror"
import { EditorState } from "@codemirror/state"
import { tags, HighlightStyle } from "@codemirror/highlight"

// Définir les styles pour tags et selectors
const tagHighlight = HighlightStyle.define([
  { tag: tags.keyword, color: "#ff6b6b" }, // Tags en rouge
  { tag: tags.string, color: "#4ade80" }   // Selectors en vert
])

const editor = new EditorView({
  state: EditorState.create({
    extensions: [basicSetup, tagHighlight]
  }),
  parent: document.getElementById("emailInput")
})
```

---

### 2. **Monaco Editor** (Éditeur de VS Code)
**Pourquoi :**
- ✅ Très puissant et robuste
- ✅ Support complet du surlignage syntaxique
- ✅ Gestion parfaite du curseur
- ✅ Utilisé par VS Code (très testé)

**Inconvénients :**
- ❌ Plus lourd (~2MB)
- ❌ Peut être overkill pour votre cas

**Installation :**
```bash
npm install monaco-editor
```

---

### 3. **Quill** (Éditeur riche)
**Pourquoi :**
- ✅ Simple à utiliser
- ✅ Support des formats personnalisés (blots)
- ✅ Gestion correcte du DOM

**Inconvénients :**
- ❌ Moins flexible pour des cas complexes
- ❌ Focus sur l'édition riche plutôt que le surlignage syntaxique

**Installation :**
```bash
npm install quill
```

---

### 4. **Slate.js** (Framework d'éditeur)
**Pourquoi :**
- ✅ Très moderne et extensible
- ✅ Architecture basée sur React
- ✅ Contrôle total sur le rendu

**Inconvénients :**
- ❌ Nécessite React
- ❌ Courbe d'apprentissage plus élevée

---

### 5. **ProseMirror**
**Pourquoi :**
- ✅ Très puissant
- ✅ Architecture modulaire
- ✅ Utilisé par de grandes applications

**Inconvénients :**
- ❌ Courbe d'apprentissage élevée
- ❌ Plus complexe à configurer

---

## Ma recommandation : CodeMirror 6

**Pour votre cas d'usage, CodeMirror 6 est le meilleur choix car :**

1. **Vanilla JS** - Pas besoin de changer votre stack actuelle
2. **Léger** - ~50KB vs plusieurs centaines de KB pour les autres
3. **Décorations personnalisées** - Parfait pour vos tags `*tag*` et selectors `#option1:option2#`
4. **Gestion native du curseur** - Plus de problèmes de position
5. **Performance** - Optimisé pour de grandes quantités de texte
6. **Communauté active** - Bien maintenu et documenté

## Migration vers CodeMirror 6

### Étape 1 : Installation
```bash
npm install @codemirror/view @codemirror/state @codemirror/basic-setup @codemirror/lang-text
```

### Étape 2 : Créer un mode de surlignage personnalisé
```javascript
import { StreamLanguage } from '@codemirror/language'
import { tags, HighlightStyle } from '@codemirror/highlight'

// Définir les tokens pour tags et selectors
const tagStyle = HighlightStyle.define([
  { tag: tags.keyword, class: 'cm-tag' },      // Tags *tag*
  { tag: tags.string, class: 'cm-selector' }   // Selectors #opt1:opt2#
])
```

### Étape 3 : Créer des décorations pour le surlignage
```javascript
import { Decoration, ViewPlugin, ViewUpdate } from '@codemirror/view'

const tagDecorations = ViewPlugin.fromClass(class {
  decorations = Decoration.none

  update(update) {
    // Parser le texte pour trouver les tags et selectors
    // Créer des décorations pour chaque occurrence
    this.decorations = this.buildDecorations(update.state.doc)
  }

  buildDecorations(doc) {
    const decorations = []
    const text = doc.toString()
    
    // Trouver tous les tags *tag*
    const tagRegex = /\*([^*]+)\*/g
    let match
    while ((match = tagRegex.exec(text)) !== null) {
      decorations.push(
        Decoration.mark({
          class: 'cm-tag-highlight',
          attributes: { style: 'background: rgba(255, 107, 107, 0.18); border: 1px solid rgba(255, 107, 107, 0.3);' }
        }).range(match.index, match.index + match[0].length)
      )
    }
    
    // Faire de même pour les selectors
    // ...
    
    return Decoration.set(decorations)
  }
})
```

### Étape 4 : Intégrer dans votre app
```javascript
import { EditorView, basicSetup } from "codemirror"
import { EditorState } from "@codemirror/state"

const editor = new EditorView({
  state: EditorState.create({
    doc: state.emailText,
    extensions: [
      basicSetup,
      tagDecorations,
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          state.emailText = update.state.doc.toString()
          persistState()
        }
      })
    ]
  }),
  parent: elements.emailInput
})
```

## Avantages de la migration

1. **Plus de bugs de sélection** - CodeMirror gère tout nativement
2. **Performance** - Optimisé pour de grandes quantités de texte
3. **Maintenabilité** - Code plus simple et plus propre
4. **Extensibilité** - Facile d'ajouter de nouvelles fonctionnalités
5. **Fiabilité** - Utilisé par de nombreuses applications en production

## Alternative : CSS Custom Highlight API (expérimental)

Si vous voulez rester avec contenteditable, vous pourriez utiliser la **CSS Custom Highlight API** (Chrome/Edge uniquement pour l'instant) :

```javascript
// Définir les ranges à surligner
const highlight = new Highlight(
  new Range(...) // Pour chaque tag
)

CSS.highlights.set('tags', highlight)
```

Mais cette API est encore expérimentale et n'est pas supportée partout.

---

## Conclusion

**Je recommande fortement CodeMirror 6** pour votre cas. C'est la solution la plus robuste, légère et adaptée à vos besoins de surlignage de tags et selectors.

Souhaitez-vous que je vous aide à migrer vers CodeMirror 6 ?

