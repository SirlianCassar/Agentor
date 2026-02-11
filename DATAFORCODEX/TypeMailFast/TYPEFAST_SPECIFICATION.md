# TypeF@st - Spécification Fonctionnelle et Design

## Vue d'ensemble

TypeF@st est une application locale pour rédiger rapidement des emails professionnels. L'application permet de composer des emails en utilisant des templates pré-configurés (snippets) et des champs dynamiques qui doivent être remplis avant l'envoi.

**Caractéristiques principales :**
- Application locale (fonctionne hors ligne)
- Sauvegarde automatique de toutes les données
- Interface moderne avec thème sombre
- Système de tags et selectors pour les champs dynamiques

---

## Design et Style

### Palette de couleurs

**Fonds :**
- Fond principal : Noir très foncé (#15151a)
- Fond secondaire : Gris très foncé (#1d1d24)
- Panneaux : Gris foncé semi-transparent

**Texte :**
- Texte principal : Blanc cassé (#f5f5f7)
- Texte secondaire : Gris clair (#d1d1d6)
- Texte atténué : Gris moyen (#8e8e93)

**Accents :**
- Couleur principale : Violet (#8b6fc9)
- Tags (champs dynamiques) : Rouge (#ff6b6b)
- Selectors (choix) : Vert (#4ade80)
- Succès : Vert clair (#51cf66)
- Danger/Erreur : Rouge (#ff6b6b)

**Couleurs de catégories (10 couleurs disponibles) :**
Rouge, Orange, Jaune, Jaune-vert, Vert clair, Cyan, Bleu clair, Bleu, Violet, Magenta

### Typographie

- **Police principale** : Space Grotesk (Google Fonts)
- **Style** : Moderne, lisible, arrondi
- **Tailles** :
  - Titres principaux : 18-24px
  - Texte éditable : 15px
  - Labels et petits textes : 13-14px
- **Espacement** : Line-height de 1.6 pour le texte éditable

### Style général

**Thème :**
- Design sombre moderne
- Ombres subtiles pour la profondeur
- Bordures fines et discrètes
- Transitions fluides sur les interactions

**Composants :**
- Boutons avec effets de survol (glow, changement de couleur)
- Inputs avec bordures subtiles, accentuation au focus
- Modals avec backdrop sombre semi-transparent
- Tooltips positionnés dynamiquement
- Notifications (toasts) en bas à droite

**Scrollbars :**
- Fines et discrètes
- Couleur accent au survol
- Style moderne arrondi

---

## Layout et Structure

### Organisation en 3 colonnes

**Colonne gauche (Sidebar) :**
- Logo et informations de version
- Bouton "Édition" pour gérer les templates
- Bouton "Aide" pour le tutoriel
- Menu déroulant de sélection de catégories
- Liste des snippets de la catégorie sélectionnée

**Colonne centrale (Workspace) :**
- Header avec titre "Compose Email"
- Barre de recherche de templates complets
- Icônes de liens rapides (SharePoint, CRM, etc.)
- Sélecteur de langue (FR/EN)
- Bouton mode ZEN
- Indicateur de tags restants
- Boutons d'action (Copy Email, Clear)
- Zone d'édition d'email principale

**Colonne droite (Sidebar) :**
- Panneau de notes personnelles
- Barre de recherche de templates de tâches
- Zone d'édition de tâches
- Indicateur de tags restants dans les tâches
- Boutons d'action (Copy Task, Clear)

---

## Fonctionnalités Principales

### 1. Gestion des Catégories

**Création :**
- Nom de la catégorie
- Choix d'une couleur parmi 10 couleurs prédéfinies
- Sauvegarde automatique

**Gestion :**
- Liste de toutes les catégories
- Réorganisation par glisser-déposer
- Modification (nom, couleur)
- Suppression avec confirmation

**Affichage :**
- Les catégories apparaissent dans un menu déroulant
- Option "Toutes les catégories" pour voir tous les snippets
- Chaque catégorie affiche sa couleur

### 2. Gestion des Snippets (Bullets)

**Création :**
- Titre du snippet
- Contenu du snippet (peut contenir des tags et selectors)
- Mode d'insertion :
  - "À la ligne" : Insère sur une nouvelle ligne
  - "Au curseur" : Insère à la suite du texte existant
- Texte de tâche associé (optionnel)
- Option pour rendre la tâche optionnelle
- Sélection de la catégorie parente

**Gestion :**
- Liste de tous les snippets
- Réorganisation par glisser-déposer
- Modification
- Suppression avec confirmation

**Utilisation :**
- Les snippets apparaissent dans la liste de gauche selon la catégorie sélectionnée
- Aperçu au survol (tooltip)
- Clic pour insérer dans l'email
- Si le snippet a une tâche associée, elle est aussi insérée dans l'éditeur de tâches

### 3. Gestion des Chargers (Templates complets)

**Création :**
- Nom du template
- Contenu complet (peut contenir des tags et selectors)
- Sélection de langue (Français ou Anglais)
- Template de tâche associé (optionnel)
- Option pour rendre la tâche optionnelle

**Gestion :**
- Liste de tous les chargers
- Réorganisation par glisser-déposer
- Modification
- Suppression avec confirmation

**Utilisation :**
- Recherche par nom dans la barre de recherche du header
- Filtrage par langue avec les boutons FR/EN
- Résultats affichés dans un menu déroulant
- Clic sur un résultat remplace tout le contenu de l'email
- Si un template de tâche est associé, il est aussi inséré

### 4. Gestion des Templates de Tâches

**Création :**
- Nom du template
- Contenu (peut contenir des tags et selectors)

**Gestion :**
- Liste de tous les templates
- Réorganisation par glisser-déposer
- Modification
- Suppression avec confirmation

**Utilisation :**
- Recherche par nom dans la barre de recherche du Task Builder
- Résultats affichés dans un menu déroulant
- Clic sur un résultat insère dans l'éditeur de tâches (nouvelle ligne)

### 5. Éditeur d'Email

**Fonctionnalités :**
- Zone de texte éditable
- Surlignage automatique des tags (rouge) et selectors (vert)
- Les marqueurs `*` et `#` restent visibles
- Indicateur visuel (⚠️) si des tags restent à remplir

**Comportements :**
- Clic sur un tag ou selector → Sélection complète
- Backspace/Delete dans un tag ou selector → Suppression complète
- Clic sur une option d'un selector → Remplace le selector par l'option choisie
- Copie du texte avec couleur noire (pour coller dans les CRM)

### 6. Éditeur de Tâches

**Fonctionnalités :**
- Zone de texte éditable (même système que l'email)
- Surlignage automatique des tags et selectors
- Indicateur visuel (⚠️) si des tags restent à remplir
- Chaque tâche sur une nouvelle ligne

**Comportements :**
- Identiques à l'éditeur d'email
- Copie du texte avec couleur noire

### 7. Système de Tags et Selectors

**Tags (champs dynamiques) :**
- Format : `*nom*` (texte entre astérisques)
- Couleur : Rouge
- Usage : Champ à remplir manuellement
- Affichage : Surligné en rouge, marqueurs `*` visibles
- Comportement :
  - Sélection complète au clic
  - Suppression complète avec Backspace/Delete
  - Indicateur ⚠️ si des tags restent

**Selectors (choix entre options) :**
- Format : `#option1:option2#` (deux options séparées par `:`)
- Couleur : Vert
- Usage : Choix entre deux options
- Affichage : Surligné en vert, `:` remplacé visuellement par `│`, marqueurs `#` visibles
- Comportement :
  - Sélection complète au clic
  - Clic sur une option → Remplace le selector par l'option
  - Suppression complète avec Backspace/Delete

### 8. Actions sur l'Email

**Copy Email :**
- Copie le texte de l'email dans le presse-papier
- Format adapté pour coller dans les CRM (texte noir)
- Notification de confirmation
- Ajout à l'historique

**Clear :**
- Vide l'éditeur d'email
- Confirmation requise (double-clic ou timer)

### 9. Actions sur les Tâches

**Copy Task :**
- Copie le texte des tâches dans le presse-papier
- Format adapté pour coller dans les CRM (texte noir)
- Notification de confirmation

**Clear :**
- Vide l'éditeur de tâches

### 10. Notes Personnelles

**Fonctionnalités :**
- Zone de texte simple dans la sidebar droite
- Sauvegarde automatique
- Bouton pour effacer rapidement
- Persistance entre les sessions

### 11. Export/Import

**Export :**
- Exporte toutes les données (catégories, snippets, templates) en fichier JSON
- Téléchargement automatique

**Import :**
- Charge un fichier JSON
- Fusionne ou remplace les données existantes
- Validation du format

**Export Spreadsheet :**
- Exporte les snippets en format CSV
- Colonnes : Catégorie, Titre, Contenu

**Export Mail History :**
- Exporte l'historique des emails copiés
- Format CSV avec date et heure

### 12. Mode ZEN

**Activation :**
- Bouton ZEN dans le header
- Overlay plein écran qui masque toute l'interface
- Seul l'éditeur d'email reste visible

**Fonctionnalités :**
- 4 produits à "détruire" :
  1. SOLR (rouge, icône cœur)
  2. T598 (jaune, icône éclair)
  3. T818 (orange, icône feu)
  4. SF1000 (bleu, icône sans fil)

**Interface ZEN :**
- Sélecteur de produit en haut
- Compteur de coups au centre
- Grand bouton de frappe avec image du produit
- Effets visuels : particules, animations, chocs

**Mécanique :**
- Chaque produit a une santé qui diminue à chaque coup
- Quand la santé atteint 0, le produit est détruit
- Compteur de destructions par produit
- Bouton "Ça va mieux" pour revenir à l'interface normale

### 13. Quick Links

**Liens disponibles :**
- ShareConseiller (SharePoint)
- Global Action (Excel)
- Portal
- AssistBot (Teams)
- CRM (Dynamics)

**Affichage :**
- Icônes dans le header
- Tooltip au survol avec le nom
- Ouverture dans un nouvel onglet

### 14. Recherche

**Recherche de Chargers :**
- Barre de recherche dans le header
- Recherche en temps réel dans les noms
- Filtrage par langue (FR/EN)
- Résultats dans un menu déroulant
- Clic pour charger le template

**Recherche de Task Templates :**
- Barre de recherche dans le Task Builder
- Recherche en temps réel
- Résultats dans un menu déroulant
- Clic pour insérer le template

### 15. Modal d'Édition

**Onglets :**
- Catégories
- Snippets
- Chargers
- Templates de Tâches

**Fonctionnalités communes :**
- Liste de gestion avec réorganisation par glisser-déposer
- Bouton "Nouveau" pour créer
- Formulaire d'édition
- Bouton de suppression avec confirmation
- Recherche globale dans tous les éléments

### 16. Modal d'Aide

**Contenu :**
- Explication des tags
- Explication des selectors
- Description du menu d'édition
- Description du mode ZEN
- Informations sur l'export et l'historique
- Version et crédits

**Fermeture :**
- Bouton de fermeture
- Clic sur le backdrop
- Touche Escape

---

## Expérience Utilisateur

### Flux de travail typique

1. **Sélectionner une catégorie** dans le menu de gauche
2. **Voir les snippets** de cette catégorie
3. **Cliquer sur un snippet** pour l'insérer dans l'email
4. **Remplir les tags** (champs entre `*astérisques*`)
5. **Choisir les options** dans les selectors (cliquer sur une option)
6. **Vérifier l'indicateur** de tags restants
7. **Copier l'email** avec le bouton "Copy Email"
8. **Coller dans le CRM** ou l'outil de destination

### Recherche de template complet

1. **Taper dans la barre de recherche** du header
2. **Sélectionner la langue** (FR/EN) si nécessaire
3. **Voir les résultats** dans le menu déroulant
4. **Cliquer sur un résultat** pour charger le template complet
5. **Remplir les champs dynamiques** et copier

### Gestion des templates

1. **Cliquer sur "Édition"** en haut à gauche
2. **Choisir un onglet** (Catégories, Snippets, etc.)
3. **Créer, modifier ou supprimer** les éléments
4. **Réorganiser** par glisser-déposer
5. **Fermer le modal** pour revenir à l'édition

### Mode ZEN

1. **Cliquer sur le bouton ZEN** dans le header
2. **Sélectionner un produit** en haut
3. **Cliquer sur le bouton de frappe** pour "détruire" le produit
4. **Voir les effets visuels** et le compteur
5. **Continuer jusqu'à destruction** du produit
6. **Cliquer sur "Ça va mieux"** pour revenir

---

## Comportements et Interactions

### Insertion de snippets

**Mode "À la ligne" :**
- Insère le snippet sur une nouvelle ligne
- Ajoute un saut de ligne si nécessaire
- Place un espace à la fin
- Curseur positionné à la fin

**Mode "Au curseur" :**
- Insère le snippet à la suite du texte existant
- Ajoute un espace avant si nécessaire
- Place un espace à la fin
- Curseur positionné à la fin

### Insertion de tâches

- Toujours sur une nouvelle ligne
- Chaque tâche est séparée par un saut de ligne
- Si une tâche est optionnelle, elle peut être ignorée

### Sauvegarde automatique

- Toutes les modifications sont sauvegardées automatiquement
- Pas besoin de bouton "Sauvegarder"
- Les données persistent entre les sessions

### Notifications

- Toast de confirmation après copie
- Toast de confirmation après export
- Messages d'erreur si nécessaire
- Auto-dismiss après quelques secondes

### Tooltips

- Aperçu du contenu d'un snippet au survol
- Position dynamique selon la position du curseur
- Informations sur les quick links au survol

---

## Points Importants

### Tags et Selectors

- Les marqueurs `*` et `#` sont **toujours visibles** (pas de masquage)
- Le surlignage est purement visuel pour identifier les champs
- Les tags doivent être remplis manuellement
- Les selectors permettent de choisir entre deux options

### Persistance

- Toutes les données sont sauvegardées localement sur la machine
- Aucune synchronisation cloud
- Export/Import pour sauvegarder ou partager les données

### Design

- Interface sombre moderne
- Transitions fluides
- Feedback visuel sur toutes les actions
- Responsive et adaptatif

### Performance

- Application rapide et réactive
- Pas de délais perceptibles
- Interface fluide

---

## Résumé

TypeF@st est une application de rédaction d'emails avec :
- **Templates réutilisables** organisés par catégories
- **Champs dynamiques** (tags et selectors) pour personnaliser
- **Gestion complète** des templates via interface d'édition
- **Design moderne** avec thème sombre
- **Fonctionnalités avancées** : recherche, export, mode ZEN
- **Expérience fluide** avec sauvegarde automatique

L'application est conçue pour être simple à utiliser tout en offrant des fonctionnalités puissantes pour gérer une bibliothèque de templates d'emails professionnels.
