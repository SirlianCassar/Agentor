import type { AppData } from './types'

export const defaultData: AppData = {
  version: 13,
  categories: [
    { id: 'cat-general', name: 'Général', color: 'violet' },
    { id: 'cat-tech', name: 'Technique', color: 'bleu' },
    { id: 'cat-delivery', name: 'Livraison', color: 'orange' },
    { id: 'cat-billing', name: 'Facturation', color: 'jaune' },
    { id: 'cat-quality', name: 'Qualité', color: 'vert' },
    { id: 'cat-rma', name: 'RMA test', color: 'rouge' },
    { id: 'cat-dashboard', name: 'Dashboard', color: 'cyan' },
    { id: 'cat-escalation', name: 'Escalade', color: 'magenta' },
  ],
  snippets: [
    {
      id: 'snip-ack',
      title: 'Accusé réception',
      content: `Bonjour <CLIENT>,

Merci pour votre message concernant <PRODUIT>.
§Nous revenons vers vous avec plus de détails sous 24h.§
Pouvez-vous confirmer : [Oui/Non] ?

§
Ajout multi-ligne :
- Numéro de série : <SN>
- Date d'achat : <DATE>
- Revendeur : <REVENDEUR>
§

Bonne journée,
<AGENT>`,
      insertMode: 'line',
      taskText: 'Créer task [Interne/Externe] pour <CLIENT> - §si réouverture nécessaire§.',
      taskOptional: false,
      categoryId: 'cat-general',
    },
    {
      id: 'snip-delivery',
      title: 'Suivi livraison',
      content: `Votre colis <COLIS> est en statut [En transit/Livré].
Lien de suivi : <LIEN>.
§Si besoin, je peux replanifier la livraison.§`,
      insertMode: 'cursor',
      taskText: 'Suivi livraison pour <CLIENT> (colis <COLIS>).',
      taskOptional: true,
      categoryId: 'cat-delivery',
    },
    {
      id: 'snip-diagnostic',
      title: 'Diagnostic rapide',
      content: `Merci de tester la procédure suivante :
1) Redémarrer l'appareil.
2) Vérifier les câbles.
3) Tester sur un autre port USB.

§
Ajout multi-ligne :
- Capture d'écran : <CAPTURE>
- Version du pilote : <VERSION>
§`,
      insertMode: 'line',
      categoryId: 'cat-tech',
    },
    {
      id: 'snip-billing',
      title: 'Info facturation',
      content: `Concernant la facture <FACTURE>, le montant est de <MONTANT>.
Mode de paiement : [CB/Virement].
§Merci d'envoyer un justificatif si besoin.§`,
      insertMode: 'cursor',
      taskText: 'Vérifier paiement <FACTURE> pour <CLIENT>.',
      taskOptional: false,
      categoryId: 'cat-billing',
    },
    {
      id: 'snip-followup',
      title: 'Relance client',
      content: `Relance prévue le <DATE>.
Canal : [Email/Téléphone].
§Ajouter un commentaire si nécessaire.§`,
      insertMode: 'line',
      taskText: 'Relancer <CLIENT> le <DATE>.',
      taskOptional: false,
      categoryId: 'cat-quality',
    },
    {
      id: 'snip-test-tags-mix',
      title: 'Test tags complet',
      content: `Cas test <CLIENT> / <PRODUIT> / <SN>
Statut : [Nouveau/En cours/Résolu]
Canal : [Email:Téléphone]
Montant annoncé : <MONTANT>

§Phrase optionnelle courte avec <TAG>.§

§
Bloc optionnel multi-ligne :
- Dossier : <DOSSIER>
- Capture : <CAPTURE>
- Revendeur : <REVENDEUR>
- Action : [RMA/Remboursement/Diagnostic]
§`,
      insertMode: 'cursor',
      taskText:
        'Test tags pour <CLIENT> - vérifier [mail/task] + §ajouter commentaire interne§.',
      taskOptional: false,
      categoryId: 'cat-tech',
    },
    {
      id: 'snip-price-check',
      title: 'Validation prix',
      content: `Prix produit <PRODUIT> : <MONTANT>
Livraison : [Standard/Express]
Import : [Oui/Non]
Décision : [Valider:Escalader]

§Si le prix diffère du portail, joindre une capture <CAPTURE>.§`,
      insertMode: 'line',
      taskText: 'Contrôler prix <PRODUIT> pour <CLIENT> avant réponse finale.',
      taskOptional: true,
      categoryId: 'cat-billing',
    },
    {
      id: 'snip-rma-full-placeholder',
      title: 'RMA complet placeholder',
      content: `RMA test pour <CLIENT>
Produit : <PRODUIT>
SN : <SN>
Adresse : <ADRESSE>
Transporteur : <TRANSPORTEUR>
Choix action : [Réparation/Échange/Remboursement]

§Ajouter un message court si le client demande un délai précis.§

§
Bloc RMA à remplir :
- Numéro RMA : <RMA>
- Date limite : <DATE>
- Solution validée : <SOLUTION>
- Priorité : <PRIORITE>
§`,
      insertMode: 'line',
      taskText:
        'Créer RMA <RMA> pour <CLIENT> / <PRODUIT> - statut [à créer:créé:envoyé].',
      taskOptional: false,
      categoryId: 'cat-rma',
    },
    {
      id: 'snip-dashboard-placeholder',
      title: 'Dashboard cross-check',
      content: `Cross-check dashboard :
- Produit catalogue : <PRODUIT>
- Software : <SOFTWARE>
- Driver : <DRIVER>
- Firmware : <FIRMWARE>
- Spare part : <SKU>

Résultat : [Compatible/Incompatible/À confirmer]
§Forward à faire si une relation produit est absente.§`,
      insertMode: 'cursor',
      taskText: 'Vérifier relations dashboard pour <PRODUIT> avec <SOFTWARE>/<DRIVER>/<FIRMWARE>.',
      taskOptional: true,
      categoryId: 'cat-dashboard',
    },
    {
      id: 'snip-escalation-placeholder',
      title: 'Escalade multi-canal',
      content: `Escalade <DOSSIER> pour <CLIENT>
Canal : [Mail:Téléphone:Chat]
Motif : [Qualité/Prix/Logistique/Technique]
Pièce jointe : <CAPTURE>

§
À transmettre :
- Historique résumé : <RESUME>
- Montant contesté : <MONTANT>
- Solution proposée : <SOLUTION>
§`,
      insertMode: 'line',
      taskText: `Escalader <DOSSIER> - priorité <PRIORITE>
§Notifier responsable si [VIP/Récurrence].§`,
      taskOptional: false,
      categoryId: 'cat-escalation',
    },
  ],
  templates: [
    {
      id: 'tmpl-fr-return',
      name: 'Retour produit',
      content: `Bonjour <CLIENT>,

Suite à votre demande de retour pour <PRODUIT>, voici les étapes :
1) Emballez soigneusement le produit.
2) Notez le numéro de retour : <RMA>.
3) Déposez le colis au point relais [Mondial Relay/UPS].

§Nous pouvons fournir une étiquette prépayée si besoin.§

Cordialement,
<AGENT>`,
      language: 'fr',
      taskTemplateId: 'task-rma',
      taskCustom: false,
      taskOptional: false,
    },
    {
      id: 'tmpl-fr-infos',
      name: "Demande d'infos",
      content: `Bonjour <CLIENT>,

Pour avancer sur votre dossier <DOSSIER>, merci de fournir :
- Numéro de série : <SN>
- Date d'achat : <DATE>
- Photo du produit : §si disponible§

§
Ajout multi-ligne :
Merci de préciser :
- Système : [Windows/Mac]
- Version : <VERSION>
§

Merci,
<AGENT>`,
      language: 'fr',
      taskText: 'Collecter infos <CLIENT> : <SN>, <DATE> + §photo optionnelle§.',
      taskCustom: true,
      taskOptional: false,
    },
    {
      id: 'tmpl-en-shipping',
      name: 'Shipping update',
      content: `Hello <CLIENT>,

Your shipment for <PRODUCT> is [In transit/Delivered].
Tracking link: <LINK>

§If the address is incorrect, reply with the correct one.§

Best regards,
<AGENT>`,
      language: 'en',
      taskTemplateId: 'task-followup',
      taskCustom: false,
      taskOptional: true,
    },
    {
      id: 'tmpl-en-diagnostic',
      name: 'Diagnostic',
      content: `Hello <CLIENT>,

Please try the steps below for <PRODUCT>:
1) Restart the device.
2) Reinstall driver <VERSION>.
3) Test on another USB port.

§We can schedule a call if needed.§

Kind regards,
<AGENT>`,
      language: 'en',
      taskText: 'Diagnostic <PRODUCT> for <CLIENT> - §optional call§.',
      taskCustom: true,
      taskOptional: false,
    },
    {
      id: 'tmpl-fr-heavy-test',
      name: 'Test complet tags FR',
      content: `Bonjour <CLIENT>,

Nous avons bien repris le dossier <DOSSIER> concernant <PRODUIT>.
Résumé actuel :
- Numéro de série : <SN>
- Version installée : <VERSION>
- Revendeur : <REVENDEUR>
- Montant communiqué : <MONTANT>

Merci de choisir le scénario applicable : [Diagnostic à poursuivre/RMA à ouvrir/Remboursement à valider].

§
Bloc à garder uniquement si nécessaire :
1. Joindre une capture <CAPTURE>
2. Confirmer la date d'achat <DATE>
3. Préciser la plateforme [PC/Xbox/PlayStation]
§

Nous restons disponibles pour finaliser l’action [aujourd’hui/demain].

Cordialement,
<AGENT>`,
      language: 'fr',
      taskTemplateId: 'task-dashboard-test',
      taskCustom: false,
      taskOptional: false,
    },
    {
      id: 'tmpl-en-escalation-test',
      name: 'Escalation test',
      content: `Hello <CLIENT>,

We reviewed case <DOSSIER> for <PRODUCT>.
Current status: [Open/In progress/Waiting customer]
Serial number: <SN>
Firmware/software version: <VERSION>

§Please attach <CAPTURE> if the issue is still visible.§

Next action: [Escalate to tier 2/Create RMA/Send spare part].

Best regards,
<AGENT>`,
      language: 'en',
      taskText: `Escalation <DOSSIER> for <CLIENT>
Product: <PRODUCT>
Decision: [Tier 2/RMA/Spare part]
§Add reproduction steps if available.§`,
      taskCustom: true,
      taskOptional: false,
    },
    {
      id: 'tmpl-fr-rma-placeholder',
      name: 'RMA placeholder avancé',
      content: `Bonjour <CLIENT>,

Votre demande de retour pour <PRODUIT> a été analysée.
Référence dossier : <DOSSIER>
Numéro de série : <SN>
Solution retenue : [Réparation/Échange/Remboursement]

Merci de confirmer l’adresse suivante :
<ADRESSE>

§
Si l’adresse est incorrecte :
- Nouvelle adresse :
- Téléphone :
- Transporteur préféré : <TRANSPORTEUR>
§

Après confirmation, nous générerons le RMA <RMA>.

Cordialement,
<AGENT>`,
      language: 'fr',
      taskTemplateId: 'task-rma-placeholder',
      taskCustom: false,
      taskOptional: false,
    },
    {
      id: 'tmpl-en-dashboard-placeholder',
      name: 'Dashboard compatibility reply',
      content: `Hello <CLIENT>,

We checked compatibility for <PRODUCT>.
Software: <SOFTWARE>
Driver: <DRIVER>
Firmware: <FIRMWARE>
Platform: <PLATEFORME>

Compatibility status: [Compatible/Not compatible/Needs confirmation].

§
Optional troubleshooting:
- Reinstall <DRIVER>
- Update <FIRMWARE>
- Send screenshot <CAPTURE>
§

Best regards,
<AGENT>`,
      language: 'en',
      taskTemplateId: 'task-dashboard-relations',
      taskCustom: false,
      taskOptional: true,
    },
    {
      id: 'tmpl-fr-commercial-placeholder',
      name: 'Geste commercial test',
      content: `Bonjour <CLIENT>,

Suite au dossier <DOSSIER>, nous pouvons proposer [remise/accessoire/remboursement partiel].
Montant concerné : <MONTANT>
Motif : [retard transporteur/défaut répété/erreur commande]

§Cette proposition reste soumise à validation interne.§

Merci de nous confirmer si cette solution vous convient.

Cordialement,
<AGENT>`,
      language: 'fr',
      taskText: `Validation commerciale <DOSSIER>
Montant : <MONTANT>
Solution : <SOLUTION>
Priorité : <PRIORITE>`,
      taskCustom: true,
      taskOptional: false,
    },
  ],
  taskTemplates: [
    {
      id: 'task-rma',
      name: 'RMA / Retour',
      content: `Ouvrir RMA pour <CLIENT> - Produit <PRODUIT>.
Adresse : <ADRESSE>
Statut : [Sous garantie/Hors garantie]
§Ajouter photo si disponible.§`,
    },
    {
      id: 'task-followup',
      name: 'Suivi client',
      content: `Relancer <CLIENT> le <DATE>.
Canal : [Email/Téléphone].
§
Notes internes :
- Résumé : <RESUME>
- Priorité : [Basse:Haute]
§`,
    },
    {
      id: 'task-crm',
      name: 'Mise à jour CRM',
      content: `Mettre à jour la fiche <CLIENT> dans CRM.
Tag : <TAG>
§Optionnel : ajouter commentaire libre.§`,
    },
    {
      id: 'task-dashboard-test',
      name: 'Dashboard test complet',
      content: `Créer une task complète pour <CLIENT>
Produit : <PRODUIT>
Dossier : <DOSSIER>
Action : [Diagnostic/RMA/Spare part/Remboursement]
Priorité : [Basse/Moyenne/Haute]

§
Checklist :
- Vérifier version <VERSION>
- Contrôler SN <SN>
- Ajouter capture <CAPTURE>
- Préparer message final pour <AGENT>
§`,
    },
    {
      id: 'task-quality-loop',
      name: 'Boucle qualité',
      content: `Audit qualité <DOSSIER> / <PRODUIT>
Motif : [retour répété/pièce manquante/erreur prix]
Canal client : [Email:Téléphone]

§Créer note interne si le dossier doit être surveillé 48h.§`,
    },
    {
      id: 'task-rma-placeholder',
      name: 'RMA placeholder avancé',
      content: `Préparer RMA <RMA>
Client : <CLIENT>
Produit : <PRODUIT>
SN : <SN>
Adresse : <ADRESSE>
Transporteur : <TRANSPORTEUR>
Type : [Réparation/Échange/Remboursement]

§
Contrôles avant envoi :
- Garantie : [UW/OOW]
- Preuve achat <DATE>
- Capture défaut <CAPTURE>
- SKU spare éventuel <SKU>
§`,
    },
    {
      id: 'task-dashboard-relations',
      name: 'Relations dashboard',
      content: `Contrôle dashboard <PRODUIT>
Software lié : <SOFTWARE>
Driver lié : <DRIVER>
Firmware lié : <FIRMWARE>
Plateforme : <PLATEFORME>
Compatibilité : [OK/KO/À compléter]

§Ajouter une news dashboard si la relation change pour plusieurs agents.§`,
    },
    {
      id: 'task-call-placeholder',
      name: 'Appel placeholder',
      content: `Appel sortant <CLIENT>
Dossier : <DOSSIER>
Sujet : [RMA/Prix/Diagnostic/Livraison]
Résumé : <RESUME>

§
Script :
- Confirmer identité
- Confirmer produit <PRODUIT>
- Valider solution <SOLUTION>
§`,
    },
  ],
  procedures: [
    {
      id: 'proc-hercules-oow',
      name: 'Hercules - Aucun son',
      productName: 'DJControl Inpulse 500',
      language: 'fr',
      brand: 'hercules',
      coverage: 'oow',
      infoText: `Client : <CLIENT>
Produit : <PRODUIT>
Version : <VERSION>

§
Ajout multi-ligne :
- OS : [Windows/Mac]
- Type de port : [USB 2.0/USB 3.0]
§`,
      optionalNotes: '§Optionnel : proposer un geste commercial.§',
      steps: `[ ] Vérifier que <PRODUIT> est bien détecté dans le gestionnaire.
[ ] Tester un autre port USB.
[ ] Réinstaller le pilote <VERSION>.
Si le problème persiste, proposer [Échange/Remboursement].
§Demander une vidéo si nécessaire.§`,
      taskTemplateId: 'task-crm',
      taskCustom: false,
    },
    {
      id: 'proc-hercules-uw',
      name: 'Hercules - Micro non reconnu',
      productName: 'Stream 200 XLR',
      language: 'fr',
      brand: 'hercules',
      coverage: 'uw',
      infoText: `Client : <CLIENT>
Produit : <PRODUIT>
Numéro de série : <SN>`,
      optionalNotes: 'Si besoin, planifier un retour atelier.',
      steps: `[ ] Vérifier la connexion USB.
[ ] Tester sur un autre PC.
[ ] Mettre à jour le firmware <VERSION>.
§Proposer un échange si nécessaire.§`,
      taskText: 'Organiser échange <PRODUIT> pour <CLIENT> - §expédition prioritaire§.',
      taskCustom: true,
    },
    {
      id: 'proc-thrust-oow',
      name: 'Thrustmaster - Pédalier instable',
      productName: 'T-LCM Pedals',
      language: 'fr',
      brand: 'thrustmaster',
      coverage: 'oow',
      infoText: `Client : <CLIENT>
Produit : <PRODUIT>
Modèle : <MODELE>

§
Ajout multi-ligne :
- Plateforme : [PC/Console]
- Firmware : <VERSION>
§`,
      optionalNotes: '§Optionnel : demander une vidéo du problème.§',
      steps: `[ ] Vérifier le câble RJ12.
[ ] Nettoyer les connecteurs.
[ ] Tester le pédalier seul.
Si le souci persiste, proposer [Réparation/Devis].`,
      taskTemplateId: 'task-followup',
      taskCustom: false,
    },
    {
      id: 'proc-thrust-uw',
      name: 'Thrustmaster - Volant non centré',
      productName: 'T300 RS GT',
      language: 'fr',
      brand: 'thrustmaster',
      coverage: 'uw',
      infoText: `Client : <CLIENT>
Produit : <PRODUIT>
Firmware : <VERSION>`,
      optionalNotes: '§Optionnel : vérifier si le calibrage automatique est activé.§',
      steps: `[ ] Lancer la calibration via le panneau de contrôle.
[ ] Tester un autre port USB.
[ ] Rebrancher l'alimentation.
§Si besoin, ouvrir un RMA.§`,
      taskText: 'Préparer RMA pour <CLIENT> - Volant <PRODUIT>.',
      taskCustom: true,
    },
    {
      id: 'proc-placeholder-cross-platform',
      name: 'Placeholder - Diagnostic cross-platform',
      productName: 'Agentor Wheel Pro / Audio Box',
      language: 'fr',
      brand: 'thrustmaster',
      coverage: 'uw',
      infoText: `Client : <CLIENT>
Produit : <PRODUIT>
Plateforme : <PLATEFORME>
Driver : <DRIVER>
Firmware : <FIRMWARE>
Capture : <CAPTURE>`,
      optionalNotes: `§
Notes de test :
- Utiliser [PC/Xbox/PlayStation]
- Comparer <VERSION> avec le dashboard
- Préparer <SOLUTION> si reproduction confirmée
§`,
      steps: `[ ] Confirmer que <PRODUIT> est visible dans le panneau de contrôle.
[ ] Vérifier version <DRIVER> et <FIRMWARE>.
[ ] Tester sur [autre port/autre PC/autre câble].
[ ] Collecter logs + capture <CAPTURE>.
Si KO, proposer [RMA/Escalade/Spare part].`,
      taskTemplateId: 'task-dashboard-relations',
      taskCustom: false,
    },
  ],
  notes: `Notes de test :
- Vérifier tags <CLIENT>, <PRODUIT>, <DOSSIER>, <RMA>
- Vérifier sélecteurs [OK/KO] et [Mail:Téléphone]
- Vérifier blocs optionnels §inline§ et multi-lignes
- Tester dashboard avec <SOFTWARE>, <DRIVER>, <FIRMWARE>, <SKU>`,
  emailDraft: `Bonjour <CLIENT>,

Merci pour votre retour sur <PRODUIT>.
Voici un récapitulatif rapide :
- Dossier : <DOSSIER>
- Référence RQT : RTQ-240145
- Statut : [Ouvert/Fermé]

§Nous pouvons proposer une solution commerciale.§

§
Ajout multi-ligne :
Merci de fournir :
- Numéro de série : <SN>
- Preuve d'achat : <DATE>
§

Cordialement,
<AGENT>`,
  taskDraft: `Task pour <CLIENT> / <PRODUIT>
Type : [SAV/Support]

§Optionnel : appeler le client aujourd'hui.§

§
Ajout multi-ligne :
- CRM : mettre à jour la fiche
- Priorité : [Basse/Haute]
§`,
  history: [
    {
      id: 'hist-1',
      content: 'Exemple historique <CLIENT> - [OK/KO]',
      createdAt: '2024-02-10T09:30:00.000Z',
    },
    {
      id: 'hist-2',
      content: 'Suivi livraison <COLIS> pour <CLIENT>.',
      createdAt: '2024-01-18T14:12:00.000Z',
    },
  ],
  callHistory: [
    {
      id: 'call-hist-1',
      content: `// Regarding RTQ - <DOSSIER> //
CU called about : <PRODUIT>
Issue : [No power/No sound/Price dispute]
Next action : <SOLUTION>`,
      createdAt: '2026-04-14T09:15:00.000Z',
    },
    {
      id: 'call-hist-2',
      content: `Outbound call <CLIENT>
Topic : RMA <RMA>
Result : [Reached/Voicemail/Callback requested]`,
      createdAt: '2026-04-13T16:40:00.000Z',
    },
  ],
  settings: {
    language: 'fr',
    zoom: 1,
    textScale: 1,
    editorLineHeight: 1.6,
    exportFont: 'Calibri, "Segoe UI", Arial, sans-serif',
    exportFontSize: 12,
    historyOnCopy: true,
    historyLimit: 200,
    callTemplate: `// Please Assign to Niels Cassar-Gaisne //
// Regarding RTQ -   //


CU called about : <PRODUIT>
Case : <DOSSIER>
SN : <SN>
Status : [New/In progress/Closed]
Next action : <SOLUTION>
`,
    autoFocusEditor: true,
    defaultSnippetInsertMode: 'line',
    snippetCategoryDisplay: 'dropdown',
    quickLinkUrls: {
      crm: 'https://guillemot.crm4.dynamics.com/main.aspx?appid=2f4bd5ed-80df-ed11-a7c6-0022489fd23c&pagetype=dashboard&id=f320ce73-dad8-ef11-8eea-0022489b522b&type=system&_canOverride=true',
      share: 'https://guillemot.sharepoint.com/sites/ShareConseiller/SitePages/ShareConseiller.aspx',
      global:
        'https://guillemot.sharepoint.com/:x:/r/sites/ShareConseiller/_layouts/15/Doc.aspx?sourcedoc=%7BB5FC152C-34B0-4CEB-A69E-561C60DF9272%7D&file=TS%20-%20Global%20actions%20for%20products.xlsx&action=default&mobileredirect=true',
      portal: 'https://portal.guillemot.fr/portal3/',
      assist:
        'https://m365.cloud.microsoft/chat/?fromcode=cmmiadtp424&origindomain=Office&auth=2&client-request-id=f9582af1-e339-437f-9315-9e004f3716f4',
    },
    predefinedTags: [
      '<CLIENT>',
      '<PRODUIT>',
      '<AGENT>',
      '<VERSION>',
      '<SN>',
      '<DATE>',
      '<DOSSIER>',
      '<RMA>',
      '<LINK>',
      '<LIEN>',
      '<COLIS>',
      '<FACTURE>',
      '<MONTANT>',
      '<MODELE>',
      '<ADRESSE>',
      '<TAG>',
      '<RESUME>',
      '<REVENDEUR>',
      '<CAPTURE>',
      '<PRODUCT>',
      '<PLATEFORME>',
      '<PRIORITE>',
      '<SOLUTION>',
      '<TRANSPORTEUR>',
      '<SKU>',
      '<FIRMWARE>',
      '<DRIVER>',
      '<SOFTWARE>',
    ],
    customerPortalCodes: [
      {
        id: 'portal-1',
        procedureName: 'Hercules - Aucun son',
        codes: [
          {
            id: 'portal-1-code-1',
            code: 'CP-HER-001',
            showDraft: false,
            showForward: false,
            forwardTarget: '',
            infoNote: '',
          },
        ],
      },
      {
        id: 'portal-2',
        procedureName: 'Hercules - Micro non reconnu',
        codes: [
          {
            id: 'portal-2-code-1',
            code: 'CP-HER-002',
            showDraft: false,
            showForward: false,
            forwardTarget: '',
            infoNote: '',
          },
        ],
      },
      {
        id: 'portal-3',
        procedureName: 'Thrustmaster - Pédalier instable',
        codes: [
          {
            id: 'portal-3-code-1',
            code: 'CP-THR-101',
            showDraft: false,
            showForward: false,
            forwardTarget: '',
            infoNote: '',
          },
        ],
      },
      {
        id: 'portal-4',
        procedureName: 'Thrustmaster - Volant non centré',
        codes: [
          {
            id: 'portal-4-code-1',
            code: 'CP-THR-102',
            showDraft: false,
            showForward: false,
            forwardTarget: '',
            infoNote: '',
          },
        ],
      },
      {
        id: 'portal-5',
        procedureName: 'Test multi-forward - Spare part manquante',
        codes: [
          {
            id: 'portal-5-code-1',
            title: 'Contrôle stock',
            code: 'CP-TEST-SPARE-01',
            showDraft: true,
            showForward: false,
            forwardTarget: '',
            infoNote: 'Vérifier <SKU>, disponibilité et compatibilité avant toute réponse.',
          },
          {
            id: 'portal-5-code-2',
            title: 'Forward logistique',
            code: 'FW-LOG-442',
            showDraft: false,
            showForward: true,
            forwardTarget: 'Logistique / Spare parts',
            infoNote: 'Forward si [stock KO/doute compatibilité] ou si <TRANSPORTEUR> est bloqué.',
          },
        ],
      },
      {
        id: 'portal-6',
        procedureName: 'Test garantie - prix et remboursement',
        codes: [
          {
            id: 'portal-6-code-1',
            title: 'Validation montant',
            code: 'CP-PRICE-VALID',
            showDraft: true,
            showForward: false,
            forwardTarget: '',
            infoNote: 'Comparer <MONTANT> avec le price calculator et le portail client.',
          },
          {
            id: 'portal-6-code-2',
            title: 'Escalade qualité',
            code: 'FW-QUALITY-118',
            showDraft: true,
            showForward: true,
            forwardTarget: 'Quality loop',
            infoNote: 'Utiliser si le client mentionne [retour répété/défaut connu].',
          },
        ],
      },
      {
        id: 'portal-7',
        procedureName: 'Placeholder dashboard - relations manquantes',
        codes: [
          {
            id: 'portal-7-code-1',
            title: 'Relation produit',
            code: 'CP-DASH-REL-001',
            showDraft: true,
            showForward: false,
            forwardTarget: '',
            infoNote: 'Contrôler <SOFTWARE>, <DRIVER>, <FIRMWARE> et <PLATEFORME>.',
          },
          {
            id: 'portal-7-code-2',
            title: 'Escalade data',
            code: 'FW-DATA-REL-002',
            showDraft: false,
            showForward: true,
            forwardTarget: 'Dashboard data owner',
            infoNote: 'Forward si [relation absente/version incohérente/spare part introuvable].',
          },
        ],
      },
    ],
    dashboardProducts: [
      {
        id: 'dash-soft-control-panel',
        name: 'Control Panel Test Suite',
        category: 'software',
        latestVersion: '4.12.8',
        sheet: `Produit test : <SOFTWARE>
Version : <VERSION>
Notes :
- Mode [standard/beta]
- Compatible PC
- Vérifier installation avant firmware`,
        supportUrl: 'https://support.example.test/control-panel',
        compatibleProductIds: ['catalog-wheel-pro', 'catalog-pedals-pro'],
      },
      {
        id: 'dash-driver-ffb',
        name: 'Force Feedback Driver',
        category: 'driver',
        latestVersion: '2026.04',
        sheet: `Driver <DRIVER>
Plateforme : [Windows 10/Windows 11]
Test :
- Reboot obligatoire
- Calibration après installation
- Logs à joindre : <CAPTURE>`,
        supportUrl: 'https://support.example.test/driver-ffb',
        compatibleProductIds: ['catalog-wheel-pro'],
      },
      {
        id: 'dash-driver-audio',
        name: 'Audio Bridge Driver',
        category: 'driver',
        latestVersion: '3.8.1',
        sheet: `Driver audio <DRIVER>
Cas test : [USB absent/son haché/micro muet]
Collecter <SN> + <VERSION>.`,
        supportUrl: 'https://support.example.test/audio-bridge',
        compatibleProductIds: ['catalog-audio-box'],
      },
      {
        id: 'dash-firmware-wheel',
        name: 'Wheel Base Firmware',
        category: 'firmware',
        latestVersion: '17.03',
        sheet: `Firmware <FIRMWARE>
Pré-requis :
- Driver dash-driver-ffb
- Alimentation branchée
- Ne pas débrancher pendant [2/5] minutes`,
        supportUrl: 'https://support.example.test/firmware-wheel',
        compatibleProductIds: ['catalog-wheel-pro'],
        softwareIds: ['dash-soft-control-panel'],
        driverIds: ['dash-driver-ffb'],
      },
      {
        id: 'dash-firmware-audio',
        name: 'Audio Box Firmware',
        category: 'firmware',
        latestVersion: '2.4.0',
        sheet: `Firmware audio box
Si échec : tester [port USB 2.0/port USB 3.0/autre PC].
Tag test <PRODUIT> <VERSION> <CAPTURE>.`,
        supportUrl: 'https://support.example.test/firmware-audio',
        compatibleProductIds: ['catalog-audio-box'],
        softwareIds: ['dash-soft-control-panel'],
        driverIds: ['dash-driver-audio'],
      },
      {
        id: 'dash-legacy-placeholder',
        name: 'Legacy Placeholder Product Sheet',
        category: 'product',
        latestVersion: 'Legacy-2026-Q2',
        sheet: `Fiche legacy <PRODUIT>
Champs dynamiques : <MODELE>, <SKU>, <SOLUTION>
Modes : [archive/actif/à remplacer]
Note : §utiliser seulement pour test de catégorie Legacy.§`,
        supportUrl: 'https://support.example.test/legacy-placeholder',
        compatibleProductIds: ['catalog-wheel-pro', 'catalog-shifter-lite'],
        softwareIds: ['dash-soft-control-panel'],
        driverIds: ['dash-driver-ffb'],
      },
      {
        id: 'dash-soft-mobile-placeholder',
        name: 'Mobile Companion Placeholder',
        category: 'software',
        latestVersion: '1.9.0-beta',
        sheet: `Software mobile <SOFTWARE>
Plateforme : [iOS/Android]
Compte client : <CLIENT>
Utiliser si le dossier mentionne [Bluetooth/appairage/profil].`,
        supportUrl: 'https://support.example.test/mobile-companion',
        compatibleProductIds: ['catalog-audio-box', 'catalog-gamepad-mini'],
      },
    ],
    products: [
      {
        id: 'catalog-wheel-pro',
        name: 'Agentor Wheel Pro',
        productType: 'Volant test',
        tags: ['<PRODUIT>', 'wheel', 'force-feedback', '[PC/Xbox]'],
        compatibleProductIds: ['catalog-pedals-pro', 'catalog-shifter-lite'],
        softwareIds: ['dash-soft-control-panel'],
        driverIds: ['dash-driver-ffb'],
        firmwareIds: ['dash-firmware-wheel'],
        editions: [
          {
            id: 'edition-wheel-pc',
            platform: 'pc',
            name: 'PC Edition',
            firmwareIds: ['dash-firmware-wheel'],
            compatibleProductIds: ['catalog-pedals-pro', 'catalog-shifter-lite'],
          },
          {
            id: 'edition-wheel-xbox',
            platform: 'xbox',
            name: 'Xbox Edition',
            firmwareIds: ['dash-firmware-wheel'],
            compatibleProductIds: ['catalog-pedals-pro'],
          },
        ],
        spareParts: [
          {
            id: 'spare-wheel-clamp',
            name: 'Desk clamp test',
            sku: 'SP-WHEEL-CLAMP',
            guideAvailable: true,
          },
          {
            id: 'spare-wheel-power',
            name: 'Power supply 24V',
            sku: 'SP-WHEEL-POWER',
            guideAvailable: false,
          },
        ],
      },
      {
        id: 'catalog-pedals-pro',
        name: 'Agentor Pedals Pro',
        productType: 'Pédalier test',
        tags: ['<SKU>', 'load-cell', 'calibration'],
        compatibleProductIds: ['catalog-wheel-pro'],
        softwareIds: ['dash-soft-control-panel'],
        driverIds: ['dash-driver-ffb'],
        firmwareIds: [],
        editions: [
          {
            id: 'edition-pedals-universal',
            platform: 'custom',
            name: 'Universal Edition',
            firmwareIds: [],
            compatibleProductIds: ['catalog-wheel-pro'],
          },
        ],
        spareParts: [
          {
            id: 'spare-pedals-spring',
            name: 'Spring kit [soft/hard]',
            sku: 'SP-PED-SPRING',
            guideAvailable: true,
          },
          {
            id: 'spare-pedals-cable',
            name: 'RJ12 cable',
            sku: 'SP-PED-RJ12',
            guideAvailable: true,
          },
        ],
      },
      {
        id: 'catalog-audio-box',
        name: 'Agentor Audio Box',
        productType: 'Interface audio test',
        tags: ['audio', '<VERSION>', '[USB/Micro]'],
        compatibleProductIds: [],
        softwareIds: ['dash-soft-control-panel'],
        driverIds: ['dash-driver-audio'],
        firmwareIds: ['dash-firmware-audio'],
        editions: [
          {
            id: 'edition-audio-pc',
            platform: 'pc',
            name: 'Streaming PC',
            firmwareIds: ['dash-firmware-audio'],
            compatibleProductIds: [],
          },
        ],
        spareParts: [
          {
            id: 'spare-audio-usb',
            name: 'USB-C cable',
            sku: 'SP-AUDIO-USBC',
            guideAvailable: false,
          },
          {
            id: 'spare-audio-knob',
            name: 'Volume knob',
            sku: 'SP-AUDIO-KNOB',
            guideAvailable: true,
          },
        ],
      },
      {
        id: 'catalog-shifter-lite',
        name: 'Agentor Shifter Lite',
        productType: 'Shifter test',
        tags: ['shifter', 'legacy', '<MODELE>'],
        compatibleProductIds: ['catalog-wheel-pro'],
        softwareIds: [],
        driverIds: ['dash-driver-ffb'],
        firmwareIds: [],
        editions: [],
        spareParts: [
          {
            id: 'spare-shifter-knob',
            name: 'Shifter knob',
            sku: 'SP-SHIFT-KNOB',
            guideAvailable: true,
          },
        ],
      },
      {
        id: 'catalog-gamepad-mini',
        name: 'Agentor Gamepad Mini',
        productType: 'Manette test',
        tags: ['gamepad', '<PLATEFORME>', '[Bluetooth/USB]'],
        compatibleProductIds: ['catalog-audio-box'],
        softwareIds: ['dash-soft-mobile-placeholder'],
        driverIds: [],
        firmwareIds: [],
        editions: [
          {
            id: 'edition-gamepad-mobile',
            platform: 'custom',
            name: 'Mobile Edition',
            firmwareIds: [],
            compatibleProductIds: ['catalog-audio-box'],
          },
          {
            id: 'edition-gamepad-playstation',
            platform: 'playstation',
            name: 'PlayStation Test',
            firmwareIds: [],
            compatibleProductIds: [],
          },
        ],
        spareParts: [
          {
            id: 'spare-gamepad-dpad',
            name: 'D-pad replacement',
            sku: 'SP-GAMEPAD-DPAD',
            guideAvailable: true,
          },
          {
            id: 'spare-gamepad-battery',
            name: 'Battery pack',
            sku: 'SP-GAMEPAD-BAT',
            guideAvailable: false,
          },
        ],
      },
    ],
    dashboardNews: [
      {
        id: 'news-test-release',
        date: '2026-04-14',
        title: 'Test release Agentor v2',
        content: `[color=#ff6b6b]Alerte QA[/color]
- Vérifier <CLIENT>, <PRODUIT> et [OK/KO] avant copie
- Contour rouge si un tag reste dans le mail ou la task

[color=#69db7c]Validé[/color]
- Name formatter en haut du dashboard outils
- Price calculator plein écran sur la partie droite`,
      },
      {
        id: 'news-test-tags',
        date: '2026-04-13',
        title: 'Pack de tags de validation',
        content: `[color=#74c0fc]Tags disponibles[/color]
- <PLATEFORME>, <PRIORITE>, <SOLUTION>, <SKU>
- Sélecteur attendu : [Diagnostic:RMA]

[color=#ff6b6b]À contrôler[/color]
- Remplacer tous les tags avant d’utiliser Copier`,
      },
      {
        id: 'news-test-dashboard',
        date: '2026-04-12',
        title: 'Dashboard rempli pour QA',
        content: `[color=#69db7c]Catalogue[/color]
- Logiciels, drivers, firmwares, produits, éditions et spare parts
- Recherche test : wheel, audio, firmware, <VERSION>, SP-AUDIO-KNOB`,
      },
      {
        id: 'news-test-portal',
        date: '2026-04-11',
        title: 'Portal placeholder complet',
        content: `[color=#74c0fc]Portal[/color]
- Procédures de test avec [draft/forward/info note]
- Forward affiché avec sa destination quand elle est renseignée
- Recherche : <SOFTWARE>, <DRIVER>, <FIRMWARE>, <SKU>`,
      },
      {
        id: 'news-test-rma',
        date: '2026-04-10',
        title: 'RMA et appels de test',
        content: `[color=#ff6b6b]RMA[/color]
- Scénarios : [Réparation/Échange/Remboursement]
- Tags de test : <RMA>, <ADRESSE>, <TRANSPORTEUR>

[color=#69db7c]Appels[/color]
- Template appel prêt pour validation`,
      },
    ],
  },
}
