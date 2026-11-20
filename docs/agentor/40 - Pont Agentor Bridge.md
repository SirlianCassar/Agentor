# Pont Agentor Bridge

Le pont relie le navigateur (CRM Dynamics, portails) à Agentor sur le même
poste. Il a deux sens : **l'observation** — l'extension pousse le dossier
ouvert — et **l'application** — Agentor dépose un travail que la page vient
exécuter. Les deux sont en place pour le CRM ; les formulaires du portail
restent à décrire comme profils.

## Où vit le code

- `extensions/agentor-bridge/` dans ce dépôt : l'extension Chrome/Edge.
  `content/job-runner.js` exécute les travaux, `content/form-fill.js` écrit dans
  les champs d'une page.
- `electron/localBridge.ts`, `electron/bridgeConfig.ts` : le serveur local.
- `electron/jobQueue.ts` : la file des travaux (protocole 2).
- `src/context/bridgeMessages.ts` : la validation des messages reçus.
- `src/context/bridgeJobs.ts` : les travaux et la validation de leurs résultats.
- `electron/caseContextStore.ts` : ce qu'Agentor garde du dossier.
- `src/lib/crmTemplateLibrary.ts`, `src/lib/crmTemplateHoles.ts` : les modèles
  du CRM comme éléments de bibliothèque, et leurs emplacements `***`.

L'extension est née de la variante « Cairm + », retirée du dépôt Cairm le
19/11/2026. Elle conserve la clé de manifeste de Cairm +, donc le même
identifiant Chrome `bchjjpoadifjmmofijgdfdladabgcpem` : les postes appairés le
restent. Cairm n'a plus aucun accès à la machine locale.

## Sens 1 — observation (en place)

Protocole 1, message `case.observed`, envoyé en `POST /v1/case` sur
`127.0.0.1`, jeton d'appairage en `Authorization: Bearer`.

L'extension lit la requête ouverte directement par l'API Dataverse, avec la
session du navigateur : `incidents(<id>)` pour le numéro, le titre, la date de
création, le produit, le client et le pays, `isa_produit_contacts(<id>)` pour le
numéro de série et la date d'achat, `contacts(<id>)` pour l'adresse du client,
`tasks` pour la dernière tâche. Rien n'est
écrit dans le CRM. Une requête résolue ou annulée n'est pas envoyée : Agentor
garde le dossier sur lequel l'agent travaille réellement.

### Les deux blocs collés tels quels

`customerFull` et `productFull` ne sont pas des champs de plus : ce sont les deux
blocs de texte que les boutons de copie rapide de Cairm écrivent, repris mot pour
mot. L'agent colle cette mise en forme dans ses mails depuis des mois ; une
deuxième mise en forme des mêmes données se lirait comme une autre source. Ils
sont donc construits dans l'extension, où sont les enregistrements
(`contacts(<id>)` pour l'adresse, le téléphone et le mail ; `isa_etat` et
`_isa_pays_value` lus à part, car une organisation sans ces colonnes garde les
colonnes standard), et Agentor ne stocke que le texte fini :

```
Recipient : Jean Dupont            SN : 1234567890
Address :                          DoP : 02/09/2026
───────────────────
12 rue des Lilas
69003 - Lyon
France
───────────────────
Phone : 0612345678
Email : jean@example.com
```

Leurs tags suivent le nom français des champs : `<CLIENT_FULL>` et
`<PRODUIT_FULL>`. Un seul nommage pour tous les tags du dossier — un
`<CUSTOMERFULL>` au milieu de `<CLIENT>` et `<DATE_ACHAT>` est un tag que
personne ne retient.

Règles de vie : sondage à 2 s au premier plan, 15 s en arrière-plan, pas de
renvoi tant que la signature des données ne change pas, renvoi forcé toutes les
15 s pour qu'un redémarrage d'Agentor se rattrape seul.

## Sens 2 — application (en place)

Agentor n'a pas de jeton Dataverse : il ne peut rien demander au CRM lui-même.
Tout ce qu'il lui faut de l'autre côté a donc la même forme — **il dépose un
travail, la page vient le chercher, l'exécute et renvoie le résultat.**

Fusionner un modèle, moissonner l'index des titres et écrire un mail dans le
formulaire Dynamics ne sont pas trois besoins : ce sont trois genres du même
travail. D'où **une file unique**, pas une route par usage.

### Canal

```
GET  /v1/jobs?can=<genres>       → les travaux que cette page sait exécuter
POST /v1/jobs/<id>/result        → ce qui a réellement été fait
```

`POST /v1/case` répond `{ ok, caseId, jobs: <n> }` : le nombre de travaux en
attente. `POST /v1/templates` n'existe plus — la moisson est un travail comme
les autres, et son résultat passe par la route de résultat (limite 4 Mo, contre
64 Ko pour un dossier).

Le `can=` est ce que la page sait faire, et il décide de ce qu'elle reçoit :
n'importe quelle page du CRM peut appeler l'API, mais seul le formulaire de mail
(`etn=email`) peut écrire un mail. Un travail n'arrive donc jamais dans un
onglet qui n'aurait plus qu'à le refuser.

### Rythme

Rien n'est poussé vers le navigateur. La page demande du travail sur le rythme
qu'elle utilise déjà pour surveiller la requête : 2 s au premier plan, 15 s en
arrière-plan. Un clic dans Agentor met donc jusqu'à deux secondes à partir, et
c'est le prix d'un canal qui n'invente aucune cadence.

### Les travaux

| Genre | Ce qu'il fait | Résultat |
|---|---|---|
| `template.harvest` | lit les titres des modèles de requête | `{ org, fetchedAt, entries }` |
| `template.instantiate` | `InstantiateTemplate` sur la requête ouverte | `{ subject, body }` |
| `mail.compose` | écrit objet et corps dans le formulaire de mail | `{ applied }` |

Un travail que personne ne vient chercher n'est pas une erreur à cacher : il
expire avec une raison lisible (`no-browser`, `timeout`), et `bridgeJobReasonLabel`
la dit en français à l'agent. Un refus est une réponse normale : `no-case`,
`empty-template`, `field-not-found:<champs>`. Rien ne reste en suspens.

Un résultat illisible ne consomme pas le travail : la page peut encore en poster
un valide avant l'échéance, plutôt que de perdre l'action de l'agent.

### Jamais d'envoi

`mail.compose` écrit objet et corps, et s'arrête là. Aucun formulaire n'est
soumis — `check-bridge.mjs` refuse un `submit()` dans `form-fill.js`. La
relecture reste humaine.

### Mécanique de remplissage

`content/form-fill.js` généralise ce que Cairm fait déjà dans
`portal-order-import.js` : repérage du champ par son libellé (`aria-label`,
`label for`, `placeholder`, `name`), écriture par le setter natif pris sur le
prototype puis événements `input` et `change`, parcours des iframes de même
origine. Une iframe d'une autre origine est une limite respectée, pas contournée.
Le remplissage se relit lui-même : ce qui n'a pas été écrit est rapporté comme
manquant.

### Ce qui reste

Les formulaires du **portail** ne passent pas encore par ce canal. Le moteur de
remplissage est écrit et éprouvé par `mail.compose` ; ce qui manque est le
`formProfile` par procédure (motif d'URL, et par champ une clé Agentor, des
motifs de libellé ou un sélecteur) et les boutons posés dans la page. Il
s'accrochera au modèle de procédure existant (`CustomerPortalCode`), pas à un
troisième silo.

## Templates du CRM

Vérifié sur `guillemot.crm4.dynamics.com` le 19/11/2026, requêtes lues avec le
compte d'un agent.

### Ce qui existe

1 109 templates au total, dont **574 pour les requêtes** (`templatetypecode`
= `incident`), tous d'organisation (`ispersonal` faux). Le reste ne concerne
pas le support : contact 240, lead 74, tâches système 73, compte 60,
utilisateur 43, opportunité 41, et une unité pour facture, devis, contrat et
commande.

Sept langues : 1033 EN, 1036 FR, 1031 DE, 3082 SP, 1040 IT, 2070 PT, 1043 NL.
`languagecode` et le libellé du titre concordent, donc la langue est fiable
sans analyser le titre.

### La convention de titre

```
[LOG ] <marque> <langue> - <famille> - <zone>
        TM | HR          EN FR DE SP IT PT NL        WW | EU | UK | CA | CH | HK TW | US
```

`LOG` préfixe les modèles logistiques (étiquettes retour, réexpédition,
commande non livrée). Les 574 enregistrements se replient donc en quelques
dizaines de familles déclinées par marque × langue × zone : « Paid Spare Part
proposal », « Spare Part proposal UW », « RMA Proposal UW », « 14 Day RMA »,
« 30 Day RMA », « Return to retailer », « Customs fees to refund »,
« Aftercall email », « Introduction », « Resolved request », les renvois vers
les experts, et les familles `LOG` d'étiquettes de retour.

Agentor présente **les familles**, pas les 574 variantes, et résout la
déclinaison depuis la requête. Un titre hors convention (`Test WilCarlos`,
`PROP - email template test 1902`, `B2B TEST TM EN`) tombe en « non classé » et
reste choisissable à la main — jamais deviné.

### La fusion est faite par le serveur

`POST /api/data/v9.2/InstantiateTemplate` avec `TemplateId`, `ObjectType`
= `"incident"` et `ObjectId` renvoie **200** et un `email` non enregistré :
`subject` et `description` déjà fusionnés avec les données de la requête.

Vérifié sur une requête réelle : sujet « Thrustmaster - Follow up your request
N° RQT-704346-2026 », corps portant le nom du client, son adresse postale, son
téléphone, le prénom de l'agent, la signature et le lien de la marque.
Aucun mail n'est créé dans la timeline.

Le `description` renvoyé est le HTML d'un mail Dynamics, alors qu'Agentor
travaille en texte à tags : mélanger les deux casserait à la fois les tags et le
choix ligne par ligne de l'aperçu. La conversion se fait donc à la frontière,
dans l'extension (`agentorBridgeParseBody`, par `DOMParser` — rien du CRM n'est
exécuté), et la mise en page devient des retours à la ligne. Le mail d'Agentor
reste du texte, de bout en bout.

### La mise en forme n'est pas jetée pour autant

Le texte seul ne suffisait pas : le gras, les listes et les liens d'un modèle
sont le travail de celui qui l'a écrit, et un agent qui doit les refaire à la
main dans Dynamics n'a rien gagné. Le HTML voyage donc **à côté** du texte,
découpé en blocs — un bloc par ligne du texte, dans le même ordre, un `<br>`
coupant son bloc en deux. Un bloc qui tient plusieurs lignes ne peut pas être
découpé sans deviner où chaque balise ouvre et ferme : ses lignes partent en
texte, `html: null`, et ne perdent que leur mise en forme.

Au moment de poser le mail, `buildCrmTemplateHtml` marque les trous **deux
fois**, sur le texte et sur le balisage, avec la même carte et la même fonction.
Ou les deux lectures trouvent les mêmes trous — et c'est le balisage, valeurs en
place, qui est donné au CRM — ou elles divergent et le texte simple est envoyé.
Un corps qui a perdu son gras est une gêne ; un corps qui a perdu un prix est
une mauvaise réponse à un client. La raison du refus est nommée
(`text-differs`, `holes-differ`, `no-blocks`) et le message d'Agentor dit
laquelle des deux a été posée.

Deux garde-fous : une valeur est toujours échappée avant d'entrer dans le
balisage — une valeur est du texte, jamais du balisage — et un tag renommé en
nom de balise HTML (`<B>`) n'est pas substitué, sinon il mangerait le gras. Un
tag de dossier écrit en clair dans le corps d'un modèle du CRM est rempli dans
les deux lectures ; c'est rare, le CRM fusionnant lui-même ses propres champs.

Côté extension, le balisage n'est pas écrit tel quel : il a quitté le CRM, est
passé par Agentor et revient, donc ce n'est plus quelque chose que l'extension a
lu elle-même. `agentorBridgeSanitizeHtml` le reconstruit depuis une liste
permise (texte, emphase, listes, tableaux, liens) ; un script, un cadre, un
attribut d'événement ou un lien `javascript:` n'a rien à faire dans un corps de
mail et n'est pas écrit. Il n'est posé que dans un champ en texte riche, et si
l'écriture ne prend pas, le texte simple est réécrit par-dessus plutôt que de
laisser un corps à moitié écrit.

Conséquence : **Agentor n'analyse jamais le XML des templates.** Le champ `body`
est une feuille XSL, `presentationxml` porte les champs de fusion
(`{!contact:firstname;}`, `{!incident:isa_num_request;}`,
`{!systemuser:firstname;}`, adresse et téléphone selon les modèles) — rien de
tout cela n'a à être réimplémenté.

### Les trous à remplir — le vrai point d'accroche

Le corps fusionné garde les emplacements que l'agent complète à la main. Sur
« Paid Spare Part proposal » :

```
- ***SPARE PART*** unit price: ***€
- Standard shipping cost: ***€
- Express shipping cost: ***€
***ATTACH A PDF ON HOW TO REPLACE THE PART, IF IT APPLIES***
```

Sur les familles RMA : `XXXX` pour le numéro de commande, `RQT-XXX`,
`DD/MM/YYYY`.

**Ce sont exactement les valeurs que le calculateur d'Agentor produit** :
référence de pièce, prix unitaire, port standard, port express. Le circuit
complet devient donc :

1. l'extension envoie la requête à Agentor (protocole 1, en place) ;
2. Agentor choisit la famille, résout marque × langue × zone, et demande
   l'instanciation ;
3. le CRM renvoie le corps fusionné ;
4. Agentor remplace les `***` par les valeurs du calculateur ;
5. l'extension pose le résultat dans le formulaire mail de Dynamics, l'agent
   relit et envoie.

**Et ce vocabulaire d'emplacements existe déjà** : ce sont les tags d'Agentor.
Un `***` n'est pas une notion neuve, c'est un tag à écrire. `crmTemplateHoles.ts`
transforme le corps fusionné en texte à tags, et le corps devient un modèle
Agentor ordinaire, rempli par le même pipeline que `<CLIENT>` ou `<PRODUIT>` :

```
- ***SPARE PART*** unit price: ***€   →   - <PIECE> unit price: <PRIX_UNITAIRE>€
```

Les tags du calculateur (`MAIL_SLOT_TAGS` dans `mailSlots.ts`) : `<PIECE>`,
`<SKU>`, `<PRIX_UNITAIRE>`, `<PORT_STANDARD>`, `<PORT_EXPRESS>`. `fillLoadedText`
les remplit comme les tags de dossier — un modèle local qui écrit `<PIECE>` est
donc rempli lui aussi, et c'est voulu : un tag est un tag.

La carte est une donnée : `DEFAULT_CRM_TEMPLATE_HOLES` par clé de famille, plus
ce que les réglages sauvegardés ajoutent (`settings.crmTemplateHoles`, lu par
`normalizeCrmTemplateHoles`). Seule « Paid Spare Part proposal » est décrite :
c'est la seule que le calculateur alimente. Une deuxième famille est quelques
lignes, pas une release de l'extension. **L'écran d'édition de ces cartes n'est
pas écrit** — tant qu'il y en a une ou deux, l'export JSON suffit ; l'interface
se justifiera à la cinquième.

Un emplacement que personne n'a décrit garde ses étoiles, visible, et le nombre
restant est dit à l'agent à l'ouverture de l'aperçu. Rien n'est deviné.

### Les familles sont des éléments de la bibliothèque

Une famille de modèles du CRM n'est pas une deuxième chose à apprendre : elle
vit dans la **même recherche** que les modèles de mail, avec les mêmes
catégories et le même aperçu. Ce qui change est l'origine du corps — le CRM le
fusionne quand on le demande, au lieu qu'il soit stocké ici.

`crmTemplateLibrary.ts` produit les entrées (`kind: 'crm'`, dossier « Modèles du
CRM ») : le titre est la famille, la ligne en dessous est la variante résolue
pour le dossier (`TM FR - 14 Day RMA - EU`) ou la raison du refus (« Marque du
dossier inconnue — à choisir »). La recherche porte aussi sur les titres des
variantes, donc « RMA EN » trouve la famille. Les titres hors convention
apparaissent dans « Modèles du CRM · non classés » et restent choisissables un
par un.

À la sélection : travail `template.instantiate`, corps fusionné, `***` en tags,
puis l'aperçu habituel — mêmes cases de lignes, même import dans le brouillon.
S'y ajoute **Poser dans le CRM** (`mail.compose`), qui écrit objet et corps dans
le formulaire de mail Dynamics sans l'envoyer.

Le modèle fusionné n'est jamais sauvegardé : il vit le temps du brouillon. Les
corps restent dans le CRM, où d'autres les modifient.

### La marque du dossier

Une famille ne se résout qu'avec une marque, et **un produit du CRM porte son
modèle, pas sa marque** : « T598 », « DJControl Inpulse ». Lire la marque sur le
nom du produit la laissait donc ouverte sur presque tous les dossiers, et aucun
modèle ne pouvait être instancié — la bibliothèque affichait « Marque du dossier
inconnue — à choisir », puis refusait d'ouvrir quoi que ce soit : l'agent était
invité à choisir sans rien à choisir.

Deux réponses, pas une :

- **une marque par défaut**, dans Paramètres › Modèles du CRM, Thrustmaster au
  départ. Elle ne sert que lorsque le dossier ne nomme pas la marque, et
  l'aperçu l'annonce (« · marque par défaut ») : le repli n'est jamais muet. Ce
  n'est pas une déduction sur le nom du modèle — une mauvaise marque envoie au
  client le mail d'une autre société ;
- **les variantes choisissables**. Une famille que le dossier ne résout pas
  n'est plus une ligne qui refuse : elle s'ouvre en ses variantes, une ligne
  chacune dans la même recherche (`variant:<famille>:<id>`), avec sa marque, sa
  langue et sa zone. La clé de famille voyage avec la variante, donc les `***`
  de cette famille deviennent des tags comme d'habitude.

### Langue du client

Elle existe dans le CRM : le contact porte `_isa_langue_value` (lookup, valeur
formatée « Français ») et `isa_languename`, et la requête porte son propre champ
de langue. C'est donc elle qui pilote le choix de la déclinaison, pas une
déduction depuis le pays — un client francophone en Hongrie reçoit le modèle FR
avec la zone EU.

Fait le 19/11/2026 : `customerLanguage` est un champ de contexte comme les
autres — tag `<LANGUE>`, case dans Paramètres › Données importées — et
l'extension l'envoie. Elle lit `_isa_langue_value` sur la requête par une
requête séparée : si la colonne n'existe pas sous ce nom, la langue manque mais
le dossier arrive quand même. **À confirmer sur l'organisation** : le nom exact
du champ sur `incident` ; il est avéré sur `contact`.

### Lecture des titres

`src/lib/crmTemplates.ts` lit un titre et replie l'index en familles. Il
comprend la forme dominante (`TM EN - Famille - ZONE`), le préfixe `LOG`, la
forme inversée (`Order Cancellation TM EN`), la marque écrite en toutes lettres
(`THRUSTMASTER FR - …`), les zones composées (`HK TW`, `UK CA CH`) et la zone
collée en fin de segment des titres logistiques (`… - message to customer EU`).
Un suffixe qui n'est pas une zone reste dans le nom de la famille
(`Paid RMA Proposal - US Ricmotech`).

Sur un échantillon de 50 titres réels, 41 sont classés en 37 familles. Les neuf
autres sortent en « non classé », et c'est le résultat voulu : marque DJUCED,
titres sans marque (`Exceptional Cases FR`, `T598 Ready to Send NE`), essais
(`Test WilCarlos`, `PROP - email template test 1902`) et libellés libres
(`Guillemot Privacy`, `R&D Transfer Thrustmaster`). Ils restent visibles et
choisissables à la main.

`resolveCrmTemplateVariant` choisit ensuite marque, langue puis zone. Il ne
choisit jamais dans le noir : zone inexacte signalée, et refus motivé
(`brand`, `language`, `zone`) quand plusieurs zones se disputent sans qu'aucune
corresponde.

### La moisson

La moisson est un travail, `template.harvest`. Agentor l'empile quand il n'a pas
d'index ou qu'il date de plus de sept jours, à l'arrivée d'un dossier ; la page
vient le chercher comme les autres. Une moisson qui échoue n'est pas retentée
avant dix minutes : l'index a une semaine de marge, un CRM qui répond mal ne doit
pas être sollicité à chaque sondage. Deux moissons ne se superposent jamais
(`already-queued`).

Rien n'est lu dans le CRM sur un rythme décidé par l'extension : c'est Agentor
qui demande, et seulement quand il lui manque quelque chose. Paramètres ›
Modèles du CRM a un bouton **Moissonner** pour la demander tout de suite.

Le résultat est validé comme le reste par `parseTemplateIndex` : identifiant en
GUID, titre borné à 300 caractères, 5 000 entrées au maximum. Une ligne illisible
est ignorée, elle ne fait pas tomber la moisson ; une moisson sans aucune ligne
lisible est refusée. La route de résultat accepte 4 Mo de corps, contre 64 Ko
pour un dossier.

### Ce qu'Agentor stocke

L'index seul : `templateid`, `title`, `languagecode`, `modifiedon`, et la
famille déduite. Jamais les corps — ils vivent dans le CRM, où d'autres les
modifient, et `modifiedon` suffit à ne reprendre que ce qui a bougé.

`electron/crmTemplateStore.ts` le garde dans `crm-templates.json`, à part du
contexte de dossier et des données de l'utilisateur, et le diffuse aux fenêtres
par `crm-templates:changed`. `getCrmTemplates`, `clearCrmTemplates` et
`onCrmTemplates` sont exposés au renderer, et Paramètres › Modèles du CRM montre
l'index : date de la moisson, nombre de familles, déclinaisons par famille, et
les non classés. C'est un écran de diagnostic : le choix d'un modèle se fait dans
la recherche de mails, pas ici.

## Étapes

1. ~~Figer le protocole 2 et documenter le contrat ici.~~ Fait :
   `src/context/bridgeJobs.ts`.
2. ~~Ouvrir la file de travaux dans `localBridge.ts` et côté Agentor.~~ Fait :
   `/v1/jobs`, `electron/jobQueue.ts`.
3. ~~Ajouter la langue du client au protocole 1 et au contexte.~~ Fait.
4. ~~Moissonner l'index des templates et le découper en familles.~~ Fait, avec
   l'écran de réglages.
5. ~~Les familles dans la bibliothèque, et l'instanciation à la sélection.~~ Fait.
6. ~~La carte des `***` de la première famille, branchée sur le calculateur.~~
   Fait pour « Paid Spare Part proposal » ; l'écran d'édition des cartes reste à
   écrire.
7. ~~Le moteur de remplissage générique, sans procédure codée en dur.~~ Fait :
   `content/form-fill.js`, éprouvé par `mail.compose`.
8. À faire : le `formProfile` par procédure du portail, accroché à
   `CustomerPortalCode`, et les boutons posés dans la page.

### À vérifier sur l'organisation

- `mail.compose` repère l'objet et le corps par leurs libellés (`subject`,
  `objet`, `message`, `corps`…). C'est la seule pièce qui n'a pas pu être
  essayée sur le vrai formulaire Dynamics : si un champ n'est pas trouvé,
  l'agent reçoit `field-not-found` et peut copier-coller. Essayer sur une
  requête réelle, et ajuster les libellés si besoin.
- L'écriture du balisage dans le corps du mail Dynamics. Le corps est un champ
  en texte riche ; s'il se révèle être un `iframe` d'une autre origine, il n'est
  pas atteignable et le texte simple reste la seule option — le message
  d'Agentor dit laquelle des deux a été posée, donc un essai sur une requête
  réelle suffit à le savoir.
- Le découpage en blocs sur les modèles réels : un modèle dont les lignes ne se
  relisent pas une à une tombe en texte simple (`text-differs`). Si cela arrive
  souvent, c'est le découpage de `agentorBridgeParseBody` qu'il faut revoir, pas
  le repli.
- Le nom exact du champ de langue sur `incident` (avéré sur `contact`).
