/* Small presentational icon components shared across the app shell. */
import { UiIcon } from './UiIcon'
import type { AppIconName } from '../lib/iconTypes'

export const CloseIcon = () => <UiIcon name="close" className="close-icon" />
export const DeleteIcon = () => <UiIcon name="delete" className="action-icon" />
export const AddIcon = () => <UiIcon name="add" className="action-icon" />
export const MoveIcon = () => <UiIcon name="exchange" className="action-icon" />

export const ButtonIcon = ({ name }: { name: AppIconName }) => (
  <span className="btn__icon" aria-hidden="true">
    <UiIcon name={name} className="action-icon" />
  </span>
)

export const ExportDataIcon = () => (
  <span className="btn__icon" aria-hidden="true">
    <svg className="action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 21V9" />
      <path d="M17 14l-5-5-5 5" />
      <path d="M5 3h14" />
    </svg>
  </span>
)

export const ImportDataIcon = () => (
  <span className="btn__icon" aria-hidden="true">
    <svg className="action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 3v12" />
      <path d="M7 10l5 5 5-5" />
      <path d="M5 21h14" />
    </svg>
  </span>
)

export const ExportEmailsIcon = () => (
  <span className="btn__icon" aria-hidden="true">
    <svg className="action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M8 6h8" />
      <path d="M8 12h8" />
      <path d="M8 18h5" />
      <path d="M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
    </svg>
  </span>
)
