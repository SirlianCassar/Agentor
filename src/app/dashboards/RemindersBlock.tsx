// RQT reminders with their countdown.
import type { AppSettings, RqtReminder } from '../../lib/types'

export interface RemindersBlockProps {
  formatReminderCountdown: (reminder: RqtReminder) => string
  openNewRqtReminder: () => void
  openRqtReminderEditor: (reminder: RqtReminder) => void
  reminderNow: number
  rqtReminders: RqtReminder[]
  updateSettings: (patch: Partial<AppSettings>) => void
}

export function RemindersBlock({
  formatReminderCountdown,
  openNewRqtReminder,
  openRqtReminderEditor,
  reminderNow,
  rqtReminders,
  updateSettings,
}: RemindersBlockProps) {
  return (
    <div className="dashboard-news-notes__panel dashboard-news-notes__panel--notes dashboard-reminders">
      <div className="dashboard-reminders__head">
        <span>Rappels RQT</span>
        <div className="dashboard-reminders__head-actions">
          <button className="btn btn--ghost btn--small" type="button" onClick={openNewRqtReminder}>Ajouter</button>
        </div>
      </div>
      <div className="dashboard-reminders__list">
        {rqtReminders.length ? [...rqtReminders].sort((a, b) => a.dueAt.localeCompare(b.dueAt)).map((reminder) => {
          const expired = new Date(reminder.dueAt).getTime() <= reminderNow
          return <div
            className={`dashboard-reminder${expired ? ' is-expired' : ''}`}
            key={reminder.id}
            role="button"
            tabIndex={0}
            title={expired ? 'Cliquer pour relancer le chrono' : 'Cliquer pour modifier le temps restant'}
            onClick={() => openRqtReminderEditor(reminder)}
            onKeyDown={(event) => {
              if (event.key !== 'Enter' && event.key !== ' ') return
              event.preventDefault()
              openRqtReminderEditor(reminder)
            }}
          >
            <span className="dashboard-reminder__identity">
              <strong>RQT {reminder.rqt}</strong>
              <small>{expired ? 'Cliquer pour relancer' : 'Cliquer pour modifier'}</small>
            </span>
            <span className="dashboard-reminder__countdown">{formatReminderCountdown(reminder)}</span>
            <button
              className="dashboard-reminder__delete"
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                updateSettings({
                  rqtReminders: rqtReminders.filter((item) => item.id !== reminder.id),
                })
              }}
            >
              Supprimer
            </button>
          </div>
        }) : <div className="dashboard-empty">Aucun rappel en attente.</div>}
      </div>
    </div>
  )
}
