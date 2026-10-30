// New RQT reminder.
import type { Dispatch, SetStateAction } from 'react'
import { CloseIcon } from '../../components/AppIcons'
import { reminderDurationOptions } from '../appShared'

export interface ReminderModalProps {
  addRqtReminder: () => void
  editingReminderExpired: boolean
  editingReminderId: string | null
  reminderDurationDraft: 1 | 0.25 | 24 | 48
  reminderRqtDraft: string
  setEditingReminderId: Dispatch<SetStateAction<string | null>>
  setReminderDurationDraft: Dispatch<SetStateAction<1 | 0.25 | 24 | 48>>
  setReminderModalOpen: Dispatch<SetStateAction<boolean>>
  setReminderRqtDraft: Dispatch<SetStateAction<string>>
}

export function ReminderModal({
  addRqtReminder,
  editingReminderExpired,
  editingReminderId,
  reminderDurationDraft,
  reminderRqtDraft,
  setEditingReminderId,
  setReminderDurationDraft,
  setReminderModalOpen,
  setReminderRqtDraft,
}: ReminderModalProps) {
  return (
    <div className="modal-backdrop" onMouseDown={() => {
      setReminderModalOpen(false)
      setEditingReminderId(null)
    }}>
      <div className="modal reminder-modal" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal__header"><div className="brand__title">{editingReminderId ? 'Modifier le rappel RQT' : 'Nouveau rappel RQT'}</div><button title="Fermer" className="close-modal" type="button" onClick={() => { setReminderModalOpen(false); setEditingReminderId(null) }}><CloseIcon /></button></div>
        <div className="reminder-modal__body">
          <label className="workflow-step-label" htmlFor="reminder-rqt">Numéro de RQT</label>
          <input id="reminder-rqt" className="input" autoFocus value={reminderRqtDraft} onChange={(event) => setReminderRqtDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') addRqtReminder() }} placeholder="Ex. 123456" />
          <div className="workflow-step-label">{editingReminderId ? 'Nouveau temps restant' : 'Durée'}</div>
          <div className="reminder-duration-options">{reminderDurationOptions.map((hours) => <button type="button" className={`btn ${reminderDurationDraft === hours ? 'btn--primary' : 'btn--ghost'}`} key={hours} onClick={() => setReminderDurationDraft(hours)}>{hours === 0.25 ? '15 min' : `${hours} h`}</button>)}</div>
          <button className="btn btn--primary" type="button" onClick={addRqtReminder}>{editingReminderId ? (editingReminderExpired ? 'Relancer le chrono' : 'Modifier le délai') : 'Créer le rappel'}</button>
        </div>
      </div>
    </div>
  )
}
