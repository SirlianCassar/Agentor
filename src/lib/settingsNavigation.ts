import type { AppIconName } from './iconTypes'

export type SettingsTab =
  | 'categories'
  | 'snippets'
  | 'templates'
  | 'tasks'
  | 'sTasks'
  | 'fTasks'
  | 'templateCategories'
  | 'troubleshootgun'
  | 'taskCategories'
  | 'sTaskCategories'
  | 'fTaskCategories'
  | 'tags'
  | 'products'
  | 'calls'
  | 'callHistory'
  | 'callTemplate'
  | 'procedure'
  | 'dashboard'
  | 'dashboardPortal'
  | 'dashboardVersions'
  | 'dashboardSoftwares'
  | 'dashboardDriverPacks'
  | 'dashboardSpareParts'
  | 'dashboardNews'
  | 'updates'
  | 'display'
  | 'export'
  | 'general'
  | 'snippetSettings'
  | 'history'
  | 'quickLinks'
  | 'procedureMailtos'
  | 'taskFormat'
  | 'preferences'

export type SettingsIconName = AppIconName

export type SettingsNavSection = {
  id: 'home' | 'content' | 'troubleshotgun' | 'procedures' | 'catalogs' | 'support'
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
    id: 'home',
    label: 'Accueil',
    icon: 'settings',
    items: [
      {
        id: 'dashboard',
        label: 'Accueil',
        description: 'Version, récapitulatif global et export/import.',
        icon: 'dashboard',
      },
      {
        id: 'preferences',
        label: 'Affichage et préférence',
        description: 'Options visuelles et réglages généraux de l’application.',
        icon: 'preferences',
      },
      {
        id: 'updates',
        label: 'Mise à jour',
        description: 'Statut de l’application et recherche de nouvelles versions.',
        icon: 'download',
      },
    ],
  },
  {
    id: 'content',
    label: 'Contenu',
    icon: 'mail',
    items: [
      {
        id: 'categories',
        label: 'Catégories Snippets',
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
        id: 'templateCategories',
        label: 'Catégories Mail',
        description: 'Catégories utilisées par les templates mail.',
        icon: 'channels',
      },
      {
        id: 'templates',
        label: 'Mails',
        description: 'Templates email et Task associée optionnelle.',
        icon: 'template',
      },
      {
        id: 'sTaskCategories',
        label: 'Catégories de S-Task',
        description: 'Catégories réservées aux templates S-Task.',
        icon: 'channels',
      },
      {
        id: 'sTasks',
        label: 'S-Task',
        description: 'Templates S-Task structurés selon le squelette configuré.',
        icon: 'template',
      },
      {
        id: 'taskFormat',
        label: 'Mise en forme S-Task',
        description: 'Noms et aperçu des quatre sections du squelette S-Task.',
        icon: 'preferences',
      },
      {
        id: 'fTaskCategories',
        label: 'Catégories de F-Task',
        description: 'Catégories réservées aux templates F-Task.',
        icon: 'channels',
      },
      {
        id: 'fTasks',
        label: 'F-Task',
        description: 'Templates libres sans squelette imposé.',
        icon: 'template',
      },
    ],
  },
  {
    id: 'troubleshotgun',
    label: 'Troubleshotgun',
    icon: 'folder',
    items: [
      {
        id: 'troubleshootgun',
        label: 'Produits',
        description: 'Produits Troubleshotgun et leurs templates mail dédiés.',
        icon: 'folder',
      },
    ],
  },
  {
    id: 'procedures',
    label: 'Procédures',
    icon: 'list',
    items: [
      {
        id: 'dashboardPortal',
        label: 'Procédures',
        description: 'Étapes, variantes, forward, modules de copie et mailto.',
        icon: 'list',
      },
      {
        id: 'procedureMailtos',
        label: 'Mailto',
        description: 'Destinataires, titre et texte proposés pour les boutons mailto.',
        icon: 'mail',
      },
    ],
  },
  {
    id: 'catalogs',
    label: 'Catalogue',
    icon: 'book',
    items: [
      {
        id: 'dashboardSpareParts',
        label: 'SKU’s',
        description: 'Références SKU et guides associés.',
        icon: 'archive',
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
        label: 'Call template',
        description: 'Base injectée à l’ouverture d’un nouvel appel.',
        icon: 'call',
      },
      {
        id: 'callHistory',
        label: 'Historique d’appel',
        description: 'Consultation et copie des derniers appels sauvegardés.',
        icon: 'history',
      },
      {
        id: 'quickLinks',
        label: 'Liens rapides',
        description: 'URLs ouvertes par les boutons d’accès rapide.',
        icon: 'grid',
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

export const settingsRelatedTabs: Partial<Record<SettingsTab, SettingsTab[]>> = {
  categories: ['snippets'],
  snippets: ['categories'],
  templates: ['templateCategories', 'sTasks', 'fTasks'],
  templateCategories: ['templates'],
  sTasks: ['sTaskCategories', 'taskFormat', 'fTasks', 'templates'],
  sTaskCategories: ['sTasks'],
  taskFormat: ['sTasks', 'sTaskCategories'],
  fTasks: ['fTaskCategories', 'sTasks', 'templates'],
  fTaskCategories: ['fTasks'],
  dashboardPortal: ['procedureMailtos'],
  procedureMailtos: ['dashboardPortal'],
  dashboardSpareParts: ['dashboardNews'],
  dashboardNews: ['dashboardSpareParts'],
  callTemplate: ['callHistory'],
  callHistory: ['callTemplate', 'quickLinks'],
  quickLinks: ['callTemplate', 'callHistory'],
  preferences: ['updates'],
  updates: ['preferences'],
}

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
