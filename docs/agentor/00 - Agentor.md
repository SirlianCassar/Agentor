# Agentor

Cette documentation est la mémoire canonique du rework Agentor.

## Domaines

- [[20 - Paramètres et navigation]] décrit l’organisation des réglages, les domaines visibles et les données historiques masquées.
- [[30 - Tasks et mémoire]] décrit les S-Task, F-Task, leurs templates et les Box dossier.
- [[40 - Pont Agentor Bridge]] décrit le pont avec le navigateur : l’observation du dossier ouvert, la file de travaux qui fait fusionner les modèles par le CRM, et l’application des données dans les formulaires.
- [[70 - Écarts et décisions]] consigne les écarts constatés et les décisions de migration.

## Principes

- Les données existantes doivent rester compatibles lors de l’ajout de nouveaux champs.
- Une S-Task est structurée par le squelette configurable en quatre sections.
- Une F-Task est un contenu libre, sans squelette imposé.
- Les templates S-Task et F-Task conservent leur type, leurs catégories dédiées et le même système de favoris.
- Les produits génériques ne sont pas un domaine de réglage visible. La notion de produit appartient à Troubleshotgun.
- Un emplacement laissé par un modèle du CRM est un tag Agentor, pas une notion à part : un tag sans valeur connue reste visible, jamais deviné.
- Agentor ne demande au navigateur que ce qu’il ne peut pas faire lui-même, et seulement quand il lui manque quelque chose.
