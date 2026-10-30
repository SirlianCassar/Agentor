import type { AppIconName } from './iconTypes'

export type SettingsTab =
  | 'contents'
  | 'categories'
  | 'snippets'
  | 'templates'
  | 'sTasks'
  | 'fTasks'
  | 'templateCategories'
  | 'troubleshootgun'
  | 'sTaskCategories'
  | 'fTaskCategories'
  | 'tags'
  | 'callHistory'
  | 'callTemplate'
  | 'dashboard'
  | 'dashboardPortal'
  | 'dashboardSpareParts'
  | 'dashboardNews'
  | 'updates'
  | 'quickLinks'
  | 'procedureMailtos'
  | 'taskFormat'
  | 'preferences'
  | 'connections'
  | 'caseTags'
  | 'caseImport'
  | 'productAliases'

export type SettingsIconName = AppIconName

export type SettingsNavItem = {
  id: SettingsTab
  label: string
  description: string
  icon: SettingsIconName
  // Sub-page shown under its parent in the menu (categories, formatting).
  parent?: SettingsTab
  // Name of the data counted next to the label in the menu.
  countKey?: SettingsCountKey
}

export type SettingsCountKey = 'templates' | 'snippets' | 'sTasks' | 'fTasks' | 'troubleshootgun' | 'procedures' | 'products' | 'news'

export type SettingsNavSection = {
  id: 'home' | 'library' | 'procedures' | 'catalogs' | 'support' | 'connections'
  label: string
  icon: SettingsIconName
  items: SettingsNavItem[]
}

export const settingsNavigation: SettingsNavSection[] = [
  {
    id: 'home',
    label: 'Général',
    icon: 'settings',
    items: [
      { id: 'dashboard', label: 'Vue d’ensemble', description: 'Contenu enregistré, export, import et mémoire des emails.', icon: 'dashboard' },
      { id: 'preferences', label: 'Affichage', description: 'Options visuelles et réglages généraux de l’application.', icon: 'preferences' },
      { id: 'updates', label: 'Mise à jour', description: 'Statut de l’application et recherche de nouvelles versions.', icon: 'download' },
    ],
  },
  {
    id: 'library',
    label: 'Bibliothèque',
    icon: 'library',
    items: [
      { id: 'contents', label: 'Contenus', description: 'Tous les mails, snippets et tâches : sélection multiple, catégories, tags, corbeille et éléments à vérifier.', icon: 'folderOpen' },
      { id: 'templates', label: 'Mails', description: 'Templates email et Task associée optionnelle.', icon: 'template', countKey: 'templates' },
      { id: 'templateCategories', label: 'Catégories', description: 'Catégories utilisées par les templates mail.', icon: 'channels', parent: 'templates' },
      { id: 'snippets', label: 'Snippets', description: 'Fragments réutilisables avec texte de task optionnel.', icon: 'list', countKey: 'snippets' },
      { id: 'categories', label: 'Catégories', description: 'Familles, couleurs et aperçu des snippets liés.', icon: 'channels', parent: 'snippets' },
      { id: 'sTasks', label: 'S-Task', description: 'Templates S-Task structurés selon le squelette configuré.', icon: 'template', countKey: 'sTasks' },
      { id: 'sTaskCategories', label: 'Catégories', description: 'Catégories réservées aux templates S-Task.', icon: 'channels', parent: 'sTasks' },
      { id: 'taskFormat', label: 'Mise en forme', description: 'Noms et aperçu des quatre sections du squelette S-Task.', icon: 'preferences', parent: 'sTasks' },
      { id: 'fTasks', label: 'F-Task', description: 'Templates libres sans squelette imposé.', icon: 'template', countKey: 'fTasks' },
      { id: 'fTaskCategories', label: 'Catégories', description: 'Catégories réservées aux templates F-Task.', icon: 'channels', parent: 'fTasks' },
      { id: 'troubleshootgun', label: 'Troubleshotgun', description: 'Produits Troubleshotgun et leurs templates mail dédiés.', icon: 'folder', countKey: 'troubleshootgun' },
    ],
  },
  {
    id: 'procedures',
    label: 'Procédures',
    icon: 'list',
    items: [
      { id: 'dashboardPortal', label: 'Procédures', description: 'Étapes, variantes, forward, modules de copie et mailto.', icon: 'list', countKey: 'procedures' },
      { id: 'procedureMailtos', label: 'Mailto', description: 'Destinataires, titre et texte proposés pour les boutons mailto.', icon: 'mail' },
    ],
  },
  {
    id: 'catalogs',
    label: 'Catalogue',
    icon: 'book',
    items: [
      { id: 'dashboardSpareParts', label: 'SKU’s', description: 'Références SKU et guides associés.', icon: 'archive', countKey: 'products' },
      { id: 'dashboardNews', label: 'News', description: 'News affichées dans le dashboard.', icon: 'news', countKey: 'news' },
    ],
  },
  {
    id: 'support',
    label: 'Support',
    icon: 'phone',
    items: [
      { id: 'callTemplate', label: 'Call template', description: 'Base injectée à l’ouverture d’un nouvel appel.', icon: 'call' },
      { id: 'callHistory', label: 'Historique d’appel', description: 'Consultation et copie des derniers appels sauvegardés.', icon: 'history' },
      { id: 'quickLinks', label: 'Liens rapides', description: 'URLs ouvertes par les boutons d’accès rapide.', icon: 'grid' },
    ],
  },
  {
    id: 'connections',
    label: 'Dossier et tags',
    icon: 'plug',
    items: [
      { id: 'connections', label: 'Connexion Cairm+', description: 'Réception du dossier ouvert dans le CRM et jeton d’appairage.', icon: 'plug' },
      { id: 'caseImport', label: 'Données importées', description: 'Informations du dossier gardées parmi celles envoyées par Cairm+.', icon: 'importData' },
      { id: 'caseTags', label: 'Tags du dossier', description: 'Tag rempli par chaque information du dossier actif, et remplissage automatique.', icon: 'tag' },
      { id: 'productAliases', label: 'Noms de produits', description: 'Nom utilisé dans les mails pour chaque nom de produit du CRM.', icon: 'box' },
      { id: 'tags', label: 'Tags proposés', description: 'Tags proposés pendant la saisie d’un mail ou d’une task.', icon: 'tag' },
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
  contents: ['templates', 'snippets', 'sTasks', 'fTasks'],
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
  connections: ['caseImport', 'caseTags'],
  caseImport: ['connections', 'caseTags'],
  caseTags: ['caseImport', 'connections', 'productAliases', 'tags'],
  productAliases: ['caseTags'],
  tags: ['caseTags'],
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
