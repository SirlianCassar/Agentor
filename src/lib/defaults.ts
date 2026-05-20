import type { AppData } from './types'

export const defaultData: AppData = {
  version: 24,
  categories: [],
  snippets: [],
  templates: [],
  taskTemplates: [],
  procedures: [],
  notes: '',
  emailDraft: '',
  taskDraft: '',
  history: [],
  callHistory: [],
  settings: {
    language: 'fr',
    zoom: 1,
    textScale: 1,
    editorLineHeight: 1.6,
    exportFont: 'Calibri, "Segoe UI", Arial, sans-serif',
    exportFontSize: 12,
    historyOnCopy: true,
    historyLimit: 200,
    callTemplate: '',
    autoFocusEditor: true,
    defaultSnippetInsertMode: 'line',
    snippetCategoryDisplay: 'dropdown',
    quickLinkUrls: {
      crm: '',
      share: '',
      global: '',
      portal: '',
      assist: '',
    },
    procedureMailtoLinks: [
      {
        id: 'mailto-support',
        label: 'Support',
        to: 'support@example.com',
        subject: 'Demande de support',
        body: 'Bonjour,\n\nJe vous contacte au sujet de...',
      },
      {
        id: 'mailto-sav',
        label: 'SAV',
        to: 'sav@example.com',
        subject: 'Suivi SAV',
        body: 'Bonjour,\n\nPouvez-vous faire le point sur...',
      },
    ],
    predefinedTags: [],
    customerPortalCodes: [],
    dashboardProcessSettings: [
      {
        id: 'rma-14',
        rush: false,
        completeProcedureId: '',
        reducedProcedureId: '',
      },
      {
        id: 'rma-30',
        rush: false,
        completeProcedureId: '',
        reducedProcedureId: '',
      },
    ],
    dashboardProducts: [],
    products: [
      {
        id: 'sample-troubleshootgun-product',
        name: 'Pack vérification Troubleshootgun',
        productType: 'Demo',
        note: 'Produit seed pour valider l’aperçu Troubleshootgun.',
        tags: ['demo', 'email', 'test'],
        packingGuideAvailable: false,
        compatibleProductIds: [],
        softwareIds: [],
        driverIds: [],
        firmwareIds: [],
        editions: [],
        spareParts: [],
        troubleshootgunTemplates: [
          {
            id: 'sample-troubleshootgun-template-1',
            name: 'Email entrant',
            content:
              'Objet: Problème de connexion\n\nBonjour,\n\nJe n’arrive plus à me connecter à mon compte depuis ce matin. Pouvez-vous vérifier ?\n\nMerci.',
            sections: [
              {
                id: 'sample-troubleshootgun-template-1-section-1',
                title: 'Demander version navigateur',
                content: 'Pouvez-vous nous indiquer le navigateur utilisé et sa version ?',
              },
              {
                id: 'sample-troubleshootgun-template-1-section-2',
                title: 'Ajouter reset mot de passe',
                content:
                  'Vous pouvez aussi lancer une réinitialisation du mot de passe depuis la page de connexion.',
              },
            ],
            taskText: 'Répondre avec la procédure de réinitialisation du mot de passe.',
          },
          {
            id: 'sample-troubleshootgun-template-2',
            name: 'Relance client',
            content:
              'Objet: Relance dossier SAV\n\nBonjour,\n\nJe reviens vers vous concernant mon ticket. Avez-vous une mise à jour ?\n\nCordialement,',
            taskText: 'Confirmer le statut du ticket et proposer un délai.',
          },
          {
            id: 'sample-troubleshootgun-template-3',
            name: 'Clôture',
            content:
              'Objet: Ticket résolu\n\nBonjour,\n\nLe problème est maintenant résolu. Merci pour votre aide et votre réactivité.\n\nBien à vous,',
            sections: [
              {
                id: 'sample-troubleshootgun-template-3-section-1',
                title: 'Enquête satisfaction',
                content:
                  'Si vous avez une minute, votre retour sur la qualité du support nous aidera beaucoup.',
              },
            ],
            taskText: 'Clôturer le ticket et archiver la réponse modèle.',
          },
          {
            id: 'sample-troubleshootgun-template-4',
            name: 'Placeholder diagnostic',
            content:
              'Objet: Diagnostic en cours\n\nBonjour,\n\nNous avons bien reçu votre demande et allons vérifier les points techniques de votre dossier.',
            sections: [
              {
                id: 'sample-troubleshootgun-template-4-section-1',
                title: 'Demander facture',
                content: 'Merci de joindre une copie de la facture ou preuve d’achat.',
              },
              {
                id: 'sample-troubleshootgun-template-4-section-2',
                title: 'Demander photo produit',
                content:
                  'Merci d’ajouter une photo nette du produit et du numéro de série visible.',
              },
            ],
            taskText: 'Contrôler les pièces jointes et compléter le diagnostic.',
          },
          {
            id: 'sample-troubleshootgun-template-5',
            name: 'Placeholder échange',
            content:
              'Objet: Suite de prise en charge\n\nBonjour,\n\nVotre dossier est prêt pour la prochaine étape de traitement.',
            sections: [
              {
                id: 'sample-troubleshootgun-template-5-section-1',
                title: 'Adresse de livraison',
                content: 'Pouvez-vous confirmer l’adresse complète de livraison ?',
              },
              {
                id: 'sample-troubleshootgun-template-5-section-2',
                title: 'Disponibilité stock',
                content:
                  'Le délai dépendra de la disponibilité du stock au moment de validation.',
              },
            ],
            taskText: 'Préparer la suite de dossier selon la réponse client.',
          },
        ],
      },
    ],
    dashboardNews: [],
    dashboardReminders: '',
  },
}
