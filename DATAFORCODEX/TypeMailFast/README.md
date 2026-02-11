# TypeF@st

Application web locale pour rédiger rapidement des emails avec des templates pré-configurés.

## Transfert vers un autre PC

### Méthode 1 : Copier les fichiers

1. **Copiez tout le dossier** `TypeMailFast` sur votre autre PC (via clé USB, cloud, etc.)

2. **Les fichiers à transférer :**
   - `index.html`
   - `app.js`
   - `styles.css`
   - `README.md` (ce fichier)

### Méthode 2 : Utiliser Git (si vous utilisez Git)

```bash
git clone <votre-repo>
# ou
git pull
```

## Lancer l'application

### Option 1 : Script automatique (RECOMMANDÉ)

**Sur Windows :**
1. Double-cliquez sur `start.bat`
2. Le serveur démarre automatiquement et Chrome s'ouvre avec l'application

**Sur Mac/Linux :**
1. Double-cliquez sur `start.sh` (ou exécutez `./start.sh` dans le terminal)
2. Le serveur démarre automatiquement et votre navigateur s'ouvre avec l'application

### Option 2 : Ouvrir directement (simple)

1. **Double-cliquez** sur le fichier `index.html`
   - L'application s'ouvrira dans votre navigateur par défaut

2. **C'est tout !** L'application fonctionne entièrement en local.

### Option 3 : Serveur manuel

#### Sur Windows :
```bash
python -m http.server 8080
```
Puis ouvrez **http://localhost:8080** dans Chrome

#### Sur Mac/Linux :
```bash
python3 -m http.server 8080
```
Puis ouvrez **http://localhost:8080** dans votre navigateur

## Compatibilité

- **Microsoft Edge** (Chromium) - Testé et compatible
- **Google Chrome**
- **Mozilla Firefox**
- **Safari**

## Données

Toutes vos données (snippets, templates, catégories) sont sauvegardées dans le **localStorage** de votre navigateur. Elles restent sur votre machine et ne sont pas synchronisées entre navigateurs.

### Pour réinitialiser les données :
1. Ouvrez les DevTools (F12)
2. Onglet "Application" → "Local Storage"
3. Supprimez la clé `tmf-state-v1`
4. Rafraîchissez la page

## Utilisation

1. **Sélectionnez une catégorie** dans le menu de gauche
2. **Cliquez sur un snippet** pour l'ajouter à votre email
3. **Remplissez les tags** (mots entre `*astérisques*`)
4. **Copiez** votre email avec le bouton "Copy Email"

### Recherche de templates
- Utilisez la barre de recherche en haut pour trouver des templates
- Sélectionnez la langue avec les drapeaux FR/EN
- Cliquez sur un résultat pour charger le template complet

## Personnalisation

Tous les templates et configurations sont modifiables via le bouton **"Édition"** en haut à gauche.

---

**Note** : Cette application fonctionne entièrement hors ligne, aucune connexion internet n'est requise après le premier chargement.


