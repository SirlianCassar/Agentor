# État de la migration vers CodeMirror

## ✅ Fait
1. Structure HTML modifiée (suppression de contenteditable)
2. Module CodeMirror créé (codemirror-setup.js)
3. Fonction init() adaptée pour initialiser CodeMirror
4. Fonctions renderEditorText() et renderTaskEditorText() simplifiées
5. Remplacement de getTextFromContentEditable() par les méthodes CodeMirror

## ⚠️ En cours / À faire
1. **Adapter tous les event listeners** - Beaucoup de code utilise encore contenteditable
   - Supprimer MutationObserver (plus nécessaire avec CodeMirror)
   - Adapter les event listeners (paste, keydown, click)
   - Remplacer restoreSelection/saveSelection par les méthodes CodeMirror

2. **Fonctions à adapter** :
   - `appendToEmail()` - Utilise restoreSelection
   - `setTaskText()` - Utilise restoreSelection  
   - Tous les event listeners dans `bindEvents()`
   - Fonctions de gestion des tags/selectors (click, keydown)

3. **CSS** - Ajuster les styles pour CodeMirror

## Note importante
CodeMirror 6 via ES modules CDN peut avoir des problèmes de compatibilité. 
Une alternative serait d'utiliser CodeMirror 5 (plus stable via CDN) ou d'installer via npm avec un bundler.

## Prochaines étapes recommandées
1. Tester l'application actuelle pour voir quelles erreurs apparaissent
2. Adapter progressivement les fonctions qui utilisent encore contenteditable
3. Supprimer tout le code obsolète (saveSelection, restoreSelection, getTextFromContentEditable, etc.)

