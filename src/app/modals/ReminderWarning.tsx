// Warning shown when RQT reminders have expired.
import type { Dispatch, SetStateAction } from 'react'
import type { RqtReminder } from '../../lib/types'

export interface ReminderWarningProps {
  expiredReminders: RqtReminder[]
  setExpiredReminders: Dispatch<SetStateAction<RqtReminder[] | null>>
}

export function ReminderWarning({
  expiredReminders,
  setExpiredReminders,
}: ReminderWarningProps) {
  return (
    <div className="modal-backdrop reminder-warning-backdrop">
      <div className="modal reminder-warning" role="alertdialog" aria-modal="true">
        <div className="reminder-warning__icon">⚠</div>
        <div className="reminder-warning__message">
          <span>Vérifier</span>
          <ul>{expiredReminders.map((reminder) => <li key={reminder.id}>{reminder.rqt}</li>)}</ul>
        </div>
        <button className="btn btn--primary btn--small reminder-warning__ok" type="button" onClick={() => setExpiredReminders(null)}>OK</button>
      </div>
    </div>
  )
}
