export type SettingsTab =
  | 'categories'
  | 'snippets'
  | 'templates'
  | 'tasks'
  | 'tags'
  | 'products'
  | 'calls'
  | 'callHistory'
  | 'callTemplate'
  | 'procedure'
  | 'dashboard'
  | 'dashboardProcess'
  | 'dashboardPortal'
  | 'dashboardVersions'
  | 'dashboardSoftwares'
  | 'dashboardDriverPacks'
  | 'dashboardSpareParts'
  | 'dashboardTroubleshootgun'
  | 'dashboardNews'
  | 'updates'
  | 'display'
  | 'export'
  | 'general'
  | 'snippetSettings'
  | 'history'
  | 'quickLinks'
  | 'procedureMailtos'
  | 'preferences'

export type SettingsIconName =
  | 'archive'
  | 'box'
  | 'call'
  | 'channels'
  | 'display'
  | 'download'
  | 'grid'
  | 'history'
  | 'list'
  | 'mail'
  | 'news'
  | 'notes'
  | 'phone'
  | 'portal'
  | 'preferences'
  | 'settings'
  | 'tag'
  | 'template'
  | 'tool'
  | 'version'

export type SettingsNavSection = {
  id: 'content' | 'procedures' | 'catalogs' | 'troubleshootgun' | 'support' | 'application'
  label: string
  icon: SettingsIconName
  items: Array<{
    id: SettingsTab
    label: string
    description: string
    icon: SettingsIconName
  }>
}

export const settingsNavigation: SettingsNavSection[] = [
  {
    id: 'content',
    label: 'Contenu',
    icon: 'mail',
    items: [
      {
        id: 'categories',
        label: 'Catégories',
        description: 'Familles, couleurs et aperçu des snippets liés.',
        icon: 'channels',
      },
      {
        id: 'snippets',
        label: 'Snippets',
        description: 'Fragments réutilisables avec texte de task optionnel.',
        icon: 'list',
      },
      {
        id: 'templates',
        label: 'Mails',
        description: 'Templates email et task associée optionnelle.',
        icon: 'template',
      },
      {
        id: 'tasks',
        label: 'Tasks',
        description: 'Modèles de tâches réutilisés dans l’application.',
        icon: 'tool',
      },
    ],
  },
  {
    id: 'procedures',
    label: 'Procédures',
    icon: 'portal',
    items: [
      {
        id: 'dashboardPortal',
        label: 'Procédures',
        description: 'Étapes, variantes, forward, modules de copie et mailto.',
        icon: 'notes',
      },
      {
        id: 'procedureMailtos',
        label: 'Contacts mailto',
        description: 'Contacts proposés lors de l’ajout d’un bouton mailto.',
        icon: 'mail',
      },
      {
        id: 'dashboardProcess',
        label: 'Process',
        description: 'Association des procédures aux lignes du dashboard.',
        icon: 'tool',
      },
    ],
  },
  {
    id: 'catalogs',
    label: 'Catalogues',
    icon: 'box',
    items: [
      {
        id: 'products',
        label: 'Produits',
        description: 'Produits, éditions, compatibilités, tags et spare parts.',
        icon: 'box',
      },
      {
        id: 'dashboardVersions',
        label: 'Firmwares',
        description: 'Versions firmware disponibles pour les editions produit.',
        icon: 'version',
      },
      {
        id: 'dashboardSoftwares',
        label: 'Logiciels',
        description: 'Logiciels et versions compatibles.',
        icon: 'template',
      },
      {
        id: 'dashboardDriverPacks',
        label: 'Drivers',
        description: 'Packs drivers et produits qu’ils contiennent.',
        icon: 'version',
      },
      {
        id: 'dashboardSpareParts',
        label: 'Spare Parts',
        description: 'Pièces et SKU organisés par produit.',
        icon: 'archive',
      },
    ],
  },
  {
    id: 'troubleshootgun',
    label: 'Troubleshootgun',
    icon: 'tool',
    items: [
      {
        id: 'dashboardTroubleshootgun',
        label: 'Templates',
        description: 'Templates mail/task et textes optionnels à importer.',
        icon: 'tool',
      },
      {
        id: 'dashboardNews',
        label: 'News',
        description: 'News affichées dans le dashboard.',
        icon: 'news',
      },
    ],
  },
  {
    id: 'support',
    label: 'Support',
    icon: 'phone',
    items: [
      {
        id: 'callTemplate',
        label: 'Template appel',
        description: 'Base injectée à l’ouverture d’un nouvel appel.',
        icon: 'call',
      },
      {
        id: 'callHistory',
        label: 'Historique appels',
        description: 'Consultation et copie des derniers appels sauvegardés.',
        icon: 'history',
      },
      {
        id: 'tags',
        label: 'Tags',
        description: 'Tags prédéfinis disponibles dans les champs texte.',
        icon: 'tag',
      },
    ],
  },
  {
    id: 'application',
    label: 'Application',
    icon: 'settings',
    items: [
      {
        id: 'preferences',
        label: 'Préférences',
        description: 'Réglages globaux, snippets et format d’export.',
        icon: 'preferences',
      },
      {
        id: 'display',
        label: 'Affichage',
        description: 'Zoom global, densité et confort de lecture.',
        icon: 'display',
      },
      {
        id: 'quickLinks',
        label: 'Liens rapides',
        description: 'URLs ouvertes par les boutons d’accès rapide.',
        icon: 'grid',
      },
      {
        id: 'updates',
        label: 'Mise à jour',
        description: 'Statut de l’application et recherche de nouvelles versions.',
        icon: 'download',
      },
    ],
  },
]

export const settingsTabIndex = settingsNavigation.flatMap((section) =>
  section.items.map((item) => ({
    ...item,
    sectionId: section.id,
    sectionLabel: section.label,
  })),
)

export const tokenReferenceItems = [
  {
    title: 'Tag dynamique',
    token: '<CLIENT>',
    description: 'Place un tag remplaçable dans un email, une task ou une procédure.',
  },
  {
    title: 'Sélecteur rapide',
    token: '[OK/KO]',
    description: 'Propose plusieurs variantes directement dans le texte.',
  },
  {
    title: 'Ajout optionnel',
    token: '§texte§',
    description: 'Signale un bloc optionnel ou contextuel à personnaliser.',
  },
]
