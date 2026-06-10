import type { AppIconName } from '../lib/iconTypes'
import addIcon from '../assets/Icons8-2/icons8-plus-70.png'
import archiveIcon from '../assets/Icons8-2/icons8-dossier-70.png'
import asciiWallIcon from '../assets/Icons8-2/Ascii Wall.png'
import screenEmulatorIcon from '../assets/Icons8-2/Screen Emulator.png'
import bookIcon from '../assets/Icons8-2/icons8-livre-70.png'
import calculatorIcon from '../assets/Icons8-2/icons8-calculatrice-70.png'
import channelsIcon from '../assets/Icons8-2/icons8-contenu-70.png'
import closeIcon from '../assets/Icons8-2/icons8-multiplier-70.png'
import contactsIcon from '../assets/Icons8-2/icons8-contacts-70.png'
import dashboardIcon from "../assets/Icons8-2/icons8-page-vue-d'ensemble-4-70.png"
import deleteIcon from '../assets/Icons8-2/icons8-poubelle-70.png'
import displayIcon from '../assets/Icons8-2/icons8-page-présentation-2-70.png'
import downloadIcon from '../assets/Icons8-2/icons8-télécharger-70.png'
import editIcon from '../assets/Icons8-2/icons8-crayon-70.png'
import exchangeIcon from '../assets/Icons8-2/icons8-signe-égal-70.png'
import folderIcon from '../assets/Icons8-2/icons8-dossier-70.png'
import maintenanceIcon from '../assets/Icons8-2/icons8-entretien-70.png'
import openedFolderIcon from '../assets/Icons8-2/icons8-dossier-ouvert-70.png'
import historyIcon from '../assets/Icons8-2/icons8-historique-des-activités-70.png'
import linkIcon from '../assets/Icons8-2/icons8-lien-70.png'
import listIcon from '../assets/Icons8-2/icons8-liste-70.png'
import mailIcon from '../assets/Icons8-2/icons8-email-70.png'
import newsIcon from '../assets/Icons8-2/icons8-nouvelles-70.png'
import notesIcon from '../assets/Icons8-2/icons8-note-70.png'
import phoneIcon from '../assets/Icons8-2/icons8-téléphone-70.png'
import saveIcon from '../assets/Icons8-2/icons8-sauvegarder-70.png'
import settingsIcon from '../assets/Icons8-2/icons8-paramètres-70.png'
import systemReportIcon from '../assets/Icons8-2/icons8-rapport-système-70.png'
import taskIcon from '../assets/Icons8-2/icons8-tâches-parallèles-70.png'
import templateIcon from '../assets/Icons8-2/icons8-documents-70.png'
import versionIcon from '../assets/Icons8-2/icons8-téléchargement-des-mises-à-jour-70.png'

const rasterIcons: Partial<Record<AppIconName, string>> = {
  add: addIcon,
  archive: folderIcon,
  asciiWall: asciiWallIcon,
  screenEmulator: screenEmulatorIcon,
  book: bookIcon,
  box: archiveIcon,
  call: phoneIcon,
  channels: channelsIcon,
  close: closeIcon,
  dashboard: dashboardIcon,
  delete: deleteIcon,
  display: displayIcon,
  download: downloadIcon,
  edit: editIcon,
  exchange: exchangeIcon,
  folder: folderIcon,
  folderOpen: openedFolderIcon,
  grid: openedFolderIcon,
  hangar: archiveIcon,
  history: historyIcon,
  inbox: mailIcon,
  info: contactsIcon,
  link: linkIcon,
  list: listIcon,
  mail: mailIcon,
  maintenance: maintenanceIcon,
  money: calculatorIcon,
  news: newsIcon,
  notes: notesIcon,
  phone: phoneIcon,
  portal: openedFolderIcon,
  preferences: settingsIcon,
  save: saveIcon,
  settings: settingsIcon,
  shield: systemReportIcon,
  systemReport: systemReportIcon,
  tag: linkIcon,
  template: templateIcon,
  tool: taskIcon,
  version: versionIcon,
}

export const UiIcon = ({ name, className }: { name: AppIconName; className?: string }) => {
  const rasterIcon = rasterIcons[name]
  if (rasterIcon) {
    return (
      <img
        aria-hidden="true"
        className={['ui-icon-img', className].filter(Boolean).join(' ')}
        draggable={false}
        src={rasterIcon}
        alt=""
      />
    )
  }

  const common = {
    className,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: '2',
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  }

  switch (name) {
    case 'archive':
      return (
        <svg {...common}>
          <path d="M3 7h18" />
          <path d="M5 7v12h14V7" />
          <path d="M8 4h8l2 3H6z" />
          <path d="M10 12h4" />
        </svg>
      )
    case 'box':
      return (
        <svg {...common}>
          <path d="M21 8l-9-5-9 5 9 5z" />
          <path d="M3 8v8l9 5 9-5V8" />
          <path d="M12 13v8" />
        </svg>
      )
    case 'call':
      return (
        <svg {...common}>
          <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.6a2 2 0 0 1-.5 2.1L8 10a16 16 0 0 0 6 6l1.6-1.2a2 2 0 0 1 2.1-.5c.8.3 1.7.5 2.6.6a2 2 0 0 1 1.7 2z" />
        </svg>
      )
    case 'channels':
      return (
        <svg {...common}>
          <path d="M5 7h14" />
          <path d="M5 12h14" />
          <path d="M5 17h14" />
          <path d="M8 4L6 20" />
          <path d="M18 4l-2 16" />
        </svg>
      )
    case 'dashboard':
      return (
        <svg {...common}>
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      )
    case 'display':
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="12" rx="2" />
          <path d="M8 20h8" />
          <path d="M12 16v4" />
        </svg>
      )
    case 'download':
      return (
        <svg {...common}>
          <path d="M12 3v12" />
          <path d="M7 10l5 5 5-5" />
          <path d="M5 21h14" />
        </svg>
      )
    case 'grid':
      return (
        <svg {...common}>
          <path d="M4 4h6v6H4z" />
          <path d="M14 4h6v6h-6z" />
          <path d="M4 14h6v6H4z" />
          <path d="M14 14h6v6h-6z" />
        </svg>
      )
    case 'history':
      return (
        <svg {...common}>
          <path d="M3 12a9 9 0 1 0 3-6.7" />
          <path d="M3 4v6h6" />
          <path d="M12 7v6l4 2" />
        </svg>
      )
    case 'inbox':
      return (
        <svg {...common}>
          <path d="M4 4h16v16H4z" />
          <path d="M4 13h5l2 3h2l2-3h5" />
        </svg>
      )
    case 'info':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 11v6" />
          <path d="M12 7h.01" />
        </svg>
      )
    case 'list':
      return (
        <svg {...common}>
          <path d="M8 6h13" />
          <path d="M8 12h13" />
          <path d="M8 18h13" />
          <path d="M3 6h.01" />
          <path d="M3 12h.01" />
          <path d="M3 18h.01" />
        </svg>
      )
    case 'mail':
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="M3 7l9 6 9-6" />
        </svg>
      )
    case 'money':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M15 8.5h-4a2 2 0 0 0 0 4h2a2 2 0 0 1 0 4H9" />
          <path d="M12 6.5v11" />
        </svg>
      )
    case 'news':
      return (
        <svg {...common}>
          <path d="M4 5h14a2 2 0 0 1 2 2v12H6a2 2 0 0 1-2-2z" />
          <path d="M8 9h8" />
          <path d="M8 13h8" />
          <path d="M8 17h5" />
        </svg>
      )
    case 'notes':
      return (
        <svg {...common}>
          <path d="M5 4h14v11l-5 5H5z" />
          <path d="M14 20v-5h5" />
          <path d="M8 9h8" />
          <path d="M8 13h5" />
        </svg>
      )
    case 'phone':
      return (
        <svg {...common}>
          <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.6a2 2 0 0 1-.5 2.1L8 10a16 16 0 0 0 6 6l1.6-1.2a2 2 0 0 1 2.1-.5c.8.3 1.7.5 2.6.6a2 2 0 0 1 1.7 2z" />
          <path d="M15 5a4 4 0 0 1 4 4" />
        </svg>
      )
    case 'portal':
      return (
        <svg {...common}>
          <path d="M4 5h16v14H4z" />
          <path d="M8 9h8" />
          <path d="M8 13h5" />
          <path d="M16 16l4-4-4-4" />
        </svg>
      )
    case 'preferences':
      return (
        <svg {...common}>
          <path d="M4 7h10" />
          <path d="M18 7h2" />
          <path d="M4 17h2" />
          <path d="M10 17h10" />
          <circle cx="16" cy="7" r="2" />
          <circle cx="8" cy="17" r="2" />
        </svg>
      )
    case 'search':
      return (
        <svg {...common}>
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" />
        </svg>
      )
    case 'settings':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 0 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9c.2.6.8 1 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
        </svg>
      )
    case 'shield':
      return (
        <svg {...common}>
          <path d="M12 3l8 4v5c0 5-3.4 8-8 9-4.6-1-8-4-8-9V7z" />
          <path d="M9 12l2 2 4-4" />
        </svg>
      )
    case 'tag':
      return (
        <svg {...common}>
          <path d="M20 13l-7 7L4 11V4h7z" />
          <path d="M8.5 8.5h.01" />
        </svg>
      )
    case 'template':
      return (
        <svg {...common}>
          <path d="M5 4h14v16H5z" />
          <path d="M8 8h8" />
          <path d="M8 12h8" />
          <path d="M8 16h5" />
        </svg>
      )
    case 'tool':
      return (
        <svg {...common}>
          <path d="M14.7 6.3a4 4 0 0 0-5 5L4 17l3 3 5.7-5.7a4 4 0 0 0 5-5l-2.9 2.9-3-3z" />
        </svg>
      )
    case 'version':
      return (
        <svg {...common}>
          <path d="M4 6h16" />
          <path d="M4 12h16" />
          <path d="M4 18h16" />
          <path d="M8 3v6" />
          <path d="M16 9v6" />
          <path d="M10 15v6" />
        </svg>
      )
    default:
      return null
  }
}
