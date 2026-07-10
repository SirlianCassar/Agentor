/* Small presentational icon components shared across the app shell. */
import { UiIcon } from './UiIcon'
import type { AppIconName } from '../lib/iconTypes'

export const CloseIcon = () => <UiIcon name="close" className="close-icon" />
export const DeleteIcon = () => <UiIcon name="delete" className="action-icon" />
export const AddIcon = () => <UiIcon name="add" className="action-icon" />
export const MoveIcon = () => <UiIcon name="exchange" className="action-icon" />
export const CopyIcon = () => <UiIcon name="copy" className="action-icon" />

export const ButtonIcon = ({ name }: { name: AppIconName }) => (
  <span className="btn__icon" aria-hidden="true">
    <UiIcon name={name} className="action-icon" />
  </span>
)

export const ExportDataIcon = () => (
  <span className="btn__icon" aria-hidden="true">
    <UiIcon name="exportData" className="action-icon" />
  </span>
)

export const ImportDataIcon = () => (
  <span className="btn__icon" aria-hidden="true">
    <UiIcon name="importData" className="action-icon" />
  </span>
)

export const ExportEmailsIcon = () => (
  <span className="btn__icon" aria-hidden="true">
    <UiIcon name="exportMail" className="action-icon" />
  </span>
)
