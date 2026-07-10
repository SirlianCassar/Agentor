import type { AppIconName } from '../lib/iconTypes'
import type { Icon } from '@phosphor-icons/react/lib'
import { AppWindow } from '@phosphor-icons/react/AppWindow'
import { Archive } from '@phosphor-icons/react/Archive'
import { BookOpen } from '@phosphor-icons/react/BookOpen'
import { ClipboardText } from '@phosphor-icons/react/ClipboardText'
import { CopySimple } from '@phosphor-icons/react/CopySimple'
import { Crosshair } from '@phosphor-icons/react/Crosshair'
import { CurrencyDollar } from '@phosphor-icons/react/CurrencyDollar'
import { Desktop } from '@phosphor-icons/react/Desktop'
import { DotsSixVertical } from '@phosphor-icons/react/DotsSixVertical'
import { DownloadSimple } from '@phosphor-icons/react/DownloadSimple'
import { EnvelopeSimple } from '@phosphor-icons/react/EnvelopeSimple'
import { FileArrowDown } from '@phosphor-icons/react/FileArrowDown'
import { FileArrowUp } from '@phosphor-icons/react/FileArrowUp'
import { Files } from '@phosphor-icons/react/Files'
import { FloppyDisk } from '@phosphor-icons/react/FloppyDisk'
import { Folder } from '@phosphor-icons/react/Folder'
import { FolderOpen } from '@phosphor-icons/react/FolderOpen'
import { GearSix } from '@phosphor-icons/react/GearSix'
import { GitCommit } from '@phosphor-icons/react/GitCommit'
import { Info } from '@phosphor-icons/react/Info'
import { Link } from '@phosphor-icons/react/Link'
import { ListBullets } from '@phosphor-icons/react/ListBullets'
import { ListChecks } from '@phosphor-icons/react/ListChecks'
import { MagnifyingGlass } from '@phosphor-icons/react/MagnifyingGlass'
import { Monitor } from '@phosphor-icons/react/Monitor'
import { Newspaper } from '@phosphor-icons/react/Newspaper'
import { Note } from '@phosphor-icons/react/Note'
import { Package } from '@phosphor-icons/react/Package'
import { PencilSimple } from '@phosphor-icons/react/PencilSimple'
import { Phone } from '@phosphor-icons/react/Phone'
import { Plus } from '@phosphor-icons/react/Plus'
import { ShieldCheck } from '@phosphor-icons/react/ShieldCheck'
import { SlidersHorizontal } from '@phosphor-icons/react/SlidersHorizontal'
import { SquaresFour } from '@phosphor-icons/react/SquaresFour'
import { Stack } from '@phosphor-icons/react/Stack'
import { Tag } from '@phosphor-icons/react/Tag'
import { TerminalWindow } from '@phosphor-icons/react/TerminalWindow'
import { Trash } from '@phosphor-icons/react/Trash'
import { Tray } from '@phosphor-icons/react/Tray'
import { Warehouse } from '@phosphor-icons/react/Warehouse'
import { Wrench } from '@phosphor-icons/react/Wrench'
import { X } from '@phosphor-icons/react/X'

const icons: Record<AppIconName, Icon> = {
  add: Plus,
  archive: Archive,
  asciiWall: TerminalWindow,
  screenEmulator: Desktop,
  book: BookOpen,
  box: Package,
  call: Phone,
  channels: Stack,
  close: X,
  copy: CopySimple,
  dashboard: SquaresFour,
  delete: Trash,
  display: Monitor,
  download: DownloadSimple,
  edit: PencilSimple,
  exchange: DotsSixVertical,
  exportData: FileArrowUp,
  exportMail: EnvelopeSimple,
  folder: Folder,
  folderOpen: FolderOpen,
  grid: SquaresFour,
  hangar: Warehouse,
  history: Archive,
  inbox: Tray,
  info: Info,
  importData: FileArrowDown,
  link: Link,
  list: ListBullets,
  mail: EnvelopeSimple,
  maintenance: Wrench,
  money: CurrencyDollar,
  news: Newspaper,
  notes: Note,
  phone: Phone,
  portal: AppWindow,
  preferences: SlidersHorizontal,
  save: FloppyDisk,
  search: MagnifyingGlass,
  settings: GearSix,
  shield: ShieldCheck,
  systemReport: ClipboardText,
  tag: Tag,
  target: Crosshair,
  template: Files,
  tool: ListChecks,
  version: GitCommit,
}

export const UiIcon = ({ name, className }: { name: AppIconName; className?: string }) => {
  const IconComponent = icons[name]
  return (
    <IconComponent
      aria-hidden
      className={`ui-icon${className ? ` ${className}` : ''}`}
      data-icon={name}
      weight="fill"
      size={16}
    />
  )
}
