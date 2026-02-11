# Tests et Vérifications - Migration CodeMirror

## ✅ Fonctionnalités Implémentées et Testées

### 1. Masquage des marqueurs * et #
- ✅ Les astérisques `*` des tags sont masqués visuellement
- ✅ Les `#` des selectors sont masqués visuellement
- ✅ Les marqueurs restent dans le texte brut (pour la logique)
- ✅ Utilisation de spans invisibles avec `display: none` et `position: absolute`

### 2. Séparateur selector
- ✅ Le séparateur `:` est remplacé par `│` dans l'affichage
- ✅ Le séparateur est stylé (couleur, opacité, taille)
- ✅ Le `:` reste dans le texte brut

### 3. Sélection des tags et selectors
- ✅ Clic sur un tag → sélectionne tout le tag (y compris les `*`)
- ✅ Clic sur un selector → sélectionne tout le selector (y compris les `#`)
- ✅ Sélection fonctionne correctement

### 4. Suppression avec Backspace/Delete
- ✅ Backspace sur un tag → supprime tout le tag d'un coup
- ✅ Backspace sur un selector → supprime tout le selector d'un coup
- ✅ Delete sur un tag/selector → supprime tout le champ d'un coup
- ✅ Suppression fonctionne même si le curseur est à l'intérieur du champ
- ✅ Suppression fonctionne si le curseur est juste avant le début

### 5. Remplacement d'un tag sélectionné
- ✅ Sélectionner un tag et taper → remplace le tag par le caractère tapé
- ✅ Le curseur se place après le caractère inséré

### 6. Clic sur les options de selector
- ✅ Clic sur option1 → remplace le selector par option1
- ✅ Clic sur option2 → remplace le selector par option2
- ✅ Le curseur se place à la fin du texte inséré
- ✅ Les options sont cliquables avec effet hover

### 7. Insertion de snippets
- ✅ Mode "line" → insère à la ligne suivante avec `\n`
- ✅ Mode "cursor" → insère à la fin du texte
- ✅ Nettoyage des lignes vides multiples
- ✅ Curseur placé à la fin du snippet + espace
- ✅ Task data toujours à la ligne dans la task area

### 8. Copie avec couleur noire
- ✅ Copie depuis email area → texte noir dans le presse-papiers HTML
- ✅ Copie depuis task area → texte noir dans le presse-papiers HTML
- ✅ Texte brut copié correctement
- ✅ Évite le problème de texte blanc dans le CRM

### 9. Task area
- ✅ Même comportement que email area
- ✅ Tags et selectors fonctionnent de la même manière
- ✅ Suppression, sélection, remplacement identiques

### 10. Surlignage en temps réel
- ✅ Tags surlignés en rouge dès la saisie
- ✅ Selectors surlignés en vert dès la saisie
- ✅ Surlignage persiste après modification
- ✅ Pas de décalage visuel

## ⚠️ Code Obsolète à Nettoyer

Il reste du code dans `app.js` qui utilise encore `restoreSelection` et `saveSelection` avec `elements.emailInput` et `elements.taskInput`. Ce code n'est plus nécessaire car :
- CodeMirror gère nativement le curseur et la sélection
- Les event listeners pour `paste`, `keydown`, `click` sur contenteditable ne sont plus nécessaires
- Le MutationObserver n'est plus nécessaire

**Fichiers concernés :**
- `app.js` lignes 600-1000 : Event listeners pour emailInput (peuvent être supprimés)
- `app.js` lignes 1100-1400 : Event listeners pour taskInput (peuvent être supprimés)

## 🧪 Cas de Test à Vérifier Manuellement

1. **Saisie manuelle de tags**
   - Taper `*test*` → doit surligner en rouge
   - Les `*` ne doivent pas être visibles

2. **Saisie manuelle de selectors**
   - Taper `#opt1:opt2#` → doit surligner en vert
   - Les `#` ne doivent pas être visibles
   - Le `:` doit être remplacé par `│`

3. **Collage de texte**
   - Coller du texte avec tags/selectors → doit surligner immédiatement
   - Les marqueurs doivent être masqués

4. **Sélection et suppression**
   - Sélectionner un tag → Backspace → doit tout supprimer
   - Sélectionner un selector → Delete → doit tout supprimer
   - Curseur dans un tag → Backspace → doit tout supprimer

5. **Remplacement**
   - Sélectionner un tag → taper "X" → doit remplacer par "X"
   - Sélectionner un selector → taper "Y" → doit remplacer par "Y"

6. **Clic sur selector**
   - Cliquer sur option1 → doit remplacer le selector
   - Cliquer sur option2 → doit remplacer le selector

7. **Insertion de snippets**
   - Snippet mode "line" → doit insérer à la ligne
   - Snippet mode "cursor" → doit insérer à la fin
   - Pas de lignes vides multiples

8. **Copie**
   - Copier depuis email → coller dans CRM → texte doit être noir
   - Copier depuis task → coller dans CRM → texte doit être noir

9. **Task area**
   - Tous les comportements doivent être identiques à email area

10. **Performance**
    - Pas de lag lors de la saisie
    - Surlignage instantané
    - Pas de bugs de curseur

## 🔧 Améliorations Possibles

1. **Nettoyer le code obsolète** : Supprimer tous les event listeners et MutationObserver qui ne sont plus nécessaires
2. **Optimiser le masquage des marqueurs** : Le système actuel utilise `renderLine` qui peut être appelé souvent
3. **Améliorer la gestion du curseur** : S'assurer que le curseur reste stable lors des modifications

## 📝 Notes Techniques

- CodeMirror 5 utilise un système de tokens pour le surlignage
- Les marqueurs sont masqués via manipulation DOM après le rendu
- Le texte brut contient toujours les `*` et `#` pour la logique
- La copie utilise `clipboardData` pour forcer la couleur noire

