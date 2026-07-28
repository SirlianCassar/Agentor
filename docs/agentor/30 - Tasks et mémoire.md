# Tasks et mémoire

## Vocabulaire

- **S-Task** : Task structurée à partir du squelette configurable en quatre sections.
- **F-Task** : Task libre, sans squelette.
- **Box dossier** : emplacement temporaire qui mémorise ensemble le mail, les notes, la S-Task et la F-Task.

Les anciens libellés « Task formatée », « Task libre », « Task 1 » et « Task 2 » ne doivent plus être affichés dans l’interface.

## Box dossier

L’espace Compose expose cinq Box dossier. Le nombre est centralisé par `DRAFT_BOX_COUNT`.

Chaque Box dossier conserve :

- le brouillon mail ;
- les notes ;
- les deux contenus S-Task et F-Task ;
- la Task active au moment de la sauvegarde.

## Templates

`TaskTemplate.kind` distingue :

- `s-task` pour un template structuré ;
- `f-task` pour un template libre.

Le champ reste optionnel dans le type stocké pour accepter les anciennes données. Une valeur absente ou inconnue est normalisée en `f-task`.

`TaskTemplateCategory.kind` applique la même distinction aux catégories. Une catégorie historique sans type est normalisée en catégorie F-Task. La normalisation garantit qu’au moins une catégorie existe pour chaque type, et un template dont la catégorie ne correspond pas à son type est rattaché à la première catégorie compatible.

Un template S-Task stocke son titre dans `taskTitle` et ses quatre contenus dans `taskSections`. Son champ `content` contient également une version aplatie des sections pour préserver les consommateurs historiques et les exports. Lorsqu’il est appliqué, il ouvre la boîte S-Task, place le titre au-dessus des sections, reconstruit le squelette avec les noms de sections actifs et applique le numéro de mail courant.

Un template F-Task conserve son texte dans `content`. Lorsqu’il est appliqué, il ouvre la boîte F-Task sans ajouter de squelette.

Les deux types possèdent des catégories séparées et partagent le même système de favoris. La recherche de templates suit automatiquement la boîte S-Task ou F-Task active.
