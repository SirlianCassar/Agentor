# Agentor Bridge

Extension Chrome/Edge (MV3) qui relie le CRM Dynamics 365 à Agentor sur le même
poste. Elle remplace la variante « Cairm + », qui n'existe plus : le pont ne
dépend plus de Cairm et vit désormais dans le dépôt d'Agentor.

## Ce qu'elle fait

- **Envoi.** Sur une page de requête (`etn=incident`), elle lit la requête via
  l'API Dataverse avec la session du navigateur et envoie à Agentor le numéro,
  le titre, la date de création, le produit, le numéro de série, la date
  d'achat, le client, le pays et la dernière tâche. Rien n'est écrit dans le
  CRM. Une requête résolue ou annulée n'est pas envoyée.
- **Travaux.** Agentor n'a pas de jeton Dataverse : tout ce qu'il lui faut du
  CRM est un travail qu'il met dans sa file et que la page vient chercher
  (`GET /v1/jobs?can=…`, résultat sur `POST /v1/jobs/<id>/result`). Trois
  genres :
  - `template.harvest` — les titres des modèles de requête, demandés quand
    Agentor n'a pas d'index ou qu'il date de plus de sept jours ;
  - `template.instantiate` — `InstantiateTemplate` : le CRM fusionne un modèle
    avec la requête et renvoie objet et corps. Rien n'est enregistré ;
  - `mail.compose` — écrit objet et corps dans le formulaire de mail
    (`etn=email`). **Jamais d'envoi** : le remplissage s'arrête avant le bouton.

  Une page ne reçoit que les genres qu'elle sait exécuter, et un travail qu'elle
  refuse revient avec sa raison, jamais en silence. Voir
  `docs/agentor/40 - Pont Agentor Bridge.md`.

## Identité et appairage

L'extension conserve la clé de manifeste de Cairm +, donc le même identifiant
Chrome `bchjjpoadifjmmofijgdfdladabgcpem`. Les postes déjà appairés le restent :
Agentor accepte cette origine sans réglage supplémentaire.

Le jeton d'appairage ne vit que dans le service worker et dans le stockage local
de l'extension. Les scripts de contenu ne le voient jamais. L'extension ne parle
qu'à `127.0.0.1` sur le port configuré.

## Développement

```sh
node scripts/check-bridge.mjs           # manifeste, identité, fichiers, syntaxe, genres de travaux
node scripts/make-icons.mjs             # régénère les icônes
node scripts/build-zip.mjs --tag v2.0.51  # archive dans dist/agentor-bridge/
```

Pour tester : `chrome://extensions` → mode développeur → « Charger l'extension
non empaquetée » sur ce dossier, puis renseigner le jeton et le port dans les
réglages de l'extension (ceux d'Agentor sont dans Paramètres › Connexions).

## Version

L'extension suit le numéro de version d'Agentor : une release `vX.Y.Z` du dépôt
publie l'application et l'archive `Agentor-Bridge-chromium-vX.Y.Z.zip` au même
numéro. Pas de matrice de compatibilité à tenir.
