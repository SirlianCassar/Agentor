import type { AppData } from './types'

export const defaultData: AppData = {
  version: 2,
  categories: [
    { id: 'cat-general', name: 'Général', color: 'violet' },
    { id: 'cat-tech', name: 'Technique', color: 'bleu' },
    { id: 'cat-delivery', name: 'Livraison', color: 'orange' },
    { id: 'cat-billing', name: 'Facturation', color: 'jaune' },
    { id: 'cat-quality', name: 'Qualité', color: 'vert' },
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
      id: 'tmpl-en-troubleshoot',
      name: 'Troubleshooting',
      content: `Hello <CLIENT>,

Please try the steps below for <PRODUCT>:
1) Restart the device.
2) Reinstall driver <VERSION>.
3) Test on another USB port.

§We can schedule a call if needed.§

Kind regards,
<AGENT>`,
      language: 'en',
      taskText: 'Troubleshoot <PRODUCT> for <CLIENT> - §optional call§.',
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
  ],
  procedures: [
    {
      id: 'proc-hercules-oow',
      name: 'Hercules - Aucun son',
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
  ],
  notes: 'Notes de test : vérifier les champs dynamiques et les sélecteurs.',
  emailDraft: `Bonjour <CLIENT>,

Merci pour votre retour sur <PRODUIT>.
Voici un récapitulatif rapide :
- Dossier : <DOSSIER>
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
  settings: {
    language: 'fr',
    zoom: 1,
    textScale: 1,
    editorLineHeight: 1.6,
    exportFont: 'Calibri, "Segoe UI", Arial, sans-serif',
    exportFontSize: 12,
    historyOnCopy: true,
    historyLimit: 200,
    autoFocusEditor: true,
    defaultSnippetInsertMode: 'line',
    snippetCategoryDisplay: 'dropdown',
    customerPortalCodes: [
      {
        id: 'portal-1',
        procedureName: 'Hercules - Aucun son',
        code: 'CP-HER-001',
        showDraft: false,
        showForward: false,
        forwardTarget: '',
        infoNote: '',
      },
      {
        id: 'portal-2',
        procedureName: 'Hercules - Micro non reconnu',
        code: 'CP-HER-002',
        showDraft: false,
        showForward: false,
        forwardTarget: '',
        infoNote: '',
      },
      {
        id: 'portal-3',
        procedureName: 'Thrustmaster - Pédalier instable',
        code: 'CP-THR-101',
        showDraft: false,
        showForward: false,
        forwardTarget: '',
        infoNote: '',
      },
      {
        id: 'portal-4',
        procedureName: 'Thrustmaster - Volant non centré',
        code: 'CP-THR-102',
        showDraft: false,
        showForward: false,
        forwardTarget: '',
        infoNote: '',
      },
    ],
    dashboardProducts: [],
  },
}
