import type { AppIconName } from './iconTypes'

export type SettingsTab =
  | 'categories'
  | 'snippets'
  | 'templates'
  | 'tasks'
  | 'templateCategories'
  | 'taskCategories'
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
  id: 'home' | 'content' | 'procedures' | 'catalogs' | 'support' | 'application'
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
        description: 'Version, mise à jour, récapitulatif global et export/import.',
        icon: 'dashboard',
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
        label: 'Catégories des snippets',
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
        id: 'templateCategories',
        label: 'Catégories mail',
        description: 'Catégories utilisées par la recherche et le Troubleshootgun.',
        icon: 'channels',
      },
      {
        id: 'tasks',
        label: 'Tasks',
        description: 'Modèles de tâches réutilisés dans l’application.',
        icon: 'tool',
      },
      {
        id: 'taskCategories',
        label: 'Catégories task',
        description: 'Catégories utilisées par la recherche de templates task.',
        icon: 'channels',
      },
      {
        id: 'taskFormat',
        label: 'Task Format',
        description: 'Noms des 4 sections utilisées dans chaque task.',
        icon: 'template',
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
        label: 'Templates mailto',
        description: 'Destinataires, titre et texte proposés pour les boutons mailto.',
        icon: 'mail',
      },
    ],
  },
  {
    id: 'catalogs',
    label: 'Catalogues',
    icon: 'book',
    items: [
      {
        id: 'products',
        label: 'Produits',
        description: 'Produits, éditions, compatibilités, tags et spare parts.',
        icon: 'book',
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
        label: 'Affichage & Préférences',
        description: 'Options visuelles, réglages globaux, snippets et export.',
        icon: 'preferences',
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
