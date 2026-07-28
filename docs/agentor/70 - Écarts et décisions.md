# Écarts et décisions

## 2026-07-25 — Documentation absente de la branche distante

Après synchronisation avec `origin/main` au commit `f17635c5`, ni `AGENTS.md` ni `docs/agentor/` n’étaient présents dans la branche. La mémoire canonique a donc été réinitialisée avec les notes strictement nécessaires au changement S-Task / F-Task.

## 2026-07-25 — Compatibilité des templates de Task

Décision : tout template historique sans champ `kind` est considéré comme une F-Task.

Raison : avant cette évolution, l’action d’application d’un template ouvrait toujours la boîte libre. Cette normalisation préserve donc le comportement existant et évite de transformer silencieusement les données utilisateur.

Les nouveaux templates S-Task utilisent explicitement `kind: "s-task"` et `taskSections`. Leur contenu aplati reste renseigné pour les anciennes intégrations.

## 2026-07-25 — Menus de recherche

L’étoile de la catégorie Favoris est placée après son nom dans les menus mail et Task. Le bouton Retour possède une règle de survol dédiée, prioritaire sur le survol générique des résultats, afin qu’aucun faux état de résultat ne soit affiché.

## 2026-07-25 — Réorganisation des paramètres

Décision : Produits génériques, Firmware, Logiciel, Drivers et Tags sont retirés de la navigation Paramètres. La notion de produit visible est désormais réservée au domaine Troubleshotgun.

Les données locales historiques et les normaliseurs correspondants sont conservés. Les supprimer aurait rendu les migrations destructrices et rompu la compatibilité avec les profils existants. Le système de tags reste utilisable par les contenus, sans sous-menu dédié.

Le catalogue Spare Parts est présenté comme des groupes SKU dans l’interface. Son modèle de stockage historique est conservé afin que les références et guides existants restent disponibles.

## 2026-07-25 — Catégories S-Task et F-Task

Décision : les catégories de templates S-Task et F-Task sont séparées par `TaskTemplateCategory.kind`.

Les catégories historiques sans type sont rattachées aux F-Task, conformément à la migration des templates historiques. Une catégorie S-Task par défaut est ajoutée si nécessaire et les associations incompatibles sont réparées vers la première catégorie du bon type.
